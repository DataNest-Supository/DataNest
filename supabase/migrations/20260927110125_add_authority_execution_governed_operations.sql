begin;

create or replace function private.execution_operation_rank(target_operation text)
returns integer
language sql
immutable
set search_path=public,private
as $$
  select case target_operation
    when 'observe' then 0
    when 'prepare' then 1
    when 'write' then 2
    when 'execute' then 3
    when 'promote' then 4
    when 'destruct' then 5
    else 99
  end;
$$;

create or replace function private.execution_autonomy_rank(target_level text)
returns integer
language sql
immutable
set search_path=public,private
as $$
  select case target_level
    when 'A0' then 0
    when 'A1' then 0
    when 'A2' then 1
    when 'A3' then 4
    when 'A4' then 5
    else -1
  end;
$$;

create or replace function private.execution_sponsor_is_active(
  target_project uuid,
  target_user uuid
) returns boolean
language sql
stable
security definer
set search_path=public,private,auth
as $$
  select exists(
    select 1
    from public.project_members pm
    where pm.project_id=target_project
      and pm.user_id=target_user
      and pm.status='active'
  );
$$;

create or replace function private.execution_validate_job_capability(
  target_project uuid,
  target_job uuid,
  target_capability uuid default null
) returns void
language plpgsql
stable
security definer
set search_path=public,private
as $$
begin
  if not exists(
    select 1 from public.jobs j
    where j.id=target_job and j.project_id=target_project
  ) then
    raise exception 'Job project mismatch.';
  end if;

  if target_capability is not null and not exists(
    select 1 from public.capabilities c
    where c.id=target_capability and c.project_id=target_project
  ) then
    raise exception 'Capability project mismatch.';
  end if;
end;
$$;

create or replace function private.execution_breaker_category(
  target_operation text,
  target_purpose text
) returns text
language sql
immutable
set search_path=public,private
as $$
  select case
    when lower(coalesce(target_purpose,'')) in ('deployment','production_promotion','release_promotion')
      or target_operation='promote' then 'deployment'
    when lower(coalesce(target_purpose,'')) in ('external_communication','message_send','email_send','notification_send')
      then 'external_communication'
    when target_operation='write' then 'autonomous_write'
    when target_operation in ('execute','destruct') then 'resource_execution'
    else null
  end;
$$;

create or replace function private.record_execution_authority_event(
  target_project uuid,
  target_job uuid,
  target_event_type text,
  target_actor text,
  target_payload jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path=public,private
as $$
begin
  insert into public.events(project_id,job_id,event_type,actor,payload)
  values(target_project,target_job,target_event_type,target_actor,coalesce(target_payload,'{}'::jsonb));
end;
$$;

create or replace function private.execution_validate_envelope_definition(
  target_autonomy_level text,
  target_operations text[],
  target_resource_ceiling jsonb,
  target_reversibility text,
  target_evidence_requirements jsonb
) returns void
language plpgsql
immutable
set search_path=public,private
as $$
declare
  op text;
  max_rank integer:=private.execution_autonomy_rank(target_autonomy_level);
  max_ops integer;
  max_duration integer;
  max_concurrency integer;
begin
  if max_rank<0 then raise exception 'Unsupported autonomy level.'; end if;
  if coalesce(array_length(target_operations,1),0)=0 then raise exception 'At least one permitted operation is required.'; end if;

  foreach op in array target_operations loop
    if private.execution_operation_rank(op)>max_rank then
      raise exception 'Operation % exceeds autonomy level %.',op,target_autonomy_level;
    end if;
  end loop;

  if target_autonomy_level='A3' then
    if 'destruct'=any(target_operations) then raise exception 'A3 cannot authorize destructive execution.'; end if;
    if target_reversibility='irreversible' then raise exception 'A3 execution must remain reversible or conditionally reversible.'; end if;
    max_ops:=nullif(target_resource_ceiling->>'max_operations','')::integer;
    max_duration:=nullif(target_resource_ceiling->>'max_duration_seconds','')::integer;
    max_concurrency:=nullif(target_resource_ceiling->>'max_concurrency','')::integer;
    if coalesce(max_ops,0)<=0 or coalesce(max_duration,0)<=0 or coalesce(max_concurrency,0)<=0 then
      raise exception 'A3 requires positive max_operations, max_duration_seconds, and max_concurrency ceilings.';
    end if;
  end if;

  if target_autonomy_level='A4' and coalesce(target_evidence_requirements,'{}'::jsonb)='{}'::jsonb then
    raise exception 'A4 requires explicit evidence requirements.';
  end if;
end;
$$;

create or replace function public.propose_authority_envelope_v1(
  target_project uuid,
  target_job uuid,
  target_actor_type text,
  target_actor_key text,
  target_sponsor_user uuid,
  target_purpose text,
  target_autonomy_level text,
  target_permitted_capabilities text[],
  target_permitted_operations text[],
  target_expires_at timestamptz,
  target_actor_user uuid default null,
  target_product uuid default null,
  target_data_scope jsonb default '{}'::jsonb,
  target_resource_ceiling jsonb default '{}'::jsonb,
  target_reversibility text default 'reversible',
  target_evidence_requirements jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  new_id uuid;
  trace text:='DN-AUTH-'||replace(gen_random_uuid()::text,'-','');
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  if not private.has_project_role(target_project,array['owner','admin','operator']) then
    raise insufficient_privilege using message='Owner, admin, or operator access is required.';
  end if;

  perform private.execution_validate_job_capability(target_project,target_job,null);

  if target_product is not null and not exists(
    select 1 from public.products p where p.id=target_product and p.project_id=target_project
  ) then
    raise exception 'Product project mismatch.';
  end if;

  if not private.execution_sponsor_is_active(target_project,target_sponsor_user) then
    raise exception 'Authority sponsor must be an active project member.';
  end if;

  if target_actor_type='human' then
    if target_actor_user is null then raise exception 'Human actor requires actor_user_id.'; end if;
    if not private.execution_sponsor_is_active(target_project,target_actor_user) then
      raise exception 'Human actor must be an active project member.';
    end if;
  end if;

  if target_expires_at<=now() then raise exception 'Authority Envelope must expire in the future.'; end if;
  if nullif(btrim(coalesce(target_actor_key,'')),'') is null then raise exception 'Actor key is required.'; end if;
  if nullif(btrim(coalesce(target_purpose,'')),'') is null then raise exception 'Purpose is required.'; end if;
  if coalesce(array_length(target_permitted_capabilities,1),0)=0 then raise exception 'At least one capability is required.'; end if;

  perform private.execution_validate_envelope_definition(
    target_autonomy_level,
    coalesce(target_permitted_operations,'{}'::text[]),
    coalesce(target_resource_ceiling,'{}'::jsonb),
    target_reversibility,
    coalesce(target_evidence_requirements,'{}'::jsonb)
  );

  insert into public.authority_envelopes(
    project_id,product_id,job_id,actor_type,actor_user_id,actor_key,sponsor_user_id,purpose,
    autonomy_level,permitted_capabilities,permitted_operations,data_scope,resource_ceiling,
    reversibility,evidence_requirements,approval_state,trace_key,expires_at,created_by
  ) values(
    target_project,target_product,target_job,target_actor_type,target_actor_user,btrim(target_actor_key),
    target_sponsor_user,btrim(target_purpose),target_autonomy_level,
    coalesce(target_permitted_capabilities,'{}'::text[]),coalesce(target_permitted_operations,'{}'::text[]),
    coalesce(target_data_scope,'{}'::jsonb),coalesce(target_resource_ceiling,'{}'::jsonb),
    target_reversibility,coalesce(target_evidence_requirements,'{}'::jsonb),'draft',trace,target_expires_at,caller
  ) returning id into new_id;

  perform private.record_execution_authority_event(
    target_project,target_job,'AUTHORITY_ENVELOPE_PROPOSED',caller::text,
    jsonb_build_object('authority_envelope_id',new_id,'trace_key',trace,'autonomy_level',target_autonomy_level,'actor_key',btrim(target_actor_key))
  );
  return new_id;
end;
$$;

create or replace function public.approve_authority_envelope_v1(
  target_envelope uuid
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  envelope public.authority_envelopes%rowtype;
  allowed boolean:=false;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  select * into envelope from public.authority_envelopes where id=target_envelope for update;
  if not found or envelope.approval_state<>'draft' then raise exception 'Draft Authority Envelope not found.'; end if;
  if envelope.expires_at<=now() then raise exception 'Authority Envelope is already expired.'; end if;

  allowed:=case
    when envelope.autonomy_level in ('A0','A1','A2')
      then private.has_project_role(envelope.project_id,array['owner','admin','operator'])
    when envelope.autonomy_level='A3'
      then private.has_project_role(envelope.project_id,array['owner','admin'])
    when envelope.autonomy_level='A4'
      then private.has_project_role(envelope.project_id,array['owner'])
    else false
  end;

  if not allowed then raise insufficient_privilege using message='Current role cannot approve this autonomy level.'; end if;
  if envelope.autonomy_level in ('A3','A4') and caller=envelope.created_by then
    raise exception 'A3/A4 Authority Envelope requires independent approval from its creator.';
  end if;
  if envelope.autonomy_level='A4' and envelope.evidence_requirements='{}'::jsonb then
    raise exception 'A4 Authority Envelope requires explicit evidence requirements.';
  end if;
  if not private.execution_sponsor_is_active(envelope.project_id,envelope.sponsor_user_id) then
    raise exception 'Authority sponsor is no longer an active project member.';
  end if;

  update public.authority_envelopes
  set approval_state='approved',approved_by=caller,approved_at=now(),effective_from=coalesce(effective_from,now())
  where id=envelope.id;

  perform private.record_execution_authority_event(
    envelope.project_id,envelope.job_id,'AUTHORITY_ENVELOPE_APPROVED',caller::text,
    jsonb_build_object('authority_envelope_id',envelope.id,'trace_key',envelope.trace_key,'autonomy_level',envelope.autonomy_level)
  );
  return envelope.id;
end;
$$;

create or replace function public.reject_authority_envelope_v1(
  target_envelope uuid,
  target_reason text
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  envelope public.authority_envelopes%rowtype;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  select * into envelope from public.authority_envelopes where id=target_envelope for update;
  if not found or envelope.approval_state<>'draft' then raise exception 'Draft Authority Envelope not found.'; end if;
  if envelope.autonomy_level='A4' then
    if not private.has_project_role(envelope.project_id,array['owner']) then
      raise insufficient_privilege using message='Owner access is required for A4 review.';
    end if;
  elsif not private.has_project_role(envelope.project_id,array['owner','admin']) then
    raise insufficient_privilege using message='Owner or admin access is required.';
  end if;
  if nullif(btrim(coalesce(target_reason,'')),'') is null then raise exception 'Rejection reason is required.'; end if;

  update public.authority_envelopes
  set approval_state='rejected',revoked_by=caller,revoked_at=now(),revocation_reason=btrim(target_reason)
  where id=envelope.id;

  perform private.record_execution_authority_event(
    envelope.project_id,envelope.job_id,'AUTHORITY_ENVELOPE_REJECTED',caller::text,
    jsonb_build_object('authority_envelope_id',envelope.id,'reason',btrim(target_reason))
  );
  return envelope.id;
end;
$$;

create or replace function public.revoke_authority_envelope_v1(
  target_envelope uuid,
  target_reason text
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  envelope public.authority_envelopes%rowtype;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  select * into envelope from public.authority_envelopes where id=target_envelope for update;
  if not found or envelope.approval_state<>'approved' then raise exception 'Approved Authority Envelope not found.'; end if;
  if not private.has_project_role(envelope.project_id,array['owner','admin']) then
    raise insufficient_privilege using message='Owner or admin access is required.';
  end if;
  if nullif(btrim(coalesce(target_reason,'')),'') is null then raise exception 'Revocation reason is required.'; end if;

  update public.authority_envelopes
  set approval_state='revoked',revoked_by=caller,revoked_at=now(),revocation_reason=btrim(target_reason)
  where id=envelope.id;

  update public.capability_leases
  set status='revoked',released_at=coalesce(released_at,now()),release_reason='Authority Envelope revoked: '||btrim(target_reason)
  where authority_envelope_id=envelope.id and status='active';

  perform private.record_execution_authority_event(
    envelope.project_id,envelope.job_id,'AUTHORITY_ENVELOPE_REVOKED',caller::text,
    jsonb_build_object('authority_envelope_id',envelope.id,'reason',btrim(target_reason))
  );
  return envelope.id;
end;
$$;

create or replace function public.issue_capability_lease_v1(
  target_envelope uuid,
  target_capability uuid,
  target_allowed_operations text[],
  target_max_operations integer,
  target_expires_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  envelope public.authority_envelopes%rowtype;
  capability public.capabilities%rowtype;
  new_id uuid;
  trace text:='DN-LEASE-'||replace(gen_random_uuid()::text,'-','');
  op text;
  breaker_category text;
  envelope_max_operations integer;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  select * into envelope from public.authority_envelopes where id=target_envelope for update;
  if not found or envelope.approval_state<>'approved' or envelope.revoked_at is not null or envelope.expires_at<=now() then
    raise exception 'Current approved Authority Envelope not found.';
  end if;
  if envelope.autonomy_level='A4' then raise exception 'A4 cannot issue a generic automated Capability Lease in Phase D v1.'; end if;

  if envelope.autonomy_level='A3' then
    if not private.has_project_role(envelope.project_id,array['owner','admin']) then
      raise insufficient_privilege using message='Owner or admin access is required to issue an A3 lease.';
    end if;
  elsif not private.has_project_role(envelope.project_id,array['owner','admin','operator']) then
    raise insufficient_privilege using message='Owner, admin, or operator access is required.';
  end if;

  if not private.execution_sponsor_is_active(envelope.project_id,envelope.sponsor_user_id) then
    raise exception 'Authority sponsor is no longer an active project member.';
  end if;

  select * into capability
  from public.capabilities c
  where c.id=target_capability and c.project_id=envelope.project_id
  for update;
  if not found then raise exception 'Capability project mismatch.'; end if;

  if not (capability.capability=any(envelope.permitted_capabilities)) then
    raise exception 'Capability is outside Authority Envelope scope.';
  end if;
  if not capability.enabled or capability.state in ('OFFLINE','DISABLED','EXHAUSTED') then
    raise exception 'Capability is not eligible for lease issuance.';
  end if;

  if coalesce(array_length(target_allowed_operations,1),0)=0 then raise exception 'Lease requires at least one operation.'; end if;
  foreach op in array target_allowed_operations loop
    if not (op=any(envelope.permitted_operations)) then raise exception 'Lease operation % exceeds Authority Envelope.',op; end if;
    if op='destruct' then raise exception 'Generic automated destructive lease is prohibited.'; end if;
    if private.execution_operation_rank(op)>private.execution_autonomy_rank(envelope.autonomy_level) then
      raise exception 'Lease operation % exceeds autonomy level %.',op,envelope.autonomy_level;
    end if;
    breaker_category:=private.execution_breaker_category(op,envelope.purpose);
    if breaker_category is not null and not exists(
      select 1 from public.execution_circuit_breakers b
      where b.project_id=envelope.project_id and b.category=breaker_category and b.state='open'
    ) then
      raise exception 'Execution circuit breaker % is not explicitly open.',breaker_category;
    end if;
  end loop;

  if target_max_operations<=0 then raise exception 'Lease max operations must be positive.'; end if;
  envelope_max_operations:=nullif(envelope.resource_ceiling->>'max_operations','')::integer;
  if envelope_max_operations is not null and target_max_operations>envelope_max_operations then
    raise exception 'Lease max operations exceeds Authority Envelope ceiling.';
  end if;
  if target_expires_at<=now() or target_expires_at>envelope.expires_at then
    raise exception 'Lease expiry must be future and no later than Authority Envelope expiry.';
  end if;

  insert into public.capability_leases(
    project_id,authority_envelope_id,job_id,capability_id,actor_key,allowed_operations,
    data_scope,resource_ceiling,approval_level,trace_key,status,max_operations,expires_at,issued_by
  ) values(
    envelope.project_id,envelope.id,envelope.job_id,capability.id,envelope.actor_key,target_allowed_operations,
    envelope.data_scope,envelope.resource_ceiling,envelope.autonomy_level,trace,'active',
    target_max_operations,target_expires_at,caller
  ) returning id into new_id;

  perform private.record_execution_authority_event(
    envelope.project_id,envelope.job_id,'CAPABILITY_LEASE_ISSUED',caller::text,
    jsonb_build_object('capability_lease_id',new_id,'authority_envelope_id',envelope.id,'capability_id',capability.id,'trace_key',trace,'max_operations',target_max_operations)
  );
  return new_id;
end;
$$;

create or replace function public.release_capability_lease_v1(
  target_lease uuid,
  target_reason text
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  lease public.capability_leases%rowtype;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  select * into lease from public.capability_leases where id=target_lease for update;
  if not found or lease.status<>'active' then raise exception 'Active Capability Lease not found.'; end if;
  if not private.has_project_role(lease.project_id,array['owner','admin','operator']) then
    raise insufficient_privilege using message='Owner, admin, or operator access is required.';
  end if;
  if nullif(btrim(coalesce(target_reason,'')),'') is null then raise exception 'Release reason is required.'; end if;

  update public.capability_leases
  set status='released',released_at=now(),release_reason=btrim(target_reason)
  where id=lease.id;

  perform private.record_execution_authority_event(
    lease.project_id,lease.job_id,'CAPABILITY_LEASE_RELEASED',caller::text,
    jsonb_build_object('capability_lease_id',lease.id,'reason',btrim(target_reason))
  );
  return lease.id;
end;
$$;

create or replace function public.set_execution_circuit_breaker_v1(
  target_project uuid,
  target_category text,
  target_state text,
  target_reason text
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  breaker_id uuid;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  if not private.has_project_role(target_project,array['owner','admin']) then
    raise insufficient_privilege using message='Owner or admin access is required.';
  end if;
  if target_category not in ('autonomous_write','deployment','external_communication','resource_execution') then
    raise exception 'Unsupported execution circuit breaker category.';
  end if;
  if target_state not in ('open','halted') then raise exception 'Unsupported execution circuit breaker state.'; end if;
  if nullif(btrim(coalesce(target_reason,'')),'') is null then raise exception 'Circuit breaker reason is required.'; end if;

  insert into public.execution_circuit_breakers(project_id,category,state,reason,updated_by)
  values(target_project,target_category,target_state,btrim(target_reason),caller)
  on conflict(project_id,category) do update
  set state=excluded.state,reason=excluded.reason,updated_by=excluded.updated_by,updated_at=now()
  returning id into breaker_id;

  perform private.record_execution_authority_event(
    target_project,null,'EXECUTION_CIRCUIT_BREAKER_CHANGED',caller::text,
    jsonb_build_object('breaker_id',breaker_id,'category',target_category,'state',target_state,'reason',btrim(target_reason))
  );
  return breaker_id;
end;
$$;

create or replace function public.get_execution_authority_workspace_v1(
  target_project uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  caller_role text;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  if not private.has_project_access(target_project) then
    raise insufficient_privilege using message='Project access is required.';
  end if;

  select pm.role into caller_role
  from public.project_members pm
  where pm.project_id=target_project and pm.user_id=caller and pm.status='active'
  limit 1;

  return jsonb_build_object(
    'envelopes',coalesce((
      select jsonb_agg(to_jsonb(e) order by e.created_at desc)
      from (
        select * from public.authority_envelopes
        where project_id=target_project
        order by created_at desc
        limit 50
      ) e
    ),'[]'::jsonb),
    'leases',coalesce((
      select jsonb_agg(
        to_jsonb(l)||jsonb_build_object('capability_name',c.capability,'capability_state',c.state,'capability_enabled',c.enabled)
        order by l.issued_at desc
      )
      from (
        select * from public.capability_leases
        where project_id=target_project
        order by issued_at desc
        limit 50
      ) l
      join public.capabilities c on c.id=l.capability_id
    ),'[]'::jsonb),
    'breakers',coalesce((
      select jsonb_agg(to_jsonb(b) order by b.category)
      from public.execution_circuit_breakers b
      where b.project_id=target_project
    ),'[]'::jsonb),
    'capabilities',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,'account_key',c.account_key,'connector_kind',c.connector_kind,'capability',c.capability,
        'state',c.state,'enabled',c.enabled,'running',c.running,'concurrency_limit',c.concurrency_limit
      ) order by c.account_key,c.capability)
      from public.capabilities c
      where c.project_id=target_project
    ),'[]'::jsonb),
    'member_role',caller_role,
    'can_propose',caller_role in ('owner','admin','operator'),
    'can_approve_a3',caller_role in ('owner','admin'),
    'can_approve_a4',caller_role='owner',
    'can_manage_breakers',caller_role in ('owner','admin'),
    'boundaries',jsonb_build_object(
      'capacity_reservation_is_authority',false,
      'human_job_status_requires_lease',false,
      'generic_a4_automation_enabled',false,
      'phase_c_policy_remains_independent',true
    )
  );
end;
$$;

create or replace function public.service_authorize_execution_v1(
  target_project uuid,
  target_job uuid,
  target_actor_key text,
  target_capability uuid,
  target_requested_operation text,
  target_purpose text,
  target_trace_id text,
  target_authority_envelope uuid,
  target_capability_lease uuid
) returns jsonb
language plpgsql
security definer
set search_path=public,private
as $$
declare
  prior public.execution_authority_decisions%rowtype;
  job public.jobs%rowtype;
  capability public.capabilities%rowtype;
  envelope public.authority_envelopes%rowtype;
  lease public.capability_leases%rowtype;
  breaker_category text;
  breaker public.execution_circuit_breakers%rowtype;
  outcome text:='allow';
  reason_code text:='authority_allow';
  decision_id uuid;
  used_before integer:=0;
  used_after integer:=0;
  lease_status_after text;
begin
  if nullif(btrim(coalesce(target_trace_id,'')),'') is null then raise exception 'Execution trace id is required.'; end if;
  if target_requested_operation not in ('observe','prepare','write','execute','promote','destruct') then
    raise exception 'Unsupported execution operation.';
  end if;

  select * into prior
  from public.execution_authority_decisions d
  where d.project_id=target_project
    and d.trace_id=target_trace_id
    and d.requested_operation=target_requested_operation
  limit 1;

  if found then
    return jsonb_build_object(
      'decision_id',prior.id,'outcome',prior.outcome,'reason_code',prior.reason_code,
      'authority_envelope_id',prior.authority_envelope_id,'capability_lease_id',prior.capability_lease_id,
      'autonomy_level',prior.autonomy_level,'trace_id',prior.trace_id,'idempotent_replay',true
    );
  end if;

  select * into job from public.jobs where id=target_job;
  if not found then raise exception 'Job not found.'; end if;
  select * into capability from public.capabilities where id=target_capability;
  if not found then raise exception 'Capability not found.'; end if;

  select * into lease from public.capability_leases where id=target_capability_lease for update;
  if not found then
    outcome:='deny';reason_code:='capability_lease_missing';
  end if;

  if outcome='allow' then
    select * into prior
    from public.execution_authority_decisions d
    where d.project_id=target_project
      and d.trace_id=target_trace_id
      and d.requested_operation=target_requested_operation
    limit 1;
    if found then
      return jsonb_build_object(
        'decision_id',prior.id,'outcome',prior.outcome,'reason_code',prior.reason_code,
        'authority_envelope_id',prior.authority_envelope_id,'capability_lease_id',prior.capability_lease_id,
        'autonomy_level',prior.autonomy_level,'trace_id',prior.trace_id,'idempotent_replay',true
      );
    end if;
  end if;

  if outcome='allow' then
    select * into envelope from public.authority_envelopes where id=target_authority_envelope;
    if not found then outcome:='deny';reason_code:='authority_envelope_missing'; end if;
  end if;

  if job.project_id<>target_project then outcome:='deny';reason_code:='job_project_mismatch'; end if;
  if capability.project_id<>target_project then outcome:='deny';reason_code:='capability_project_mismatch'; end if;

  if outcome='allow' and (
    lease.project_id<>target_project or lease.job_id<>target_job or lease.capability_id<>target_capability
    or lease.authority_envelope_id<>target_authority_envelope
  ) then
    outcome:='deny';reason_code:='capability_lease_scope_mismatch';
  end if;

  if outcome='allow' and (
    envelope.project_id<>target_project or envelope.job_id<>target_job
  ) then
    outcome:='deny';reason_code:='authority_envelope_scope_mismatch';
  end if;

  if outcome='allow' and (envelope.actor_key<>target_actor_key or lease.actor_key<>target_actor_key) then
    outcome:='deny';reason_code:='actor_scope_mismatch';
  end if;

  if outcome='allow' and not private.execution_sponsor_is_active(target_project,envelope.sponsor_user_id) then
    outcome:='deny';reason_code:='sponsor_inactive';
  end if;

  if outcome='allow' and (envelope.approval_state<>'approved' or envelope.revoked_at is not null or envelope.expires_at<=now()) then
    outcome:='deny';reason_code:='authority_envelope_inactive';
  end if;

  if outcome='allow' and lease.status<>'active' then outcome:='deny';reason_code:='capability_lease_inactive'; end if;
  if outcome='allow' and lease.expires_at<=now() then outcome:='deny';reason_code:='capability_lease_expired'; end if;
  if outcome='allow' and lease.used_operations>=lease.max_operations then outcome:='deny';reason_code:='capability_lease_exhausted'; end if;

  if outcome='allow' and not (target_requested_operation=any(envelope.permitted_operations)) then
    outcome:='deny';reason_code:='operation_outside_envelope';
  end if;
  if outcome='allow' and not (target_requested_operation=any(lease.allowed_operations)) then
    outcome:='deny';reason_code:='operation_outside_lease';
  end if;
  if outcome='allow' and not (capability.capability=any(envelope.permitted_capabilities)) then
    outcome:='deny';reason_code:='capability_outside_envelope';
  end if;

  if outcome='allow' and envelope.autonomy_level='A4' then
    outcome:='deny';reason_code:='a4_human_gate_required';
  end if;
  if outcome='allow' and target_requested_operation='destruct' then
    outcome:='deny';reason_code:='generic_destructive_automation_prohibited';
  end if;
  if outcome='allow' and private.execution_operation_rank(target_requested_operation)>private.execution_autonomy_rank(envelope.autonomy_level) then
    outcome:='deny';reason_code:='autonomy_level_insufficient';
  end if;

  breaker_category:=private.execution_breaker_category(target_requested_operation,target_purpose);
  if outcome='allow' and breaker_category is not null then
    select * into breaker
    from public.execution_circuit_breakers b
    where b.project_id=target_project and b.category=breaker_category;

    if not found then
      outcome:='review_required';reason_code:='circuit_breaker_unconfigured';
    elsif breaker.state='halted' then
      outcome:='deny';reason_code:='circuit_breaker_halted';
    end if;
  end if;

  if outcome='allow' and not capability.enabled then outcome:='deny';reason_code:='capability_disabled'; end if;
  if outcome='allow' and capability.state in ('OFFLINE','DISABLED','EXHAUSTED') then
    outcome:='deny';reason_code:='capability_unavailable';
  end if;
  if outcome='allow' and capability.state in ('UNKNOWN','COOLDOWN') then
    outcome:='review_required';reason_code:='capability_health_unresolved';
  end if;
  if outcome='allow' and capability.running>=capability.concurrency_limit then
    outcome:='deny';reason_code:='capability_concurrency_exhausted';
  end if;

  used_before:=coalesce(lease.used_operations,0);
  used_after:=used_before;

  if outcome='allow' then
    used_after:=used_before+1;
  end if;

  insert into public.execution_authority_decisions(
    project_id,job_id,actor_key,sponsor_user_id,authority_envelope_id,capability_lease_id,capability_id,
    requested_operation,purpose,autonomy_level,outcome,reason_code,breaker_snapshot,capability_state_snapshot,
    resource_usage_snapshot,trace_id
  ) values(
    target_project,target_job,target_actor_key,envelope.sponsor_user_id,
    case when envelope.id=target_authority_envelope then envelope.id else null end,
    case when lease.id=target_capability_lease then lease.id else null end,
    target_capability,target_requested_operation,btrim(target_purpose),envelope.autonomy_level,outcome,reason_code,
    case when breaker_category is null then '{}'::jsonb
         else jsonb_build_object('category',breaker_category,'state',breaker.state) end,
    jsonb_build_object('state',capability.state,'enabled',capability.enabled,'running',capability.running,'concurrency_limit',capability.concurrency_limit),
    jsonb_build_object('used_operations_before',used_before,'used_operations_after',used_after,'max_operations',lease.max_operations,'lease_expires_at',lease.expires_at),
    target_trace_id
  )
  on conflict(project_id,trace_id,requested_operation) do nothing
  returning id into decision_id;

  if decision_id is null then
    select * into prior
    from public.execution_authority_decisions d
    where d.project_id=target_project and d.trace_id=target_trace_id and d.requested_operation=target_requested_operation;
    return jsonb_build_object(
      'decision_id',prior.id,'outcome',prior.outcome,'reason_code',prior.reason_code,
      'authority_envelope_id',prior.authority_envelope_id,'capability_lease_id',prior.capability_lease_id,
      'autonomy_level',prior.autonomy_level,'trace_id',prior.trace_id,'idempotent_replay',true
    );
  end if;

  if outcome='allow' then
    lease_status_after:=case when used_after>=lease.max_operations then 'exhausted' else 'active' end;
    update public.capability_leases
    set used_operations=used_after,last_used_at=now(),status=lease_status_after
    where id=lease.id;
  else
    lease_status_after:=lease.status;
  end if;

  perform private.record_execution_authority_event(
    target_project,target_job,'EXECUTION_AUTHORITY_EVALUATED',target_actor_key,
    jsonb_build_object(
      'decision_id',decision_id,'trace_id',target_trace_id,'outcome',outcome,'reason_code',reason_code,
      'authority_envelope_id',envelope.id,'capability_lease_id',lease.id,'capability_id',target_capability,
      'operation',target_requested_operation,'purpose',target_purpose,'autonomy_level',envelope.autonomy_level,
      'used_operations_after',used_after,'lease_status_after',lease_status_after
    )
  );

  return jsonb_build_object(
    'decision_id',decision_id,'outcome',outcome,'reason_code',reason_code,
    'authority_envelope_id',envelope.id,'capability_lease_id',lease.id,'capability_id',target_capability,
    'autonomy_level',envelope.autonomy_level,'trace_id',target_trace_id,
    'used_operations',used_after,'max_operations',lease.max_operations,'lease_status',lease_status_after,
    'idempotent_replay',false
  );
end;
$$;

revoke all on function private.execution_operation_rank(text) from public,anon,authenticated;
revoke all on function private.execution_autonomy_rank(text) from public,anon,authenticated;
revoke all on function private.execution_sponsor_is_active(uuid,uuid) from public,anon,authenticated;
revoke all on function private.execution_validate_job_capability(uuid,uuid,uuid) from public,anon,authenticated;
revoke all on function private.execution_breaker_category(text,text) from public,anon,authenticated;
revoke all on function private.record_execution_authority_event(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function private.execution_validate_envelope_definition(text,text[],jsonb,text,jsonb) from public,anon,authenticated;

revoke all on function public.propose_authority_envelope_v1(uuid,uuid,text,text,uuid,text,text,text[],text[],timestamptz,uuid,uuid,jsonb,jsonb,text,jsonb) from public,anon;
revoke all on function public.approve_authority_envelope_v1(uuid) from public,anon;
revoke all on function public.reject_authority_envelope_v1(uuid,text) from public,anon;
revoke all on function public.revoke_authority_envelope_v1(uuid,text) from public,anon;
revoke all on function public.issue_capability_lease_v1(uuid,uuid,text[],integer,timestamptz) from public,anon;
revoke all on function public.release_capability_lease_v1(uuid,text) from public,anon;
revoke all on function public.set_execution_circuit_breaker_v1(uuid,text,text,text) from public,anon;
revoke all on function public.get_execution_authority_workspace_v1(uuid) from public,anon;
revoke all on function public.service_authorize_execution_v1(uuid,uuid,text,uuid,text,text,text,uuid,uuid) from public,anon,authenticated;

grant execute on function public.propose_authority_envelope_v1(uuid,uuid,text,text,uuid,text,text,text[],text[],timestamptz,uuid,uuid,jsonb,jsonb,text,jsonb) to authenticated,service_role;
grant execute on function public.approve_authority_envelope_v1(uuid) to authenticated,service_role;
grant execute on function public.reject_authority_envelope_v1(uuid,text) to authenticated,service_role;
grant execute on function public.revoke_authority_envelope_v1(uuid,text) to authenticated,service_role;
grant execute on function public.issue_capability_lease_v1(uuid,uuid,text[],integer,timestamptz) to authenticated,service_role;
grant execute on function public.release_capability_lease_v1(uuid,text) to authenticated,service_role;
grant execute on function public.set_execution_circuit_breaker_v1(uuid,text,text,text) to authenticated,service_role;
grant execute on function public.get_execution_authority_workspace_v1(uuid) to authenticated,service_role;
grant execute on function public.service_authorize_execution_v1(uuid,uuid,text,uuid,text,text,text,uuid,uuid) to service_role;

commit;

begin;

create schema if not exists private;

create table public.retention_policies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  purpose text not null,
  visibility_class text not null check (visibility_class in (
    'public','nest_private','project_restricted','organization_restricted','high_sensitivity','local_only'
  )),
  reuse_state text not null check (reuse_state in (
    'runtime_only','session_context','project_learning_eligible','project_certified_memory',
    'platform_learning_eligible','datanest_certified_knowledge','publicly_reusable'
  )),
  retention_days integer check (retention_days is null or retention_days>=0),
  post_retention_action text not null check (post_retention_action in (
    'retain','review','archive_candidate','delete_candidate'
  )),
  requires_human_review boolean not null default true,
  legal_hold_capable boolean not null default true,
  status text not null default 'proposed' check (status in ('proposed','active','rejected','superseded')),
  policy_version text not null,
  proposed_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint retention_policies_name_nonempty check (length(btrim(name)) between 1 and 200),
  constraint retention_policies_purpose_nonempty check (length(btrim(purpose)) between 1 and 500),
  constraint retention_policies_version_nonempty check (length(btrim(policy_version)) between 1 and 120)
);

create index retention_policies_project_idx
  on public.retention_policies(project_id,status,created_at desc);
create index retention_policies_proposed_by_idx
  on public.retention_policies(proposed_by);
create index retention_policies_approved_by_idx
  on public.retention_policies(approved_by)
  where approved_by is not null;
create unique index retention_policies_one_active_name_idx
  on public.retention_policies(project_id,lower(name))
  where status='active';

create table public.data_policy_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  object_type text not null check (object_type in (
    'certified_memory','portfolio_item','product','product_record'
  )),
  object_id uuid not null,
  visibility_class text not null check (visibility_class in (
    'public','nest_private','project_restricted','organization_restricted','high_sensitivity','local_only'
  )),
  reuse_state text not null check (reuse_state in (
    'runtime_only','session_context','project_learning_eligible','project_certified_memory',
    'platform_learning_eligible','datanest_certified_knowledge','publicly_reusable'
  )),
  purpose text not null,
  retention_policy_id uuid references public.retention_policies(id) on delete restrict,
  policy_source text not null default 'manual' check (policy_source in ('manual','system_default','promotion','import')),
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'proposed' check (status in ('proposed','active','rejected','superseded')),
  proposed_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint data_policy_assignment_purpose_nonempty check (length(btrim(purpose)) between 1 and 500)
);

create index data_policy_assignments_project_idx
  on public.data_policy_assignments(project_id,status,object_type);
create index data_policy_assignments_object_idx
  on public.data_policy_assignments(object_type,object_id,status);
create index data_policy_assignments_retention_idx
  on public.data_policy_assignments(retention_policy_id)
  where retention_policy_id is not null;
create index data_policy_assignments_proposed_by_idx
  on public.data_policy_assignments(proposed_by);
create index data_policy_assignments_approved_by_idx
  on public.data_policy_assignments(approved_by)
  where approved_by is not null;
create unique index data_policy_assignments_one_active_idx
  on public.data_policy_assignments(project_id,object_type,object_id)
  where status='active';

create table public.provider_trust_profiles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  provider_key text not null,
  display_name text not null,
  permitted_visibility_classes text[] not null default '{}'::text[],
  permitted_reuse_states text[] not null default '{}'::text[],
  permitted_purposes text[] not null default '{}'::text[],
  region_locality text,
  retention_policy text not null,
  training_reuse_policy text not null,
  security_posture text not null,
  contract_state text not null,
  availability_state text not null,
  evidence_reference text,
  status text not null default 'proposed' check (status in ('proposed','active','rejected','superseded')),
  policy_version text not null,
  proposed_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint provider_trust_profiles_provider_nonempty check (length(btrim(provider_key)) between 1 and 160),
  constraint provider_trust_profiles_display_nonempty check (length(btrim(display_name)) between 1 and 240),
  constraint provider_trust_profiles_version_nonempty check (length(btrim(policy_version)) between 1 and 120)
);

create index provider_trust_profiles_project_idx
  on public.provider_trust_profiles(project_id,status,provider_key);
create index provider_trust_profiles_proposed_by_idx
  on public.provider_trust_profiles(proposed_by);
create index provider_trust_profiles_approved_by_idx
  on public.provider_trust_profiles(approved_by)
  where approved_by is not null;
create unique index provider_trust_profiles_one_active_project_idx
  on public.provider_trust_profiles(project_id,provider_key)
  where status='active' and project_id is not null;
create unique index provider_trust_profiles_one_active_platform_idx
  on public.provider_trust_profiles(provider_key)
  where status='active' and project_id is null;

create table public.trust_manifests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  scope_type text not null check (scope_type in ('project','product')),
  scope_id uuid not null,
  manifest_version text not null,
  publication_state text not null default 'draft' check (publication_state in ('draft','internal','public')),
  data_location_summary text not null,
  access_policy_summary text not null,
  learning_policy_summary text not null,
  external_provider_policy_summary text not null,
  retention_summary text not null,
  export_portability_summary text not null,
  audit_state_summary text not null,
  governance_version_reference text,
  evidence jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint trust_manifests_version_nonempty check (length(btrim(manifest_version)) between 1 and 120)
);

create index trust_manifests_project_idx
  on public.trust_manifests(project_id,scope_type,scope_id,publication_state,created_at desc);
create index trust_manifests_created_by_idx
  on public.trust_manifests(created_by);
create index trust_manifests_approved_by_idx
  on public.trust_manifests(approved_by)
  where approved_by is not null;
create unique index trust_manifests_scope_version_idx
  on public.trust_manifests(project_id,scope_type,scope_id,manifest_version);

create table public.retention_evaluations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  object_type text not null,
  object_id uuid not null,
  retention_policy_id uuid not null references public.retention_policies(id) on delete restrict,
  policy_version text not null,
  evaluated_at timestamptz not null default now(),
  effective_age_days integer not null check (effective_age_days>=0),
  proposed_action text not null check (proposed_action in ('retain','review','archive_candidate','delete_candidate')),
  reason text not null,
  legal_hold boolean not null default false,
  execution_authorized boolean not null default false,
  trace_id text not null unique
);

create index retention_evaluations_project_idx
  on public.retention_evaluations(project_id,evaluated_at desc);
create index retention_evaluations_object_idx
  on public.retention_evaluations(object_type,object_id,evaluated_at desc);
create index retention_evaluations_policy_idx
  on public.retention_evaluations(retention_policy_id,evaluated_at desc);

alter table public.retention_policies enable row level security;
alter table public.data_policy_assignments enable row level security;
alter table public.provider_trust_profiles enable row level security;
alter table public.trust_manifests enable row level security;
alter table public.retention_evaluations enable row level security;

create policy retention_policies_select
  on public.retention_policies for select
  to authenticated
  using (private.is_project_stakeholder(project_id) or private.is_project_member(project_id));

create policy data_policy_assignments_select
  on public.data_policy_assignments for select
  to authenticated
  using (private.is_project_stakeholder(project_id) or private.is_project_member(project_id));

create policy provider_trust_profiles_select
  on public.provider_trust_profiles for select
  to authenticated
  using (
    project_id is null
    or private.is_project_stakeholder(project_id)
    or private.is_project_member(project_id)
  );

create policy trust_manifests_select
  on public.trust_manifests for select
  to authenticated
  using (private.is_project_stakeholder(project_id) or private.is_project_member(project_id));

create policy retention_evaluations_select
  on public.retention_evaluations for select
  to authenticated
  using (private.is_project_stakeholder(project_id) or private.is_project_member(project_id));

grant select on table public.retention_policies to authenticated;
grant select on table public.data_policy_assignments to authenticated;
grant select on table public.provider_trust_profiles to authenticated;
grant select on table public.trust_manifests to authenticated;
grant select on table public.retention_evaluations to authenticated;

grant select,insert,update,delete on table public.retention_policies to service_role;
grant select,insert,update,delete on table public.data_policy_assignments to service_role;
grant select,insert,update,delete on table public.provider_trust_profiles to service_role;
grant select,insert,update,delete on table public.trust_manifests to service_role;
grant select,insert,update,delete on table public.retention_evaluations to service_role;

create or replace function private.trust_data_object_project(
  target_object_type text,
  target_object_id uuid
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  result uuid;
begin
  case target_object_type
    when 'certified_memory' then
      select project_id into result from public.certified_memory where id=target_object_id;
    when 'portfolio_item' then
      select project_id into result from public.portfolio_items where id=target_object_id;
    when 'product' then
      select project_id into result from public.products where id=target_object_id;
    when 'product_record' then
      select project_id into result from public.product_records where id=target_object_id;
    else
      return null;
  end case;
  return result;
end;
$$;

create or replace function private.trust_manifest_scope_project(
  target_scope_type text,
  target_scope_id uuid
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  result uuid;
begin
  if target_scope_type='project' then
    select id into result from public.projects where id=target_scope_id;
  elsif target_scope_type='product' then
    select project_id into result from public.products where id=target_scope_id;
  end if;
  return result;
end;
$$;

create or replace function private.record_trust_data_event(
  target_project uuid,
  target_event_type text,
  target_actor uuid,
  target_payload jsonb
) returns void
language plpgsql
security definer
set search_path=public,private,auth
as $$
begin
  insert into public.events(project_id,job_id,event_type,actor,payload)
  values(target_project,null,target_event_type,target_actor::text,coalesce(target_payload,'{}'::jsonb));
end;
$$;

create or replace function public.propose_data_policy_assignment_v1(
  target_project uuid,
  target_object_type text,
  target_object_id uuid,
  target_visibility_class text,
  target_reuse_state text,
  target_purpose text,
  target_retention_policy uuid default null,
  target_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  item_project uuid;
  assignment_id uuid;
  retention_project uuid;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  if not private.has_project_role(target_project,array['owner','admin','operator']) then
    raise insufficient_privilege using message='Owner, admin, or operator access is required.';
  end if;
  if target_object_type not in ('certified_memory','portfolio_item','product','product_record') then
    raise exception 'Unsupported governed object type.';
  end if;
  if target_visibility_class not in ('public','nest_private','project_restricted','organization_restricted','high_sensitivity','local_only') then
    raise exception 'Unsupported visibility class.';
  end if;
  if target_reuse_state not in (
    'runtime_only','session_context','project_learning_eligible','project_certified_memory',
    'platform_learning_eligible','datanest_certified_knowledge','publicly_reusable'
  ) then
    raise exception 'Unsupported reuse state.';
  end if;
  if target_reuse_state in ('platform_learning_eligible','datanest_certified_knowledge','publicly_reusable')
     and not private.has_project_role(target_project,array['owner']) then
    raise insufficient_privilege using message='Owner approval is required for platform or public reuse state.';
  end if;
  if nullif(btrim(coalesce(target_purpose,'')),'') is null then
    raise exception 'Purpose is required.';
  end if;

  item_project:=private.trust_data_object_project(target_object_type,target_object_id);
  if item_project is null then raise exception 'Governed object not found.'; end if;
  if item_project<>target_project then raise exception 'Object project mismatch.'; end if;

  if target_retention_policy is not null then
    select project_id into retention_project
    from public.retention_policies
    where id=target_retention_policy and status='active';
    if retention_project is null then raise exception 'Active retention policy not found.'; end if;
    if retention_project<>target_project then raise exception 'Retention policy project mismatch.'; end if;
  end if;

  insert into public.data_policy_assignments(
    project_id,object_type,object_id,visibility_class,reuse_state,purpose,
    retention_policy_id,policy_source,metadata,status,proposed_by
  )
  values(
    target_project,target_object_type,target_object_id,target_visibility_class,target_reuse_state,
    btrim(target_purpose),target_retention_policy,'manual',coalesce(target_metadata,'{}'::jsonb),
    'proposed',caller
  )
  returning id into assignment_id;

  perform private.record_trust_data_event(
    target_project,'DATA_POLICY_ASSIGNMENT_PROPOSED',caller,
    jsonb_build_object(
      'assignment_id',assignment_id,'object_type',target_object_type,'object_id',target_object_id,
      'visibility_class',target_visibility_class,'reuse_state',target_reuse_state
    )
  );
  return assignment_id;
end;
$$;

create or replace function public.approve_data_policy_assignment_v1(
  target_assignment uuid
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  assignment public.data_policy_assignments%rowtype;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  select * into assignment from public.data_policy_assignments where id=target_assignment for update;
  if not found then raise exception 'Data policy assignment not found.'; end if;
  if assignment.status<>'proposed' then raise exception 'Only proposed data policy assignments may be approved.'; end if;
  if assignment.proposed_by=caller then raise exception 'Proposer cannot approve their own data policy assignment.'; end if;
  if assignment.reuse_state in ('platform_learning_eligible','datanest_certified_knowledge','publicly_reusable') then
    if not private.has_project_role(assignment.project_id,array['owner']) then
      raise insufficient_privilege using message='Owner approval is required for platform or public reuse state.';
    end if;
  elsif not private.has_project_role(assignment.project_id,array['owner','admin']) then
    raise insufficient_privilege using message='Owner or admin access is required.';
  end if;

  update public.data_policy_assignments
  set status='superseded',updated_at=now()
  where project_id=assignment.project_id
    and object_type=assignment.object_type
    and object_id=assignment.object_id
    and status='active';

  update public.data_policy_assignments
  set status='active',approved_by=caller,approved_at=now(),updated_at=now()
  where id=assignment.id;

  perform private.record_trust_data_event(
    assignment.project_id,'DATA_POLICY_ASSIGNMENT_APPROVED',caller,
    jsonb_build_object('assignment_id',assignment.id,'object_type',assignment.object_type,'object_id',assignment.object_id)
  );
  return assignment.id;
end;
$$;

create or replace function public.reject_data_policy_assignment_v1(
  target_assignment uuid,
  target_reason text default null
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  assignment public.data_policy_assignments%rowtype;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  select * into assignment from public.data_policy_assignments where id=target_assignment for update;
  if not found then raise exception 'Data policy assignment not found.'; end if;
  if assignment.status<>'proposed' then raise exception 'Only proposed data policy assignments may be rejected.'; end if;
  if not private.has_project_role(assignment.project_id,array['owner','admin']) then
    raise insufficient_privilege using message='Owner or admin access is required.';
  end if;
  update public.data_policy_assignments
  set status='rejected',approved_by=caller,approved_at=now(),
      metadata=metadata||jsonb_build_object('rejection_reason',nullif(btrim(coalesce(target_reason,'')),'')),
      updated_at=now()
  where id=assignment.id;
  perform private.record_trust_data_event(
    assignment.project_id,'DATA_POLICY_ASSIGNMENT_REJECTED',caller,
    jsonb_build_object('assignment_id',assignment.id,'reason',target_reason)
  );
  return assignment.id;
end;
$$;

create or replace function public.propose_retention_policy_v1(
  target_project uuid,
  target_name text,
  target_purpose text,
  target_visibility_class text,
  target_reuse_state text,
  target_retention_days integer,
  target_post_retention_action text,
  target_policy_version text
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  policy_id uuid;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  if not private.has_project_role(target_project,array['owner','admin','operator']) then
    raise insufficient_privilege using message='Owner, admin, or operator access is required.';
  end if;
  if nullif(btrim(coalesce(target_name,'')),'') is null
     or nullif(btrim(coalesce(target_purpose,'')),'') is null
     or nullif(btrim(coalesce(target_policy_version,'')),'') is null then
    raise exception 'Name, purpose, and policy version are required.';
  end if;
  if target_visibility_class not in ('public','nest_private','project_restricted','organization_restricted','high_sensitivity','local_only') then
    raise exception 'Unsupported visibility class.';
  end if;
  if target_reuse_state not in (
    'runtime_only','session_context','project_learning_eligible','project_certified_memory',
    'platform_learning_eligible','datanest_certified_knowledge','publicly_reusable'
  ) then
    raise exception 'Unsupported reuse state.';
  end if;
  if target_post_retention_action not in ('retain','review','archive_candidate','delete_candidate') then
    raise exception 'Unsupported post-retention action.';
  end if;
  if target_retention_days is not null and target_retention_days<0 then
    raise exception 'Retention days must be non-negative.';
  end if;
  if target_post_retention_action='delete_candidate'
     and not private.has_project_role(target_project,array['owner']) then
    raise insufficient_privilege using message='Owner authority is required for delete-candidate retention policy.';
  end if;

  insert into public.retention_policies(
    project_id,name,purpose,visibility_class,reuse_state,retention_days,
    post_retention_action,status,policy_version,proposed_by
  )
  values(
    target_project,btrim(target_name),btrim(target_purpose),target_visibility_class,target_reuse_state,
    target_retention_days,target_post_retention_action,'proposed',btrim(target_policy_version),caller
  )
  returning id into policy_id;

  perform private.record_trust_data_event(
    target_project,'RETENTION_POLICY_PROPOSED',caller,
    jsonb_build_object('retention_policy_id',policy_id,'post_retention_action',target_post_retention_action)
  );
  return policy_id;
end;
$$;

create or replace function public.approve_retention_policy_v1(
  target_policy uuid
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  policy public.retention_policies%rowtype;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  select * into policy from public.retention_policies where id=target_policy for update;
  if not found then raise exception 'Retention policy not found.'; end if;
  if policy.status<>'proposed' then raise exception 'Only proposed retention policies may be approved.'; end if;
  if policy.proposed_by=caller then raise exception 'Proposer cannot approve their own retention policy.'; end if;
  if policy.post_retention_action='delete_candidate' then
    if not private.has_project_role(policy.project_id,array['owner']) then
      raise insufficient_privilege using message='Owner authority is required for delete-candidate retention policy.';
    end if;
  elsif not private.has_project_role(policy.project_id,array['owner','admin']) then
    raise insufficient_privilege using message='Owner or admin access is required.';
  end if;

  update public.retention_policies
  set status='superseded',updated_at=now()
  where project_id=policy.project_id and lower(name)=lower(policy.name) and status='active';

  update public.retention_policies
  set status='active',approved_by=caller,approved_at=now(),updated_at=now()
  where id=policy.id;

  perform private.record_trust_data_event(
    policy.project_id,'RETENTION_POLICY_APPROVED',caller,
    jsonb_build_object('retention_policy_id',policy.id,'policy_version',policy.policy_version)
  );
  return policy.id;
end;
$$;

create or replace function public.reject_retention_policy_v1(
  target_policy uuid,
  target_reason text default null
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  policy public.retention_policies%rowtype;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  select * into policy from public.retention_policies where id=target_policy for update;
  if not found then raise exception 'Retention policy not found.'; end if;
  if policy.status<>'proposed' then raise exception 'Only proposed retention policies may be rejected.'; end if;
  if not private.has_project_role(policy.project_id,array['owner','admin']) then
    raise insufficient_privilege using message='Owner or admin access is required.';
  end if;
  update public.retention_policies
  set status='rejected',approved_by=caller,approved_at=now(),updated_at=now()
  where id=policy.id;
  perform private.record_trust_data_event(
    policy.project_id,'RETENTION_POLICY_REJECTED',caller,
    jsonb_build_object('retention_policy_id',policy.id,'reason',target_reason)
  );
  return policy.id;
end;
$$;

create or replace function public.propose_provider_trust_profile_v1(
  target_project uuid,
  target_provider_key text,
  target_display_name text,
  target_permitted_visibility_classes text[],
  target_permitted_reuse_states text[],
  target_permitted_purposes text[],
  target_region_locality text,
  target_retention_policy text,
  target_training_reuse_policy text,
  target_security_posture text,
  target_contract_state text,
  target_availability_state text,
  target_evidence_reference text,
  target_policy_version text
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  profile_id uuid;
  visibility text;
  reuse text;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  if target_project is null then
    raise exception 'Platform default Provider Trust Profiles require separate platform authority.';
  end if;
  if not private.has_project_role(target_project,array['owner','admin','operator']) then
    raise insufficient_privilege using message='Owner, admin, or operator access is required.';
  end if;
  if nullif(btrim(coalesce(target_provider_key,'')),'') is null
     or nullif(btrim(coalesce(target_display_name,'')),'') is null
     or nullif(btrim(coalesce(target_retention_policy,'')),'') is null
     or nullif(btrim(coalesce(target_training_reuse_policy,'')),'') is null
     or nullif(btrim(coalesce(target_security_posture,'')),'') is null
     or nullif(btrim(coalesce(target_contract_state,'')),'') is null
     or nullif(btrim(coalesce(target_availability_state,'')),'') is null
     or nullif(btrim(coalesce(target_policy_version,'')),'') is null then
    raise exception 'Provider Trust Profile policy fields are required.';
  end if;
  if coalesce(array_length(target_permitted_visibility_classes,1),0)=0
     or coalesce(array_length(target_permitted_purposes,1),0)=0 then
    raise exception 'Provider Trust Profile requires permitted visibility classes and purposes.';
  end if;
  foreach visibility in array target_permitted_visibility_classes loop
    if visibility not in ('public','nest_private','project_restricted','organization_restricted','high_sensitivity','local_only') then
      raise exception 'Unsupported visibility class in Provider Trust Profile.';
    end if;
  end loop;
  foreach reuse in array coalesce(target_permitted_reuse_states,'{}'::text[]) loop
    if reuse not in (
      'runtime_only','session_context','project_learning_eligible','project_certified_memory',
      'platform_learning_eligible','datanest_certified_knowledge','publicly_reusable'
    ) then
      raise exception 'Unsupported reuse state in Provider Trust Profile.';
    end if;
  end loop;

  insert into public.provider_trust_profiles(
    project_id,provider_key,display_name,permitted_visibility_classes,permitted_reuse_states,
    permitted_purposes,region_locality,retention_policy,training_reuse_policy,security_posture,
    contract_state,availability_state,evidence_reference,status,policy_version,proposed_by
  )
  values(
    target_project,lower(btrim(target_provider_key)),btrim(target_display_name),
    target_permitted_visibility_classes,coalesce(target_permitted_reuse_states,'{}'::text[]),
    target_permitted_purposes,nullif(btrim(coalesce(target_region_locality,'')),''),
    btrim(target_retention_policy),btrim(target_training_reuse_policy),btrim(target_security_posture),
    btrim(target_contract_state),btrim(target_availability_state),
    nullif(btrim(coalesce(target_evidence_reference,'')),''),
    'proposed',btrim(target_policy_version),caller
  )
  returning id into profile_id;

  perform private.record_trust_data_event(
    target_project,'PROVIDER_TRUST_PROFILE_PROPOSED',caller,
    jsonb_build_object('provider_trust_profile_id',profile_id,'provider_key',lower(btrim(target_provider_key)))
  );
  return profile_id;
end;
$$;

create or replace function public.approve_provider_trust_profile_v1(
  target_profile uuid
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  profile public.provider_trust_profiles%rowtype;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  select * into profile from public.provider_trust_profiles where id=target_profile for update;
  if not found then raise exception 'Provider Trust Profile not found.'; end if;
  if profile.project_id is null then raise exception 'Platform default Provider Trust Profiles require separate platform authority.'; end if;
  if profile.status<>'proposed' then raise exception 'Only proposed Provider Trust Profiles may be approved.'; end if;
  if profile.proposed_by=caller then raise exception 'Proposer cannot approve their own Provider Trust Profile.'; end if;
  if not private.has_project_role(profile.project_id,array['owner','admin']) then
    raise insufficient_privilege using message='Owner or admin access is required.';
  end if;

  update public.provider_trust_profiles
  set status='superseded',updated_at=now()
  where project_id=profile.project_id and provider_key=profile.provider_key and status='active';

  update public.provider_trust_profiles
  set status='active',approved_by=caller,approved_at=now(),updated_at=now()
  where id=profile.id;

  perform private.record_trust_data_event(
    profile.project_id,'PROVIDER_TRUST_PROFILE_APPROVED',caller,
    jsonb_build_object('provider_trust_profile_id',profile.id,'provider_key',profile.provider_key)
  );
  return profile.id;
end;
$$;

create or replace function public.save_trust_manifest_draft_v1(
  target_project uuid,
  target_scope_type text,
  target_scope_id uuid,
  target_manifest_version text,
  target_data_location_summary text,
  target_access_policy_summary text,
  target_learning_policy_summary text,
  target_external_provider_policy_summary text,
  target_retention_summary text,
  target_export_portability_summary text,
  target_audit_state_summary text,
  target_governance_version_reference text default null,
  target_evidence jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  scope_project uuid;
  manifest_id uuid;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  if not private.has_project_role(target_project,array['owner','admin','operator']) then
    raise insufficient_privilege using message='Owner, admin, or operator access is required.';
  end if;
  if target_scope_type not in ('project','product') then raise exception 'Unsupported Trust Manifest scope type.'; end if;
  scope_project:=private.trust_manifest_scope_project(target_scope_type,target_scope_id);
  if scope_project is null then raise exception 'Trust Manifest scope not found.'; end if;
  if scope_project<>target_project then raise exception 'Object project mismatch.'; end if;
  if nullif(btrim(coalesce(target_manifest_version,'')),'') is null then
    raise exception 'Manifest version is required.';
  end if;

  insert into public.trust_manifests(
    project_id,scope_type,scope_id,manifest_version,publication_state,
    data_location_summary,access_policy_summary,learning_policy_summary,
    external_provider_policy_summary,retention_summary,export_portability_summary,
    audit_state_summary,governance_version_reference,evidence,created_by
  )
  values(
    target_project,target_scope_type,target_scope_id,btrim(target_manifest_version),'draft',
    btrim(target_data_location_summary),btrim(target_access_policy_summary),btrim(target_learning_policy_summary),
    btrim(target_external_provider_policy_summary),btrim(target_retention_summary),btrim(target_export_portability_summary),
    btrim(target_audit_state_summary),nullif(btrim(coalesce(target_governance_version_reference,'')),''),
    coalesce(target_evidence,'{}'::jsonb),caller
  )
  returning id into manifest_id;

  perform private.record_trust_data_event(
    target_project,'TRUST_MANIFEST_DRAFTED',caller,
    jsonb_build_object('trust_manifest_id',manifest_id,'scope_type',target_scope_type,'scope_id',target_scope_id)
  );
  return manifest_id;
end;
$$;

create or replace function public.approve_trust_manifest_v1(
  target_manifest uuid,
  target_public boolean default false
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  manifest public.trust_manifests%rowtype;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  select * into manifest from public.trust_manifests where id=target_manifest for update;
  if not found then raise exception 'Trust Manifest not found.'; end if;
  if manifest.publication_state<>'draft' then raise exception 'Only draft Trust Manifests may be approved.'; end if;
  if manifest.created_by=caller then raise exception 'Author cannot approve their own Trust Manifest.'; end if;

  if target_public then
    if not private.has_project_role(manifest.project_id,array['owner']) then
      raise insufficient_privilege using message='Owner authority is required for public Trust Manifest publication.';
    end if;
    if jsonb_object_length(manifest.evidence)=0 then
      raise exception 'Public Trust Manifest requires evidence.';
    end if;
  elsif not private.has_project_role(manifest.project_id,array['owner','admin']) then
    raise insufficient_privilege using message='Owner or admin access is required.';
  end if;

  update public.trust_manifests
  set publication_state=case when target_public then 'public' else 'internal' end,
      approved_by=caller,approved_at=now(),updated_at=now()
  where id=manifest.id;

  perform private.record_trust_data_event(
    manifest.project_id,
    case when target_public then 'TRUST_MANIFEST_PUBLISHED' else 'TRUST_MANIFEST_APPROVED_INTERNAL' end,
    caller,
    jsonb_build_object('trust_manifest_id',manifest.id,'public',target_public,'manifest_version',manifest.manifest_version)
  );
  return manifest.id;
end;
$$;

create or replace function public.run_retention_evaluation_v1(
  target_project uuid
) returns integer
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  item record;
  inserted_count integer:=0;
  held boolean;
  action text;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  if not private.has_project_role(target_project,array['owner','admin','operator']) then
    raise insufficient_privilege using message='Owner, admin, or operator access is required.';
  end if;

  for item in
    select
      a.id as assignment_id,a.object_type,a.object_id,a.created_at,a.metadata,
      p.id as retention_policy_id,p.policy_version,p.retention_days,p.post_retention_action
    from public.data_policy_assignments a
    join public.retention_policies p on p.id=a.retention_policy_id
    where a.project_id=target_project
      and a.status='active'
      and p.status='active'
      and p.retention_days is not null
      and current_date >= (a.created_at::date + p.retention_days)
  loop
    held:=coalesce(item.metadata->>'legal_hold','false')='true';
    action:=case when held then 'retain' else item.post_retention_action end;

    insert into public.retention_evaluations(
      project_id,object_type,object_id,retention_policy_id,policy_version,
      effective_age_days,proposed_action,reason,legal_hold,execution_authorized,trace_id
    )
    values(
      target_project,item.object_type,item.object_id,item.retention_policy_id,item.policy_version,
      greatest(0,current_date-item.created_at::date),action,
      case
        when held then 'Legal hold prevents lifecycle action.'
        else 'Retention threshold reached; human review is required before any source mutation.'
      end,
      held,false,'DN-RET-'||replace(gen_random_uuid()::text,'-','')
    );
    inserted_count:=inserted_count+1;
  end loop;

  perform private.record_trust_data_event(
    target_project,'RETENTION_EVALUATION_RUN',caller,
    jsonb_build_object('evaluation_count',inserted_count,'execution_authorized',false)
  );
  return inserted_count;
end;
$$;

create or replace function public.evaluate_provider_policy_v1(
  target_project uuid,
  target_provider_key text,
  target_visibility_class text,
  target_purpose text,
  target_reuse_state text
) returns jsonb
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  caller uuid:=auth.uid();
  profile public.provider_trust_profiles%rowtype;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  if not (
    private.is_project_stakeholder(target_project)
    or private.is_project_member(target_project)
  ) then
    raise insufficient_privilege using message='Project access is required.';
  end if;

  select * into profile
  from public.provider_trust_profiles
  where provider_key=lower(btrim(target_provider_key))
    and status='active'
    and (project_id=target_project or project_id is null)
  order by (project_id is not null) desc, updated_at desc
  limit 1;

  if not found then
    return jsonb_build_object('permitted',false,'reason','No active Provider Trust Profile permits this route.');
  end if;
  if profile.availability_state<>'available' then
    return jsonb_build_object('permitted',false,'reason','Provider Trust Profile is not available.','profile_id',profile.id);
  end if;
  if not (target_visibility_class=any(profile.permitted_visibility_classes)) then
    return jsonb_build_object('permitted',false,'reason','Visibility class is not permitted for this provider.','profile_id',profile.id);
  end if;
  if coalesce(array_length(profile.permitted_reuse_states,1),0)>0
     and not (target_reuse_state=any(profile.permitted_reuse_states)) then
    return jsonb_build_object('permitted',false,'reason','Reuse state is not permitted for this provider.','profile_id',profile.id);
  end if;
  if not (target_purpose=any(profile.permitted_purposes) or '*'=any(profile.permitted_purposes)) then
    return jsonb_build_object('permitted',false,'reason','Purpose is not permitted for this provider.','profile_id',profile.id);
  end if;
  if target_visibility_class='local_only'
     and lower(coalesce(profile.region_locality,'')) not in ('local','on-device','on_device') then
    return jsonb_build_object('permitted',false,'reason','Local Only data cannot leave the permitted local boundary.','profile_id',profile.id);
  end if;

  return jsonb_build_object(
    'permitted',true,
    'reason','Provider Trust Profile permits this route.',
    'profile_id',profile.id,
    'policy_version',profile.policy_version,
    'retention_policy',profile.retention_policy,
    'training_reuse_policy',profile.training_reuse_policy
  );
end;
$$;

revoke all on function public.propose_data_policy_assignment_v1(uuid,text,uuid,text,text,text,uuid,jsonb) from public;
revoke all on function public.approve_data_policy_assignment_v1(uuid) from public;
revoke all on function public.reject_data_policy_assignment_v1(uuid,text) from public;
revoke all on function public.propose_retention_policy_v1(uuid,text,text,text,text,integer,text,text) from public;
revoke all on function public.approve_retention_policy_v1(uuid) from public;
revoke all on function public.reject_retention_policy_v1(uuid,text) from public;
revoke all on function public.propose_provider_trust_profile_v1(uuid,text,text,text[],text[],text[],text,text,text,text,text,text,text,text) from public;
revoke all on function public.approve_provider_trust_profile_v1(uuid) from public;
revoke all on function public.save_trust_manifest_draft_v1(uuid,text,uuid,text,text,text,text,text,text,text,text,text,jsonb) from public;
revoke all on function public.approve_trust_manifest_v1(uuid,boolean) from public;
revoke all on function public.run_retention_evaluation_v1(uuid) from public;
revoke all on function public.evaluate_provider_policy_v1(uuid,text,text,text,text) from public;

grant execute on function public.propose_data_policy_assignment_v1(uuid,text,uuid,text,text,text,uuid,jsonb) to authenticated, service_role;
grant execute on function public.approve_data_policy_assignment_v1(uuid) to authenticated, service_role;
grant execute on function public.reject_data_policy_assignment_v1(uuid,text) to authenticated, service_role;
grant execute on function public.propose_retention_policy_v1(uuid,text,text,text,text,integer,text,text) to authenticated, service_role;
grant execute on function public.approve_retention_policy_v1(uuid) to authenticated, service_role;
grant execute on function public.reject_retention_policy_v1(uuid,text) to authenticated, service_role;
grant execute on function public.propose_provider_trust_profile_v1(uuid,text,text,text[],text[],text[],text,text,text,text,text,text,text,text) to authenticated, service_role;
grant execute on function public.approve_provider_trust_profile_v1(uuid) to authenticated, service_role;
grant execute on function public.save_trust_manifest_draft_v1(uuid,text,uuid,text,text,text,text,text,text,text,text,text,jsonb) to authenticated, service_role;
grant execute on function public.approve_trust_manifest_v1(uuid,boolean) to authenticated, service_role;
grant execute on function public.run_retention_evaluation_v1(uuid) to authenticated, service_role;
grant execute on function public.evaluate_provider_policy_v1(uuid,text,text,text,text) to authenticated, service_role;

commit;

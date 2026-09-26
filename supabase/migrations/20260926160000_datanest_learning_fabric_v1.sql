begin;

alter table public.certified_memory
  add column if not exists context jsonb not null default '{}'::jsonb;

create index if not exists certified_memory_context_gin_idx
  on public.certified_memory using gin(context);

create table if not exists public.datanest_application_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  application_key text not null check (length(btrim(application_key)) > 0),
  trace_id text not null unique check (length(btrim(trace_id)) > 0),
  client_request_id uuid not null,
  source_type text not null check (
    source_type = any(array[
      'human'::text,'application'::text,'datanest_ai'::text,'ai_companion'::text,
      'automation'::text,'scheduler'::text,'test'::text,'deployment'::text
    ])
  ),
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null default 'other' check (length(btrim(entity_type)) > 0),
  entity_id text,
  action text not null check (length(btrim(action)) > 0),
  input_refs jsonb not null default '[]'::jsonb,
  artifact_refs jsonb not null default '[]'::jsonb,
  outcome text not null default 'unknown' check (
    outcome = any(array['accepted'::text,'rejected'::text,'succeeded'::text,'failed'::text,'superseded'::text,'unknown'::text])
  ),
  quality jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  learning_eligible boolean not null default false,
  sensitivity_class text not null default 'normal',
  learning_state text not null default 'pending' check (
    learning_state = any(array['excluded'::text,'pending'::text,'staged'::text,'failed'::text])
  ),
  staging_event_id uuid,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,application_key,client_request_id)
);

alter table public.datanest_application_events enable row level security;
revoke all on public.datanest_application_events from public,anon,authenticated;
grant select on public.datanest_application_events to authenticated;
grant all on public.datanest_application_events to service_role;

drop policy if exists datanest_application_events_project_read on public.datanest_application_events;
create policy datanest_application_events_project_read
on public.datanest_application_events
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (
    private.is_project_member(project_id)
    or (job_id is not null and private.is_job_collaborator(job_id))
  )
);

create index if not exists datanest_application_events_project_time_idx
  on public.datanest_application_events(project_id,created_at desc);
create index if not exists datanest_application_events_job_time_idx
  on public.datanest_application_events(job_id,created_at desc)
  where job_id is not null;
create index if not exists datanest_application_events_application_time_idx
  on public.datanest_application_events(project_id,application_key,created_at desc);
create index if not exists datanest_application_events_learning_state_idx
  on public.datanest_application_events(project_id,learning_state,created_at desc);
create index if not exists datanest_application_events_entity_idx
  on public.datanest_application_events(project_id,entity_type,entity_id,created_at desc);
create index if not exists datanest_application_events_actor_user_idx
  on public.datanest_application_events(actor_user_id)
  where actor_user_id is not null;

create or replace function private.promote_certified_memory_v2(
  target_project uuid,
  target_knowledge text,
  target_category text,
  target_certification_id uuid,
  target_source_job_ids uuid[],
  target_source_trace_ids text[],
  target_certification_class text,
  target_confidence numeric,
  target_policy_version text,
  target_content_hash text,
  target_context jsonb default '{}'::jsonb,
  target_supersedes uuid default null
) returns uuid
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  next_version bigint;
  existing_id uuid;
  new_id uuid;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then
    raise insufficient_privilege using message='Service role required.';
  end if;
  if nullif(btrim(target_knowledge),'') is null
     or nullif(btrim(target_content_hash),'') is null
     or target_certification_id is null then
    raise exception 'Certified knowledge, content hash and certification id are required.';
  end if;

  select id into existing_id
  from public.certified_memory
  where project_id=target_project and content_hash=target_content_hash and active=true
  order by effective_version desc limit 1;
  if found then return existing_id; end if;

  select coalesce(max(effective_version),0)+1 into next_version
  from public.certified_memory where project_id=target_project;

  if target_supersedes is not null then
    update public.certified_memory
    set active=false
    where id=target_supersedes and project_id=target_project and active=true;
    if not found then raise exception 'Superseded memory is not active in this project.'; end if;
  end if;

  insert into public.certified_memory(
    project_id,normalized_knowledge,category,effective_version,certification_id,
    source_job_ids,source_trace_ids,certification_class,confidence,policy_version,
    content_hash,context,supersedes_memory_id
  ) values (
    target_project,btrim(target_knowledge),target_category,next_version,target_certification_id,
    coalesce(target_source_job_ids,'{}'),coalesce(target_source_trace_ids,'{}'),
    target_certification_class,target_confidence,target_policy_version,
    target_content_hash,coalesce(target_context,'{}'::jsonb),target_supersedes
  ) returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.service_promote_certified_memory_v2(
  target_project uuid,
  target_knowledge text,
  target_category text,
  target_certification_id uuid,
  target_source_job_ids uuid[],
  target_source_trace_ids text[],
  target_certification_class text,
  target_confidence numeric,
  target_policy_version text,
  target_content_hash text,
  target_context jsonb default '{}'::jsonb,
  target_supersedes uuid default null
) returns uuid
language sql
security definer
set search_path=public,private
as $$
  select private.promote_certified_memory_v2(
    target_project,target_knowledge,target_category,target_certification_id,
    target_source_job_ids,target_source_trace_ids,target_certification_class,
    target_confidence,target_policy_version,target_content_hash,
    target_context,target_supersedes
  );
$$;

create or replace function private.get_certified_intelligence_v1(
  target_project uuid,
  target_job uuid,
  target_application_key text,
  target_action text,
  target_entity_type text,
  target_entity_id text,
  target_limit integer default 50
) returns jsonb
language plpgsql
stable
security definer
set search_path=public,private,auth
as $$
declare
  authorized boolean;
  payload jsonb;
begin
  authorized :=
    private.is_project_member(target_project)
    or (
      target_job is not null
      and private.is_job_collaborator(target_job)
      and exists(
        select 1 from public.jobs j
        where j.id=target_job and j.project_id=target_project
      )
    );

  if not authorized then
    raise insufficient_privilege using message='Project or Job collaboration access is required.';
  end if;

  select coalesce(jsonb_agg(to_jsonb(m) - 'rank_score' order by m.rank_score desc,m.promoted_at desc,m.effective_version desc),'[]'::jsonb)
  into payload
  from (
    select cm.*,
      (case when nullif(btrim(coalesce(target_entity_id,'')),'') is not null and coalesce(cm.context->'entity_ids','[]'::jsonb) ? target_entity_id then 8 else 0 end)
      + (case when nullif(btrim(coalesce(target_application_key,'')),'') is not null and coalesce(cm.context->'application_keys','[]'::jsonb) ? target_application_key then 5 else 0 end)
      + (case when nullif(btrim(coalesce(target_action,'')),'') is not null and coalesce(cm.context->'actions','[]'::jsonb) ? target_action then 3 else 0 end)
      + (case when nullif(btrim(coalesce(target_entity_type,'')),'') is not null and coalesce(cm.context->'entity_types','[]'::jsonb) ? target_entity_type then 2 else 0 end)
      + (case when target_job is not null and target_job = any(cm.source_job_ids) then 1 else 0 end)
      as rank_score
    from public.certified_memory cm
    where cm.project_id=target_project and cm.active=true
    order by rank_score desc,cm.promoted_at desc,cm.effective_version desc
    limit greatest(1,least(coalesce(target_limit,50),200))
  ) m;

  return jsonb_build_object('authorized',true,'items',payload);
end;
$$;

create or replace function public.get_certified_intelligence_v1(
  target_project uuid,
  target_job uuid,
  target_application_key text,
  target_action text,
  target_entity_type text,
  target_entity_id text,
  target_limit integer default 50
) returns jsonb
language sql
stable
security definer
set search_path=public,private
as $$
  select private.get_certified_intelligence_v1(
    target_project,target_job,target_application_key,target_action,
    target_entity_type,target_entity_id,target_limit
  );
$$;

revoke execute on function private.promote_certified_memory_v2(uuid,text,text,uuid,uuid[],text[],text,numeric,text,text,jsonb,uuid) from public,anon,authenticated;
revoke execute on function public.service_promote_certified_memory_v2(uuid,text,text,uuid,uuid[],text[],text,numeric,text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.service_promote_certified_memory_v2(uuid,text,text,uuid,uuid[],text[],text,numeric,text,text,jsonb,uuid) to service_role;

revoke execute on function private.get_certified_intelligence_v1(uuid,uuid,text,text,text,text,integer) from public,anon,authenticated;
revoke execute on function public.get_certified_intelligence_v1(uuid,uuid,text,text,text,text,integer) from public,anon;
grant execute on function public.get_certified_intelligence_v1(uuid,uuid,text,text,text,text,integer) to authenticated;

commit;

begin;

create table public.resource_registry (
  id uuid primary key default gen_random_uuid(),
  resource_key text not null unique check (length(btrim(resource_key))>0),
  resource_kind text not null check (resource_kind in (
    'local_node','cloud_worker','gpu_runtime','browser_runtime','model_endpoint',
    'storage_endpoint','api_endpoint','external_service','agent_runtime',
    'product_capability','human_specialist'
  )),
  display_name text not null check (length(btrim(display_name))>0),
  owner_kind text not null check (owner_kind in ('user','project','organization','external','system')),
  owner_user_id uuid references auth.users(id) on delete set null,
  owner_label text,
  trust_level text not null default 'unknown'
    check (trust_level in ('unknown','declared','verified','governed')),
  location_class text not null default 'unknown'
    check (location_class in (
      'unknown','local_device','local_network','private_cloud','managed_cloud',
      'public_cloud','external','human'
    )),
  region_hint text,
  supported_visibility_classes text[] not null default '{}'::text[]
    check (supported_visibility_classes <@ array[
      'public','nest_private','project_restricted','organization_restricted','high_sensitivity','local_only'
    ]::text[]),
  cost_profile jsonb not null default '{}'::jsonb check (jsonb_typeof(cost_profile)='object'),
  limits jsonb not null default '{}'::jsonb check (jsonb_typeof(limits)='object'),
  health_status text not null default 'unknown'
    check (health_status in ('unknown','healthy','degraded','unhealthy')),
  health_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(health_summary)='object'),
  enabled boolean not null default true,
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_by uuid references auth.users(id) on delete set null,
  created_source text not null default 'user'
    check (created_source in ('user','system_backfill','service')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (created_source='user' and created_by is not null)
    or created_source in ('system_backfill','service')
  )
);

create index resource_registry_kind_health_idx
  on public.resource_registry(resource_kind,health_status,enabled);
create index resource_registry_owner_user_idx
  on public.resource_registry(owner_user_id) where owner_user_id is not null;
create index resource_registry_last_seen_idx
  on public.resource_registry(last_seen_at desc) where last_seen_at is not null;

create table public.resource_project_bindings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  resource_id uuid not null references public.resource_registry(id) on delete restrict,
  resource_alias text,
  status text not null default 'proposed'
    check (status in ('proposed','active','suspended','retired')),
  allowed_capabilities text[] not null default '{}'::text[],
  created_by uuid references auth.users(id) on delete set null,
  created_source text not null default 'user'
    check (created_source in ('user','system_backfill','service')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,resource_id),
  check (
    (created_source='user' and created_by is not null)
    or created_source in ('system_backfill','service')
  )
);

create index resource_project_bindings_resource_idx
  on public.resource_project_bindings(resource_id);
create index resource_project_bindings_project_status_idx
  on public.resource_project_bindings(project_id,status,updated_at desc);
create index resource_project_bindings_created_by_idx
  on public.resource_project_bindings(created_by) where created_by is not null;
create index resource_project_bindings_approved_by_idx
  on public.resource_project_bindings(approved_by) where approved_by is not null;

alter table public.capabilities
  add column resource_id uuid references public.resource_registry(id) on delete set null;

create index capabilities_resource_idx
  on public.capabilities(resource_id) where resource_id is not null;

create table public.resource_health_observations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  resource_id uuid not null references public.resource_registry(id) on delete restrict,
  capability_id uuid references public.capabilities(id) on delete restrict,
  health_status text not null
    check (health_status in ('unknown','healthy','degraded','unhealthy')),
  observed_availability text
    check (
      observed_availability is null
      or observed_availability in ('AVAILABLE','BUSY','COOLDOWN','EXHAUSTED','UNKNOWN','OFFLINE','DISABLED')
    ),
  source_kind text not null
    check (source_kind in ('service','node_agent','provider','scheduler','manual_evidence')),
  source_key text not null check (length(btrim(source_key))>0),
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics)='object'),
  evidence_reference text,
  trace_id text not null check (length(btrim(trace_id))>0),
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index resource_health_observations_trace_uidx
  on public.resource_health_observations(project_id,resource_id,trace_id);
create index resource_health_observations_resource_time_idx
  on public.resource_health_observations(resource_id,observed_at desc);
create index resource_health_observations_project_time_idx
  on public.resource_health_observations(project_id,observed_at desc);
create index resource_health_observations_capability_time_idx
  on public.resource_health_observations(capability_id,observed_at desc)
  where capability_id is not null;

create table public.sovereign_node_policies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  resource_id uuid not null references public.resource_registry(id) on delete restrict,
  version integer not null check (version>0),
  status text not null default 'draft'
    check (status in ('draft','active','suspended','superseded','retired')),
  allowed_capabilities text[] not null default '{}'::text[],
  resource_ceiling jsonb not null default '{}'::jsonb check (jsonb_typeof(resource_ceiling)='object'),
  schedule_policy jsonb not null default '{"mode":"always"}'::jsonb check (jsonb_typeof(schedule_policy)='object'),
  allowed_visibility_classes text[] not null default '{}'::text[]
    check (allowed_visibility_classes <@ array[
      'public','nest_private','project_restricted','organization_restricted','high_sensitivity','local_only'
    ]::text[]),
  data_scope jsonb not null default '{}'::jsonb check (jsonb_typeof(data_scope)='object'),
  prohibited_operations text[] not null default '{}'::text[]
    check (prohibited_operations <@ array['observe','prepare','write','execute','promote','destruct']::text[]),
  network_policy jsonb not null default '{}'::jsonb check (jsonb_typeof(network_policy)='object'),
  interactive_remote_control boolean not null default false,
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  supersedes_policy_id uuid references public.sovereign_node_policies(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (interactive_remote_control=false),
  unique(project_id,resource_id,version)
);

create unique index sovereign_node_policies_one_active_uidx
  on public.sovereign_node_policies(project_id,resource_id)
  where status='active';
create index sovereign_node_policies_resource_idx
  on public.sovereign_node_policies(resource_id,created_at desc);
create index sovereign_node_policies_project_status_idx
  on public.sovereign_node_policies(project_id,status,created_at desc);
create index sovereign_node_policies_created_by_idx
  on public.sovereign_node_policies(created_by);
create index sovereign_node_policies_approved_by_idx
  on public.sovereign_node_policies(approved_by) where approved_by is not null;
create index sovereign_node_policies_supersedes_idx
  on public.sovereign_node_policies(supersedes_policy_id) where supersedes_policy_id is not null;

with legacy_groups as (
  select
    c.project_id,
    c.account_key,
    c.connector_kind,
    max(c.observed_at) as last_seen_at,
    bool_or(c.enabled) as enabled
  from public.capabilities c
  where c.resource_id is null
  group by c.project_id,c.account_key,c.connector_kind
)
insert into public.resource_registry(
  resource_key,resource_kind,display_name,owner_kind,owner_label,
  trust_level,location_class,supported_visibility_classes,cost_profile,limits,
  health_status,health_summary,enabled,last_seen_at,metadata,created_by,created_source
)
select
  'legacy:'||g.project_id::text||':'||md5(g.account_key||'|'||g.connector_kind),
  case when g.connector_kind='manual' then 'product_capability' else 'external_service' end,
  g.account_key,
  'project',
  'Legacy capability group',
  'unknown',
  'unknown',
  array['public']::text[],
  '{}'::jsonb,
  '{}'::jsonb,
  'unknown',
  jsonb_build_object('source','phase_e_legacy_backfill'),
  g.enabled,
  g.last_seen_at,
  jsonb_build_object(
    'legacy_capability_group',true,
    'connector_kind',g.connector_kind,
    'origin_project_id',g.project_id,
    'account_key',g.account_key
  ),
  null,
  'system_backfill'
from legacy_groups g
on conflict(resource_key) do nothing;

with grouped as (
  select
    c.project_id,
    c.account_key,
    c.connector_kind,
    array_agg(distinct c.capability order by c.capability) as capabilities
  from public.capabilities c
  where c.resource_id is null
  group by c.project_id,c.account_key,c.connector_kind
)
insert into public.resource_project_bindings(
  project_id,resource_id,resource_alias,status,allowed_capabilities,
  created_by,created_source,approved_by,approved_at
)
select
  g.project_id,
  r.id,
  g.account_key,
  'active',
  g.capabilities,
  null,
  'system_backfill',
  null,
  now()
from grouped g
join public.resource_registry r
  on r.resource_key='legacy:'||g.project_id::text||':'||md5(g.account_key||'|'||g.connector_kind)
on conflict(project_id,resource_id) do nothing;

update public.capabilities c
set resource_id=r.id
from public.resource_registry r
where c.resource_id is null
  and r.resource_key='legacy:'||c.project_id::text||':'||md5(c.account_key||'|'||c.connector_kind);

alter table public.resource_registry enable row level security;
alter table public.resource_project_bindings enable row level security;
alter table public.resource_health_observations enable row level security;
alter table public.sovereign_node_policies enable row level security;

create policy resource_registry_select on public.resource_registry
for select to authenticated
using (
  exists (
    select 1
    from public.resource_project_bindings b
    where b.resource_id=resource_registry.id
      and private.has_project_access(b.project_id)
  )
);

create policy resource_project_bindings_select on public.resource_project_bindings
for select to authenticated
using (private.has_project_access(project_id));

create policy resource_health_observations_select on public.resource_health_observations
for select to authenticated
using (private.has_project_access(project_id));

create policy sovereign_node_policies_select on public.sovereign_node_policies
for select to authenticated
using (private.has_project_access(project_id));

revoke all on table public.resource_registry from public,anon,authenticated;
revoke all on table public.resource_project_bindings from public,anon,authenticated;
revoke all on table public.resource_health_observations from public,anon,authenticated;
revoke all on table public.sovereign_node_policies from public,anon,authenticated;

grant select on table public.resource_registry to authenticated;
grant select on table public.resource_project_bindings to authenticated;
grant select on table public.resource_health_observations to authenticated;
grant select on table public.sovereign_node_policies to authenticated;

grant select,insert,update on table public.resource_registry to service_role;
grant select,insert,update on table public.resource_project_bindings to service_role;
grant select,insert on table public.resource_health_observations to service_role;
grant select,insert,update on table public.sovereign_node_policies to service_role;

commit;

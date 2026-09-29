begin;

create table if not exists public.ai_language_reviewer_qualifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  user_id uuid not null,
  language_tag text not null,
  qualification_scope text not null
    check (qualification_scope in ('source_language_review','semantic_equivalence')),
  evidence jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  verified_by uuid not null,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,user_id,language_tag,qualification_scope)
);

alter table public.ai_language_reviewer_qualifications enable row level security;

revoke all on table public.ai_language_reviewer_qualifications from public,anon,authenticated;
grant select,insert,update on table public.ai_language_reviewer_qualifications to service_role;

create index if not exists ai_language_reviewer_qualification_lookup_idx
  on public.ai_language_reviewer_qualifications(project_id,user_id,active,language_tag);

commit;

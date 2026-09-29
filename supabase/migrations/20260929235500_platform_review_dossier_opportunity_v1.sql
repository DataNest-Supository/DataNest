begin;

-- Resonance DataNest Platform Review, Dossier & Business Opportunity v1
-- Platform suggestions remain non-authoritative until independent external review
-- evidence and authenticated human review are both recorded. Even then, release
-- eligibility is not production, deployment, execution, or live-action authority.

create table if not exists public.platform_update_suggestions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  trace_key text not null unique,
  title text not null,
  summary text not null,
  source_kind text not null check (source_kind in ('self_audit','external_audit','governance_observation','manual')),
  source_ref text not null,
  source_observation_ids uuid[] not null default '{}'::uuid[],
  risk_class text not null default 'moderate' check (risk_class in ('low','moderate','high','critical')),
  suggested_change jsonb not null default '{}'::jsonb,
  expected_benefit text,
  external_review_state text not null default 'pending'
    check (external_review_state in ('pending','accepted','needs_changes','rejected')),
  human_review_state text not null default 'pending'
    check (human_review_state in ('pending','accepted','needs_changes','rejected')),
  status text not null default 'draft'
    check (status in ('draft','external_review','human_review','release_eligible','rejected','superseded')),
  production_authority boolean not null default false check (production_authority=false),
  deployment_authority boolean not null default false check (deployment_authority=false),
  live_action_authority boolean not null default false check (live_action_authority=false),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_update_suggestions_project_idx
  on public.platform_update_suggestions(project_id,status,updated_at desc);
create index if not exists platform_update_suggestions_created_by_idx
  on public.platform_update_suggestions(created_by);
create index if not exists platform_update_suggestions_observation_ids_idx
  on public.platform_update_suggestions using gin(source_observation_ids);

create table if not exists public.platform_update_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  suggestion_id uuid not null references public.platform_update_suggestions(id) on delete restrict,
  review_kind text not null check (review_kind in ('external','human')),
  decision text not null check (decision in ('accepted','needs_changes','rejected')),
  reviewer_display_name text not null,
  reviewer_org text,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  rationale text not null,
  evidence_ref text,
  independence_attested boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists platform_update_reviews_project_idx
  on public.platform_update_reviews(project_id,created_at desc);
create index if not exists platform_update_reviews_suggestion_idx
  on public.platform_update_reviews(suggestion_id,created_at desc);
create index if not exists platform_update_reviews_recorded_by_idx
  on public.platform_update_reviews(recorded_by);
create index if not exists platform_update_reviews_reviewer_user_idx
  on public.platform_update_reviews(reviewer_user_id)
  where reviewer_user_id is not null;

create table if not exists public.platform_dossier_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_key text not null,
  title text not null,
  document_kind text not null default 'controlled_document'
    check (document_kind in ('controlled_document','policy','architecture','procedure','release_evidence','audit_report','risk_record','regulatory_record','other')),
  regulatory_scope text[] not null default '{}'::text[],
  current_revision integer not null default 0 check (current_revision>=0),
  current_content_hash text,
  current_source_ref text,
  current_source_commit text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(project_id,document_key)
);

create index if not exists platform_dossier_documents_project_idx
  on public.platform_dossier_documents(project_id,updated_at desc);
create index if not exists platform_dossier_documents_updated_by_idx
  on public.platform_dossier_documents(updated_by)
  where updated_by is not null;

create table if not exists public.platform_dossier_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid not null references public.platform_dossier_documents(id) on delete restrict,
  revision integer not null check (revision>0),
  content_hash text not null,
  source_ref text not null,
  source_commit text,
  change_summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(document_id,revision)
);

create index if not exists platform_dossier_revisions_project_idx
  on public.platform_dossier_revisions(project_id,created_at desc);
create index if not exists platform_dossier_revisions_document_idx
  on public.platform_dossier_revisions(document_id,revision desc);
create index if not exists platform_dossier_revisions_created_by_idx
  on public.platform_dossier_revisions(created_by);

create table if not exists public.platform_dossier_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid not null references public.platform_dossier_documents(id) on delete restrict,
  revision_id uuid references public.platform_dossier_revisions(id) on delete restrict,
  event_type text not null check (event_type in ('DOCUMENT_REGISTERED','REVISION_RECORDED','REGULATORY_REVIEW_NOTED')),
  actor text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_dossier_events_project_idx
  on public.platform_dossier_events(project_id,created_at desc);
create index if not exists platform_dossier_events_document_idx
  on public.platform_dossier_events(document_id,created_at desc);

create table if not exists public.business_opportunities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  trace_key text not null unique,
  title text not null,
  problem_signal text not null,
  opportunity_hypothesis text not null,
  evidence_refs text[] not null default '{}'::text[],
  currency text not null default 'ZAR',
  projection_low numeric(20,2) not null,
  projection_base numeric(20,2) not null,
  projection_high numeric(20,2) not null,
  horizon_months integer not null default 12 check (horizon_months between 1 and 120),
  confidence numeric(5,4) not null check (confidence>=0 and confidence<=1),
  assumptions jsonb not null default '{}'::jsonb,
  status text not null default 'identified'
    check (status in ('identified','needs_evidence','reviewed','dismissed')),
  review_rationale text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  decision_authority boolean not null default false check (decision_authority=false),
  financial_commitment boolean not null default false check (financial_commitment=false),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (projection_low>=0 and projection_base>=projection_low and projection_high>=projection_base),
  check (currency ~ '^[A-Z]{3}$')
);

create index if not exists business_opportunities_project_idx
  on public.business_opportunities(project_id,status,updated_at desc);
create index if not exists business_opportunities_created_by_idx
  on public.business_opportunities(created_by);
create index if not exists business_opportunities_reviewed_by_idx
  on public.business_opportunities(reviewed_by)
  where reviewed_by is not null;

create or replace function private.platform_review_member_role_v1(target_project uuid)
returns text
language sql
stable
security definer
set search_path=''
as $$
  select pm.role
  from public.project_members pm
  where pm.project_id=target_project
    and pm.user_id=auth.uid()
    and pm.status='active'
  limit 1;
$$;

create or replace function private.create_platform_update_suggestion_v1(
  target_project uuid,
  target_title text,
  target_summary text,
  target_source_kind text,
  target_source_ref text,
  target_source_observation_ids uuid[] default '{}'::uuid[],
  target_risk_class text default 'moderate',
  target_suggested_change jsonb default '{}'::jsonb,
  target_expected_benefit text default null
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  caller uuid:=auth.uid();
  caller_role text;
  suggestion_id uuid:=gen_random_uuid();
  trace text;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  caller_role:=private.platform_review_member_role_v1(target_project);
  if caller_role is null or caller_role not in ('owner','admin','operator') then
    raise insufficient_privilege using message='Owner, Admin, or Operator membership is required to create a platform update suggestion.';
  end if;

  if target_source_kind not in ('self_audit','external_audit','governance_observation','manual') then
    raise exception 'Unsupported platform update suggestion source.';
  end if;
  if target_risk_class not in ('low','moderate','high','critical') then
    raise exception 'Unsupported platform update risk class.';
  end if;
  if nullif(btrim(coalesce(target_title,'')),'') is null
     or nullif(btrim(coalesce(target_summary,'')),'') is null
     or nullif(btrim(coalesce(target_source_ref,'')),'') is null then
    raise exception 'Title, summary, and source reference are required.';
  end if;

  if exists(
    select 1
    from unnest(coalesce(target_source_observation_ids,'{}'::uuid[])) o(id)
    where not exists(
      select 1 from public.governance_observations go
      where go.id=o.id and go.project_id=target_project
    )
  ) then
    raise exception 'Platform suggestion references governance evidence outside the project.';
  end if;

  trace:='DN-PLAT-UPD-'||upper(substr(replace(suggestion_id::text,'-',''),1,16));

  insert into public.platform_update_suggestions(
    id,project_id,trace_key,title,summary,source_kind,source_ref,source_observation_ids,
    risk_class,suggested_change,expected_benefit,status,created_by
  )
  values(
    suggestion_id,target_project,trace,btrim(target_title),btrim(target_summary),
    target_source_kind,btrim(target_source_ref),
    coalesce(target_source_observation_ids,'{}'::uuid[]),target_risk_class,
    coalesce(target_suggested_change,'{}'::jsonb),
    nullif(btrim(coalesce(target_expected_benefit,'')),''),
    'external_review',caller
  );

  insert into public.events(project_id,event_type,actor,payload)
  values(
    target_project,'PLATFORM_UPDATE_SUGGESTION_CREATED',
    coalesce(auth.jwt()->>'email',caller::text),
    jsonb_build_object(
      'suggestion_id',suggestion_id,'trace_key',trace,'source_kind',target_source_kind,
      'risk_class',target_risk_class,'external_review_required',true,
      'human_review_required',true,'deployment_authority',false,'live_action_authority',false
    )
  );

  return suggestion_id;
end;
$$;

create or replace function private.record_platform_update_review_v1(
  target_suggestion uuid,
  target_review_kind text,
  target_decision text,
  target_reviewer_display_name text,
  target_reviewer_org text default null,
  target_rationale text default '',
  target_evidence_ref text default null,
  target_independence_attested boolean default false
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  caller uuid:=auth.uid();
  caller_role text;
  suggestion public.platform_update_suggestions%rowtype;
  review_id uuid:=gen_random_uuid();
  reviewer_name text;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;

  select * into suggestion
  from public.platform_update_suggestions
  where id=target_suggestion
  for update;
  if not found then raise exception 'Platform update suggestion not found.'; end if;

  caller_role:=private.platform_review_member_role_v1(suggestion.project_id);
  if caller_role is null or caller_role not in ('owner','admin') then
    raise insufficient_privilege using message='Owner or Admin authority is required to record platform review decisions.';
  end if;

  if suggestion.status in ('rejected','superseded') then
    raise exception 'Finalized platform update suggestions cannot be reviewed again.';
  end if;
  if target_review_kind not in ('external','human') then
    raise exception 'Unsupported platform review kind.';
  end if;
  if target_decision not in ('accepted','needs_changes','rejected') then
    raise exception 'Unsupported platform review decision.';
  end if;
  if nullif(btrim(coalesce(target_rationale,'')),'') is null then
    raise exception 'Review rationale is required.';
  end if;

  reviewer_name:=nullif(btrim(coalesce(target_reviewer_display_name,'')),'');
  if target_review_kind='external' then
    if reviewer_name is null
       or nullif(btrim(coalesce(target_reviewer_org,'')),'') is null
       or nullif(btrim(coalesce(target_evidence_ref,'')),'') is null
       or target_independence_attested is not true then
      raise exception 'External review requires named reviewer, organization, evidence reference, and independence attestation.';
    end if;
  else
    if suggestion.external_review_state<>'accepted' then
      raise exception 'Accepted external review evidence is required before human approval.';
    end if;
    reviewer_name:=coalesce(reviewer_name,auth.jwt()->>'email',caller::text);
  end if;

  insert into public.platform_update_reviews(
    id,project_id,suggestion_id,review_kind,decision,reviewer_display_name,reviewer_org,
    reviewer_user_id,recorded_by,rationale,evidence_ref,independence_attested
  )
  values(
    review_id,suggestion.project_id,suggestion.id,target_review_kind,target_decision,
    reviewer_name,nullif(btrim(coalesce(target_reviewer_org,'')),''),
    case when target_review_kind='human' then caller else null end,
    caller,btrim(target_rationale),nullif(btrim(coalesce(target_evidence_ref,'')),''),
    case when target_review_kind='external' then target_independence_attested else false end
  );

  if target_review_kind='external' then
    update public.platform_update_suggestions
    set external_review_state=target_decision,
        human_review_state=case when target_decision='accepted' then human_review_state else 'pending' end,
        status=case
          when target_decision='accepted' then 'human_review'
          when target_decision='rejected' then 'rejected'
          else 'external_review'
        end,
        updated_at=now()
    where id=suggestion.id;
  else
    update public.platform_update_suggestions
    set human_review_state=target_decision,
        status=case
          when target_decision='accepted' then 'release_eligible'
          when target_decision='rejected' then 'rejected'
          else 'human_review'
        end,
        updated_at=now()
    where id=suggestion.id;
  end if;

  insert into public.events(project_id,event_type,actor,payload)
  values(
    suggestion.project_id,'PLATFORM_UPDATE_REVIEW_RECORDED',
    coalesce(auth.jwt()->>'email',caller::text),
    jsonb_build_object(
      'suggestion_id',suggestion.id,'trace_key',suggestion.trace_key,
      'review_kind',target_review_kind,'decision',target_decision,
      'release_eligible',target_review_kind='human' and target_decision='accepted',
      'production_authority',false,'deployment_authority',false,'live_action_authority',false
    )
  );

  return review_id;
end;
$$;

create or replace function private.record_platform_dossier_revision_v1(
  target_project uuid,
  target_document_key text,
  target_title text,
  target_document_kind text,
  target_regulatory_scope text[],
  target_content_hash text,
  target_source_ref text,
  target_source_commit text default null,
  target_change_summary text default '',
  target_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  caller uuid:=auth.uid();
  caller_role text;
  document_row public.platform_dossier_documents%rowtype;
  document_id uuid;
  revision_id uuid:=gen_random_uuid();
  next_revision integer;
  event_kind text;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  caller_role:=private.platform_review_member_role_v1(target_project);
  if caller_role is null or caller_role not in ('owner','admin','operator') then
    raise insufficient_privilege using message='Owner, Admin, or Operator membership is required to record dossier evidence.';
  end if;

  if target_document_kind not in ('controlled_document','policy','architecture','procedure','release_evidence','audit_report','risk_record','regulatory_record','other') then
    raise exception 'Unsupported dossier document kind.';
  end if;
  if nullif(btrim(coalesce(target_document_key,'')),'') is null
     or nullif(btrim(coalesce(target_title,'')),'') is null
     or nullif(btrim(coalesce(target_source_ref,'')),'') is null
     or nullif(btrim(coalesce(target_change_summary,'')),'') is null then
    raise exception 'Document key, title, source reference, and change summary are required.';
  end if;
  if coalesce(target_content_hash,'') !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'Dossier content hash must be a 64-character SHA-256 hex digest.';
  end if;

  select * into document_row
  from public.platform_dossier_documents
  where project_id=target_project and document_key=btrim(target_document_key)
  for update;

  if not found then
    document_id:=gen_random_uuid();
    next_revision:=1;
    event_kind:='DOCUMENT_REGISTERED';
    insert into public.platform_dossier_documents(
      id,project_id,document_key,title,document_kind,regulatory_scope,current_revision,
      current_content_hash,current_source_ref,current_source_commit,updated_by
    )
    values(
      document_id,target_project,btrim(target_document_key),btrim(target_title),target_document_kind,
      coalesce(target_regulatory_scope,'{}'::text[]),next_revision,lower(target_content_hash),
      btrim(target_source_ref),nullif(btrim(coalesce(target_source_commit,'')),''),caller
    );
  else
    document_id:=document_row.id;
    next_revision:=document_row.current_revision+1;
    event_kind:='REVISION_RECORDED';
    update public.platform_dossier_documents
    set title=btrim(target_title),
        document_kind=target_document_kind,
        regulatory_scope=coalesce(target_regulatory_scope,'{}'::text[]),
        current_revision=next_revision,
        current_content_hash=lower(target_content_hash),
        current_source_ref=btrim(target_source_ref),
        current_source_commit=nullif(btrim(coalesce(target_source_commit,'')),''),
        updated_by=caller,
        updated_at=now()
    where id=document_id;
  end if;

  insert into public.platform_dossier_revisions(
    id,project_id,document_id,revision,content_hash,source_ref,source_commit,
    change_summary,metadata,created_by
  )
  values(
    revision_id,target_project,document_id,next_revision,lower(target_content_hash),
    btrim(target_source_ref),nullif(btrim(coalesce(target_source_commit,'')),''),
    btrim(target_change_summary),
    coalesce(target_metadata,'{}'::jsonb)||jsonb_build_object(
      'regulatory_traceability',true,
      'approval_state','evidence_only',
      'production_authority',false
    ),
    caller
  );

  insert into public.platform_dossier_events(
    project_id,document_id,revision_id,event_type,actor,payload
  )
  values(
    target_project,document_id,revision_id,event_kind,
    coalesce(auth.jwt()->>'email',caller::text),
    jsonb_build_object(
      'document_key',btrim(target_document_key),'revision',next_revision,
      'content_hash',lower(target_content_hash),'source_ref',btrim(target_source_ref),
      'source_commit',nullif(btrim(coalesce(target_source_commit,'')),'')
    )
  );

  insert into public.events(project_id,event_type,actor,payload)
  values(
    target_project,'PLATFORM_DOSSIER_REVISION_RECORDED',
    coalesce(auth.jwt()->>'email',caller::text),
    jsonb_build_object(
      'document_id',document_id,'revision_id',revision_id,'document_key',btrim(target_document_key),
      'revision',next_revision,'content_hash',lower(target_content_hash),'regulatory_traceability',true
    )
  );

  return revision_id;
end;
$$;

create or replace function private.create_business_opportunity_v1(
  target_project uuid,
  target_title text,
  target_problem_signal text,
  target_opportunity_hypothesis text,
  target_evidence_refs text[],
  target_currency text,
  target_projection_low numeric,
  target_projection_base numeric,
  target_projection_high numeric,
  target_horizon_months integer,
  target_confidence numeric,
  target_assumptions jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  caller uuid:=auth.uid();
  caller_role text;
  opportunity_id uuid:=gen_random_uuid();
  trace text;
  normalized_currency text:=upper(btrim(coalesce(target_currency,'')));
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  caller_role:=private.platform_review_member_role_v1(target_project);
  if caller_role is null or caller_role not in ('owner','admin','operator') then
    raise insufficient_privilege using message='Owner, Admin, or Operator membership is required to record business opportunities.';
  end if;

  if nullif(btrim(coalesce(target_title,'')),'') is null
     or nullif(btrim(coalesce(target_problem_signal,'')),'') is null
     or nullif(btrim(coalesce(target_opportunity_hypothesis,'')),'') is null then
    raise exception 'Opportunity title, signal, and hypothesis are required.';
  end if;
  if cardinality(coalesce(target_evidence_refs,'{}'::text[]))=0 then
    raise exception 'Business opportunity projections require at least one evidence reference.';
  end if;
  if normalized_currency !~ '^[A-Z]{3}$' then raise exception 'Currency must be a three-letter code.'; end if;
  if target_projection_low<0
     or target_projection_base<target_projection_low
     or target_projection_high<target_projection_base then
    raise exception 'Projection values must satisfy 0 <= low <= base <= high.';
  end if;
  if target_horizon_months<1 or target_horizon_months>120 then
    raise exception 'Projection horizon must be between 1 and 120 months.';
  end if;
  if target_confidence<0 or target_confidence>1 then
    raise exception 'Projection confidence must be between 0 and 1.';
  end if;

  trace:='DN-BIZ-OPP-'||upper(substr(replace(opportunity_id::text,'-',''),1,16));

  insert into public.business_opportunities(
    id,project_id,trace_key,title,problem_signal,opportunity_hypothesis,evidence_refs,
    currency,projection_low,projection_base,projection_high,horizon_months,confidence,
    assumptions,status,created_by
  )
  values(
    opportunity_id,target_project,trace,btrim(target_title),btrim(target_problem_signal),
    btrim(target_opportunity_hypothesis),target_evidence_refs,normalized_currency,
    target_projection_low,target_projection_base,target_projection_high,target_horizon_months,
    target_confidence,coalesce(target_assumptions,'{}'::jsonb),'identified',caller
  );

  insert into public.events(project_id,event_type,actor,payload)
  values(
    target_project,'BUSINESS_OPPORTUNITY_IDENTIFIED',
    coalesce(auth.jwt()->>'email',caller::text),
    jsonb_build_object(
      'opportunity_id',opportunity_id,'trace_key',trace,'currency',normalized_currency,
      'projection_low',target_projection_low,'projection_base',target_projection_base,
      'projection_high',target_projection_high,'horizon_months',target_horizon_months,
      'confidence',target_confidence,'decision_authority',false,'financial_commitment',false
    )
  );

  return opportunity_id;
end;
$$;

create or replace function private.review_business_opportunity_v1(
  target_opportunity uuid,
  target_decision text,
  target_rationale text,
  target_evidence_refs text[] default '{}'::text[]
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  caller uuid:=auth.uid();
  caller_role text;
  opportunity public.business_opportunities%rowtype;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;

  select * into opportunity
  from public.business_opportunities
  where id=target_opportunity
  for update;
  if not found then raise exception 'Business opportunity not found.'; end if;

  caller_role:=private.platform_review_member_role_v1(opportunity.project_id);
  if caller_role is null or caller_role not in ('owner','admin') then
    raise insufficient_privilege using message='Owner or Admin authority is required to review business opportunities.';
  end if;
  if target_decision not in ('needs_evidence','reviewed','dismissed') then
    raise exception 'Unsupported business opportunity review decision.';
  end if;
  if nullif(btrim(coalesce(target_rationale,'')),'') is null then
    raise exception 'Business opportunity review rationale is required.';
  end if;

  update public.business_opportunities
  set status=target_decision,
      review_rationale=btrim(target_rationale),
      evidence_refs=evidence_refs||coalesce(target_evidence_refs,'{}'::text[]),
      reviewed_by=caller,
      reviewed_at=now(),
      updated_at=now()
  where id=opportunity.id;

  insert into public.events(project_id,event_type,actor,payload)
  values(
    opportunity.project_id,'BUSINESS_OPPORTUNITY_REVIEWED',
    coalesce(auth.jwt()->>'email',caller::text),
    jsonb_build_object(
      'opportunity_id',opportunity.id,'trace_key',opportunity.trace_key,
      'decision',target_decision,'decision_authority',false,'financial_commitment',false
    )
  );

  return opportunity.id;
end;
$$;

create or replace function private.get_platform_review_workspace_v1(
  target_project uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  caller uuid:=auth.uid();
  caller_role text;
  suggestions jsonb;
  reviews jsonb;
  dossier_documents jsonb;
  dossier_revisions jsonb;
  opportunities jsonb;
  audit_observations jsonb;
begin
  if caller is null then raise insufficient_privilege using message='Authentication is required.'; end if;
  if not private.has_project_access(target_project) then
    raise insufficient_privilege using message='Project access is required.';
  end if;

  caller_role:=private.platform_review_member_role_v1(target_project);

  select coalesce(jsonb_agg(to_jsonb(s) order by s.updated_at desc),'[]'::jsonb)
  into suggestions
  from (
    select id,trace_key,title,summary,source_kind,source_ref,source_observation_ids,
           risk_class,suggested_change,expected_benefit,external_review_state,
           human_review_state,status,production_authority,deployment_authority,
           live_action_authority,created_by,created_at,updated_at,
           (status='release_eligible' and external_review_state='accepted' and human_review_state='accepted') as release_eligible
    from public.platform_update_suggestions
    where project_id=target_project
    order by updated_at desc
    limit 100
  ) s;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb)
  into reviews
  from (
    select id,suggestion_id,review_kind,decision,reviewer_display_name,reviewer_org,
           reviewer_user_id,recorded_by,rationale,evidence_ref,independence_attested,created_at
    from public.platform_update_reviews
    where project_id=target_project
    order by created_at desc
    limit 200
  ) r;

  select coalesce(jsonb_agg(to_jsonb(d) order by d.updated_at desc),'[]'::jsonb)
  into dossier_documents
  from (
    select id,document_key,title,document_kind,regulatory_scope,current_revision,
           current_content_hash,current_source_ref,current_source_commit,updated_by,updated_at
    from public.platform_dossier_documents
    where project_id=target_project
    order by updated_at desc
    limit 250
  ) d;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb)
  into dossier_revisions
  from (
    select id,document_id,revision,content_hash,source_ref,source_commit,change_summary,
           metadata,created_by,created_at
    from public.platform_dossier_revisions
    where project_id=target_project
    order by created_at desc
    limit 500
  ) r;

  select coalesce(jsonb_agg(to_jsonb(o) order by o.updated_at desc),'[]'::jsonb)
  into opportunities
  from (
    select id,trace_key,title,problem_signal,opportunity_hypothesis,evidence_refs,currency,
           projection_low,projection_base,projection_high,horizon_months,confidence,assumptions,
           status,review_rationale,reviewed_by,reviewed_at,decision_authority,financial_commitment,
           created_by,created_at,updated_at,
           case
             when confidence<0.35 then 'exploratory'
             when confidence<0.65 then 'developing'
             else 'evidence_supported'
           end as projection_indicator,
           case when projection_base=0 then null
             else round(((projection_high-projection_low)/projection_base)*100,1)
           end as projection_spread_pct
    from public.business_opportunities
    where project_id=target_project
    order by updated_at desc
    limit 100
  ) o;

  select coalesce(jsonb_agg(to_jsonb(o) order by o.observed_at desc),'[]'::jsonb)
  into audit_observations
  from (
    select id,trace_key,source_kind,source_ref,summary,severity,confidence,observed_at
    from public.governance_observations
    where project_id=target_project
      and source_kind in ('audit','external_audit')
    order by observed_at desc
    limit 100
  ) o;

  return jsonb_build_object(
    'role',caller_role,
    'can_manage',caller_role in ('owner','admin'),
    'can_contribute',caller_role in ('owner','admin','operator'),
    'suggestions',coalesce(suggestions,'[]'::jsonb),
    'reviews',coalesce(reviews,'[]'::jsonb),
    'dossier_documents',coalesce(dossier_documents,'[]'::jsonb),
    'dossier_revisions',coalesce(dossier_revisions,'[]'::jsonb),
    'opportunities',coalesce(opportunities,'[]'::jsonb),
    'audit_observations',coalesce(audit_observations,'[]'::jsonb),
    'boundaries',jsonb_build_object(
      'external_review_precedes_human_approval',true,
      'release_eligibility_is_production_authority',false,
      'release_eligibility_is_deployment_authority',false,
      'release_eligibility_is_live_action_authority',false,
      'dossier_revision_is_approval',false,
      'projection_is_financial_commitment',false,
      'projection_is_business_decision',false
    )
  );
end;
$$;

-- Public wrappers stay SECURITY INVOKER; privileged work is isolated in private
-- functions that perform auth.uid() and project-role checks.

create or replace function public.create_platform_update_suggestion_v1(
  target_project uuid,
  target_title text,
  target_summary text,
  target_source_kind text,
  target_source_ref text,
  target_source_observation_ids uuid[] default '{}'::uuid[],
  target_risk_class text default 'moderate',
  target_suggested_change jsonb default '{}'::jsonb,
  target_expected_benefit text default null
) returns uuid
language sql
security invoker
set search_path=''
as $$
  select private.create_platform_update_suggestion_v1(
    target_project,target_title,target_summary,target_source_kind,target_source_ref,
    target_source_observation_ids,target_risk_class,target_suggested_change,target_expected_benefit
  );
$$;

create or replace function public.record_platform_update_review_v1(
  target_suggestion uuid,
  target_review_kind text,
  target_decision text,
  target_reviewer_display_name text,
  target_reviewer_org text default null,
  target_rationale text default '',
  target_evidence_ref text default null,
  target_independence_attested boolean default false
) returns uuid
language sql
security invoker
set search_path=''
as $$
  select private.record_platform_update_review_v1(
    target_suggestion,target_review_kind,target_decision,target_reviewer_display_name,
    target_reviewer_org,target_rationale,target_evidence_ref,target_independence_attested
  );
$$;

create or replace function public.record_platform_dossier_revision_v1(
  target_project uuid,
  target_document_key text,
  target_title text,
  target_document_kind text,
  target_regulatory_scope text[],
  target_content_hash text,
  target_source_ref text,
  target_source_commit text default null,
  target_change_summary text default '',
  target_metadata jsonb default '{}'::jsonb
) returns uuid
language sql
security invoker
set search_path=''
as $$
  select private.record_platform_dossier_revision_v1(
    target_project,target_document_key,target_title,target_document_kind,target_regulatory_scope,
    target_content_hash,target_source_ref,target_source_commit,target_change_summary,target_metadata
  );
$$;

create or replace function public.create_business_opportunity_v1(
  target_project uuid,
  target_title text,
  target_problem_signal text,
  target_opportunity_hypothesis text,
  target_evidence_refs text[],
  target_currency text,
  target_projection_low numeric,
  target_projection_base numeric,
  target_projection_high numeric,
  target_horizon_months integer,
  target_confidence numeric,
  target_assumptions jsonb default '{}'::jsonb
) returns uuid
language sql
security invoker
set search_path=''
as $$
  select private.create_business_opportunity_v1(
    target_project,target_title,target_problem_signal,target_opportunity_hypothesis,
    target_evidence_refs,target_currency,target_projection_low,target_projection_base,
    target_projection_high,target_horizon_months,target_confidence,target_assumptions
  );
$$;

create or replace function public.review_business_opportunity_v1(
  target_opportunity uuid,
  target_decision text,
  target_rationale text,
  target_evidence_refs text[] default '{}'::text[]
) returns uuid
language sql
security invoker
set search_path=''
as $$
  select private.review_business_opportunity_v1(
    target_opportunity,target_decision,target_rationale,target_evidence_refs
  );
$$;

create or replace function public.get_platform_review_workspace_v1(
  target_project uuid
) returns jsonb
language sql
stable
security invoker
set search_path=''
as $$
  select private.get_platform_review_workspace_v1(target_project);
$$;

alter table public.platform_update_suggestions enable row level security;
alter table public.platform_update_reviews enable row level security;
alter table public.platform_dossier_documents enable row level security;
alter table public.platform_dossier_revisions enable row level security;
alter table public.platform_dossier_events enable row level security;
alter table public.business_opportunities enable row level security;

drop policy if exists platform_update_suggestions_select on public.platform_update_suggestions;
create policy platform_update_suggestions_select
on public.platform_update_suggestions for select to authenticated
using (private.has_project_access(project_id));

drop policy if exists platform_update_reviews_select on public.platform_update_reviews;
create policy platform_update_reviews_select
on public.platform_update_reviews for select to authenticated
using (private.has_project_access(project_id));

drop policy if exists platform_dossier_documents_select on public.platform_dossier_documents;
create policy platform_dossier_documents_select
on public.platform_dossier_documents for select to authenticated
using (private.has_project_access(project_id));

drop policy if exists platform_dossier_revisions_select on public.platform_dossier_revisions;
create policy platform_dossier_revisions_select
on public.platform_dossier_revisions for select to authenticated
using (private.has_project_access(project_id));

drop policy if exists platform_dossier_events_select on public.platform_dossier_events;
create policy platform_dossier_events_select
on public.platform_dossier_events for select to authenticated
using (private.has_project_access(project_id));

drop policy if exists business_opportunities_select on public.business_opportunities;
create policy business_opportunities_select
on public.business_opportunities for select to authenticated
using (private.has_project_access(project_id));

revoke all on table public.platform_update_suggestions from public,anon,authenticated;
revoke all on table public.platform_update_reviews from public,anon,authenticated;
revoke all on table public.platform_dossier_documents from public,anon,authenticated;
revoke all on table public.platform_dossier_revisions from public,anon,authenticated;
revoke all on table public.platform_dossier_events from public,anon,authenticated;
revoke all on table public.business_opportunities from public,anon,authenticated;

grant select on table public.platform_update_suggestions to authenticated;
grant select on table public.platform_update_reviews to authenticated;
grant select on table public.platform_dossier_documents to authenticated;
grant select on table public.platform_dossier_revisions to authenticated;
grant select on table public.platform_dossier_events to authenticated;
grant select on table public.business_opportunities to authenticated;

revoke execute on function private.platform_review_member_role_v1(uuid) from public,anon;
revoke execute on function private.create_platform_update_suggestion_v1(uuid,text,text,text,text,uuid[],text,jsonb,text) from public,anon;
revoke execute on function private.record_platform_update_review_v1(uuid,text,text,text,text,text,text,boolean) from public,anon;
revoke execute on function private.record_platform_dossier_revision_v1(uuid,text,text,text,text[],text,text,text,text,jsonb) from public,anon;
revoke execute on function private.create_business_opportunity_v1(uuid,text,text,text,text[],text,numeric,numeric,numeric,integer,numeric,jsonb) from public,anon;
revoke execute on function private.review_business_opportunity_v1(uuid,text,text,text[]) from public,anon;
revoke execute on function private.get_platform_review_workspace_v1(uuid) from public,anon;

grant execute on function private.platform_review_member_role_v1(uuid) to authenticated;
grant execute on function private.create_platform_update_suggestion_v1(uuid,text,text,text,text,uuid[],text,jsonb,text) to authenticated;
grant execute on function private.record_platform_update_review_v1(uuid,text,text,text,text,text,text,boolean) to authenticated;
grant execute on function private.record_platform_dossier_revision_v1(uuid,text,text,text,text[],text,text,text,text,jsonb) to authenticated;
grant execute on function private.create_business_opportunity_v1(uuid,text,text,text,text[],text,numeric,numeric,numeric,integer,numeric,jsonb) to authenticated;
grant execute on function private.review_business_opportunity_v1(uuid,text,text,text[]) to authenticated;
grant execute on function private.get_platform_review_workspace_v1(uuid) to authenticated;

revoke execute on function public.create_platform_update_suggestion_v1(uuid,text,text,text,text,uuid[],text,jsonb,text) from public,anon;
revoke execute on function public.record_platform_update_review_v1(uuid,text,text,text,text,text,text,boolean) from public,anon;
revoke execute on function public.record_platform_dossier_revision_v1(uuid,text,text,text,text[],text,text,text,text,jsonb) from public,anon;
revoke execute on function public.create_business_opportunity_v1(uuid,text,text,text,text[],text,numeric,numeric,numeric,integer,numeric,jsonb) from public,anon;
revoke execute on function public.review_business_opportunity_v1(uuid,text,text,text[]) from public,anon;
revoke execute on function public.get_platform_review_workspace_v1(uuid) from public,anon;

grant execute on function public.create_platform_update_suggestion_v1(uuid,text,text,text,text,uuid[],text,jsonb,text) to authenticated;
grant execute on function public.record_platform_update_review_v1(uuid,text,text,text,text,text,text,boolean) to authenticated;
grant execute on function public.record_platform_dossier_revision_v1(uuid,text,text,text,text[],text,text,text,text,jsonb) to authenticated;
grant execute on function public.create_business_opportunity_v1(uuid,text,text,text,text[],text,numeric,numeric,numeric,integer,numeric,jsonb) to authenticated;
grant execute on function public.review_business_opportunity_v1(uuid,text,text,text[]) to authenticated;
grant execute on function public.get_platform_review_workspace_v1(uuid) to authenticated;

-- Make dossier state observable to authorized clients through Supabase Realtime.
do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists(
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename='platform_dossier_documents'
    ) then execute 'alter publication supabase_realtime add table public.platform_dossier_documents'; end if;
    if not exists(
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename='platform_dossier_revisions'
    ) then execute 'alter publication supabase_realtime add table public.platform_dossier_revisions'; end if;
    if not exists(
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename='platform_dossier_events'
    ) then execute 'alter publication supabase_realtime add table public.platform_dossier_events'; end if;
  end if;
end
$$;

-- Extend the existing control-evidence catalog without claiming conformity.
insert into public.governance_control_catalog(
  project_id,control_key,version,title,purpose,control_kind,standard_refs,
  implementation_refs,rationale,metadata,created_by_kind
)
select
  p.id,'CGO-UPD-001',1,'Platform update review firewall',
  'Require external review evidence and authenticated human review before a platform update can become release-eligible.',
  'release','{}'::text[],
  array['docs/PLATFORM_REVIEW_DOSSIER_OPPORTUNITY.md','supabase/migrations/20260929235500_platform_review_dossier_opportunity_v1.sql'],
  'Release eligibility is evidence state only and never production, deployment, execution, or live-action authority.',
  jsonb_build_object('conformity_claim',false,'deployment_authority',false,'live_action_authority',false),
  'release'
from public.projects p
where not exists(
  select 1 from public.governance_control_catalog c
  where c.project_id=p.id and c.control_key='CGO-UPD-001' and c.active=true
);

insert into public.governance_control_catalog(
  project_id,control_key,version,title,purpose,control_kind,standard_refs,
  implementation_refs,rationale,metadata,created_by_kind
)
select
  p.id,'CGO-DOS-001',1,'Platform dossier traceability',
  'Version controlled platform documents with SHA-256 provenance, append-only revisions, and realtime review visibility.',
  'evidence','{}'::text[],
  array['docs/PLATFORM_REVIEW_DOSSIER_OPPORTUNITY.md','scripts/write-platform-dossier.mjs'],
  'Dossier revisions support regulatory review and provenance; they do not establish approval or conformity.',
  jsonb_build_object('conformity_claim',false,'regulatory_traceability',true,'approval_effect',false),
  'release'
from public.projects p
where not exists(
  select 1 from public.governance_control_catalog c
  where c.project_id=p.id and c.control_key='CGO-DOS-001' and c.active=true
);

insert into public.governance_control_catalog(
  project_id,control_key,version,title,purpose,control_kind,standard_refs,
  implementation_refs,rationale,metadata,created_by_kind
)
select
  p.id,'CGO-OPP-001',1,'Evidence-based opportunity projection',
  'Keep business opportunity projections bounded by evidence references, explicit ranges, assumptions, horizon, and confidence.',
  'risk','{}'::text[],
  array['docs/PLATFORM_REVIEW_DOSSIER_OPPORTUNITY.md','supabase/migrations/20260929235500_platform_review_dossier_opportunity_v1.sql'],
  'Projection indicators are decision-support evidence only; they are not financial commitments or autonomous business decisions.',
  jsonb_build_object('conformity_claim',false,'financial_commitment',false,'decision_authority',false),
  'release'
from public.projects p
where not exists(
  select 1 from public.governance_control_catalog c
  where c.project_id=p.id and c.control_key='CGO-OPP-001' and c.active=true
);

commit;

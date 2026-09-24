\set ON_ERROR_STOP on

do $$
declare
  missing text[];
begin
  select array_agg(required_name)
  into missing
  from unnest(array[
    'ai_sessions',
    'ai_intake_events',
    'ai_reasoning_envelopes',
    'ai_trend_clusters',
    'ai_trend_evidence',
    'ai_learning_candidates',
    'ai_candidate_evidence',
    'ai_validation_runs',
    'ai_certification_decisions',
    'ai_memory_supersessions'
  ]) required_name
  where to_regclass('public.' || required_name) is null;

  if missing is not null then
    raise exception 'missing DataNest AI staging tables: %', missing;
  end if;
end $$;

do $$
declare
  unprotected text[];
begin
  select array_agg(c.relname)
  into unprotected
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relname like 'ai_%'
    and c.relname in (
      'ai_sessions','ai_intake_events','ai_reasoning_envelopes',
      'ai_trend_clusters','ai_trend_evidence','ai_learning_candidates',
      'ai_candidate_evidence','ai_validation_runs','ai_certification_decisions',
      'ai_memory_supersessions'
    )
    and not c.relrowsecurity;

  if unprotected is not null then
    raise exception 'RLS disabled on staging tables: %', unprotected;
  end if;
end $$;

do $$
begin
  if has_table_privilege('authenticated','public.ai_intake_events','INSERT')
     or has_table_privilege('anon','public.ai_intake_events','SELECT') then
    raise exception 'browser roles must not have direct staging-table privileges';
  end if;
end $$;


do $$
begin
  if to_regclass('supabase_migrations.schema_migrations') is null then
    raise exception 'Supabase migration history is missing';
  end if;

  if not exists (
    select 1
    from supabase_migrations.schema_migrations
    where name='register_datanest_ai_staging_baseline'
  ) then
    raise exception 'governed staging baseline migration is not registered';
  end if;
end $$;


do $$
declare
  secured_count integer;
begin
  select count(*) into secured_count
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.prosecdef
    and p.oid in (
      'public.accept_pending_job_invites()'::regprocedure,
      'public.get_project_dashboard_summary(uuid)'::regprocedure,
      'public.start_external_ai_sidebar_session(uuid,text,text)'::regprocedure
    );

  if secured_count <> 3 then
    raise exception 'authenticated public/private gateway hardening is incomplete: %/3 secured', secured_count;
  end if;

  if has_schema_privilege('authenticated','private','USAGE') then
    raise exception 'authenticated must not receive broad USAGE on the private schema';
  end if;
end $$;

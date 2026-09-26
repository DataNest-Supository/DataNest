\set ON_ERROR_STOP on
begin;

do $$
begin
  if to_regclass('public.datanest_application_events') is null then
    raise exception 'missing public.datanest_application_events';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='certified_memory' and column_name='context' and data_type='jsonb'
  ) then raise exception 'missing certified_memory.context'; end if;
  if has_table_privilege('authenticated','public.datanest_application_events','INSERT')
     or has_table_privilege('authenticated','public.datanest_application_events','UPDATE') then
    raise exception 'authenticated must not write datanest_application_events directly';
  end if;
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='get_certified_intelligence_v1'
  ) then raise exception 'missing get_certified_intelligence_v1'; end if;
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='service_promote_certified_memory_v2'
  ) then raise exception 'missing service_promote_certified_memory_v2'; end if;
end $$;

do $$
declare d text;
begin
  select pg_get_constraintdef(c.oid) into d
  from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
  where n.nspname='public' and t.relname='datanest_application_events' and c.conname='datanest_application_events_learning_state_check';
  if d is null or d not like '%excluded%' or d not like '%pending%' or d not like '%staged%' or d not like '%failed%' then
    raise exception 'learning_state constraint missing canonical values: %', d;
  end if;
  select pg_get_constraintdef(c.oid) into d
  from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
  where n.nspname='public' and t.relname='datanest_application_events' and c.conname='datanest_application_events_outcome_check';
  if d is null or d not like '%accepted%' or d not like '%rejected%' or d not like '%succeeded%' or d not like '%failed%' or d not like '%superseded%' or d not like '%unknown%' then
    raise exception 'outcome constraint missing canonical values: %', d;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and t.relname='datanest_application_events' and c.contype='u'
      and pg_get_constraintdef(c.oid) like '%trace_id%'
  ) then raise exception 'trace_id unique constraint missing'; end if;
  if not exists (
    select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and t.relname='datanest_application_events' and c.contype='u'
      and pg_get_constraintdef(c.oid) like '%project_id, application_key, client_request_id%'
  ) then raise exception 'idempotency unique constraint missing'; end if;
end $$;

do $$
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text, true);
  begin
    perform public.get_certified_intelligence_v1(gen_random_uuid(),gen_random_uuid(),'product_lab','product_test_run.recorded','product_test_run','x',10);
    raise exception 'unauthorized retrieval unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end $$;

do $$
declare
  project_id uuid;
  user_id uuid;
  job_id uuid;
  exact_id uuid := gen_random_uuid();
  generic_id uuid := gen_random_uuid();
  result jsonb;
  first_id uuid;
begin
  select p.id,pm.user_id,j.id into project_id,user_id,job_id
  from public.projects p
  join public.project_members pm on pm.project_id=p.id and pm.status='active'
  join lateral (select jobs.id from public.jobs where public.jobs.project_id=p.id order by public.jobs.job_number limit 1) j on true
  limit 1;
  if project_id is null then raise exception 'fixture project/member/job required'; end if;

  insert into public.certified_memory(
    id,project_id,normalized_knowledge,category,effective_version,certification_id,
    source_job_ids,source_trace_ids,certification_class,confidence,policy_version,
    content_hash,context,active,promoted_at
  ) values
  (generic_id,project_id,'generic fixture memory','knowledge',9000001,gen_random_uuid(),array[job_id],array['DN-TEST-GENERIC'],'owner',0.9,'test-v1',encode(digest(gen_random_uuid()::text,'sha256'),'hex'),'{}',true,now()-interval '1 minute'),
  (exact_id,project_id,'exact fixture memory','knowledge',9000002,gen_random_uuid(),array[job_id],array['DN-TEST-EXACT'],'owner',0.9,'test-v1',encode(digest(gen_random_uuid()::text,'sha256'),'hex'),jsonb_build_object('application_keys',jsonb_build_array('product_lab'),'actions',jsonb_build_array('product_test_run.recorded'),'entity_types',jsonb_build_array('product_test_run'),'entity_ids',jsonb_build_array('run-123')),true,now()-interval '2 minutes');

  perform set_config('request.jwt.claims',jsonb_build_object('sub',user_id,'role','authenticated')::text,true);
  result := public.get_certified_intelligence_v1(project_id,job_id,'product_lab','product_test_run.recorded','product_test_run','run-123',10);
  first_id := nullif(result->'items'->0->>'id','')::uuid;
  if first_id is distinct from exact_id then raise exception 'context ranking did not return exact match first: %',result; end if;

  result := public.get_certified_intelligence_v1(project_id,job_id,'no_match','no_match','no_match','no_match',10);
  if jsonb_array_length(result->'items') < 2 then raise exception 'fallback omitted generic active memory: %',result; end if;
end $$;

do $$
declare
  project_id uuid;
  memory_a uuid;
  memory_b uuid;
  h text := encode(digest(gen_random_uuid()::text,'sha256'),'hex');
begin
  select projects.id into project_id from public.projects order by public.projects.created_at limit 1;
  perform set_config('request.jwt.claims',jsonb_build_object('role','service_role')::text,true);
  memory_a := public.service_promote_certified_memory_v2(project_id,'idempotency fixture','knowledge',gen_random_uuid(),'{}','{}','automation',0.9,'test-v1',h,'{}',null);
  memory_b := public.service_promote_certified_memory_v2(project_id,'idempotency fixture changed copy','knowledge',gen_random_uuid(),'{}','{}','automation',0.9,'test-v1',h,jsonb_build_object('application_keys',jsonb_build_array('product_lab')),null);
  if memory_a is distinct from memory_b then raise exception 'promotion v2 is not idempotent'; end if;
end $$;

do $$
declare q text;
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and tablename='datanest_application_events'
      and indexdef like '%(actor_user_id)%'
  ) then raise exception 'actor_user_id covering index missing'; end if;

  select qual into q from pg_policies
  where schemaname='public' and tablename='datanest_application_events'
    and policyname='datanest_application_events_project_read';
  if q is null or q like '%auth.uid() IS NOT NULL%' then
    raise exception 'RLS policy must initplan auth.uid(): %',q;
  end if;
end $$;

rollback;

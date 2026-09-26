\set ON_ERROR_STOP on
begin;

do $$
declare source_check text;
begin
  select pg_get_constraintdef(c.oid) into source_check
  from pg_constraint c
  join pg_class t on t.oid=c.conrelid
  join pg_namespace n on n.oid=t.relnamespace
  where n.nspname='public' and t.relname='ai_intake_events' and c.conname='ai_intake_events_source_type_check';
  if source_check is null or source_check not like '%application%' then
    raise exception 'ai_intake_events does not allow application source: %',source_check;
  end if;
  if source_check not like '%human%' or source_check not like '%ai_companion%' or source_check not like '%datanest_ai%' or source_check not like '%legacy_import%' or source_check not like '%file_upload%' or source_check not like '%document_evidence%' then
    raise exception 'existing source types were not preserved: %',source_check;
  end if;
end $$;

do $$
declare promotion_check text;
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='ai_learning_candidates' and column_name='promotion_state' and column_default like '%not_ready%') then
    raise exception 'missing promotion_state default not_ready';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='ai_learning_candidates' and column_name='promoted_memory_id' and data_type='uuid') then
    raise exception 'missing promoted_memory_id';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='ai_learning_candidates' and column_name='promoted_at' and data_type='timestamp with time zone') then
    raise exception 'missing promoted_at';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='ai_learning_candidates' and column_name='promotion_error' and data_type='text') then
    raise exception 'missing promotion_error';
  end if;
  select pg_get_constraintdef(c.oid) into promotion_check
  from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
  where n.nspname='public' and t.relname='ai_learning_candidates' and c.conname='ai_learning_candidates_promotion_state_check';
  if promotion_check is null or promotion_check not like '%not_ready%' or promotion_check not like '%ready%' or promotion_check not like '%promoting%' or promotion_check not like '%promoted%' or promotion_check not like '%failed%' then
    raise exception 'promotion_state check incomplete: %',promotion_check;
  end if;
  select pg_get_constraintdef(c.oid) into promotion_check
  from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
  where n.nspname='public' and t.relname='ai_learning_candidates' and c.conname='ai_learning_candidates_promoted_requires_memory_check';
  if promotion_check is null or promotion_check not like '%promoted_memory_id IS NOT NULL%' or promotion_check not like '%promoted_at IS NOT NULL%' then
    raise exception 'promoted lifecycle integrity check missing: %',promotion_check;
  end if;
end $$;

do $$
begin
  if to_regclass('public.datanest_application_events') is null then raise exception 'staging mirror missing datanest_application_events'; end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='certified_memory' and column_name='context' and data_type='jsonb') then raise exception 'staging mirror missing certified_memory.context'; end if;
end $$;

rollback;

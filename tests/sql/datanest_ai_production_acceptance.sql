\set ON_ERROR_STOP on

do $$
begin
  if to_regclass('public.certified_memory') is null then
    raise exception 'certified_memory table missing';
  end if;
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='certified_memory' and c.relrowsecurity
  ) then
    raise exception 'certified_memory RLS must be enabled';
  end if;
end $$;

do $$
declare
  active_triggers integer;
begin
  select count(*) into active_triggers
  from pg_trigger t
  join pg_class c on c.oid=t.tgrelid
  where not t.tgisinternal
    and t.tgname in (
      'track_development_contribution',
      'track_dispatched_prompt_contribution',
      'track_job_input_contribution',
      'track_product_test_contribution'
    );
  if active_triggers <> 0 then
    raise exception 'legacy contribution triggers remain active';
  end if;
end $$;

do $$
begin
  if to_regprocedure('public.begin_datanest_ai_request(uuid,uuid,text)') is null then
    raise exception 'begin_datanest_ai_request missing';
  end if;
  if to_regprocedure('public.get_certified_memory_context(uuid,uuid,integer)') is null then
    raise exception 'get_certified_memory_context missing';
  end if;
  if to_regprocedure('public.mark_external_ai_session_staged(uuid,uuid,text)') is null then
    raise exception 'mark_external_ai_session_staged missing';
  end if;
  if to_regprocedure('public.service_promote_certified_memory(uuid,text,text,uuid,uuid[],text[],text,numeric,text,text,uuid)') is null then
    raise exception 'service_promote_certified_memory missing';
  end if;
end $$;

do $$
declare
  finish_def text;
  reconcile_def text;
begin
  select pg_get_functiondef('public.service_finish_ai_request(uuid,text,bigint,bigint,bigint,bigint,bigint,text,text)'::regprocedure)
    into finish_def;
  select pg_get_functiondef('private.reconcile_unknown_ai_request(uuid,text,bigint,bigint,bigint,text)'::regprocedure)
    into reconcile_def;
  if finish_def ilike '%insert_contribution%' or reconcile_def ilike '%insert_contribution%' then
    raise exception 'AI usage paths still create contribution rows';
  end if;
end $$;

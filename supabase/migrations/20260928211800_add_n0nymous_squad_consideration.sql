-- N0NYMOUS SQUAD consideration layer.
-- Adds an anonymous, evidence-based consideration signal without exposing contributor identity.

alter function private.get_project_impact_dashboard_v1(uuid) rename to get_project_impact_dashboard_base_v1;
revoke all on function private.get_project_impact_dashboard_base_v1(uuid) from public;
grant execute on function private.get_project_impact_dashboard_base_v1(uuid) to authenticated;

create or replace function private.get_n0nymous_squad_consideration_v1(target_project uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,private
as $fn$
declare
  uid uuid := auth.uid();
  is_admin boolean;
  result jsonb;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if not private.has_project_role(target_project,array['owner','admin','operator','viewer']) then
    raise exception 'Project access denied';
  end if;
  is_admin := private.has_project_role(target_project,array['owner','admin']);

  with scored as (
    select l.*,
      greatest(0,least(100,
        20
        + case
            when coalesce((l.metadata->>'evidence_confidence')::numeric,
                          case when l.verified then 1 else 0 end) <= 1
            then coalesce((l.metadata->>'evidence_confidence')::numeric,
                          case when l.verified then 1 else 0 end) * 50
            else least(50,coalesce((l.metadata->>'evidence_confidence')::numeric,0) * 0.5)
          end
        + case when l.verified then 15 else 0 end
        + case when l.scoring_state is not null and l.scoring_state <> 'unscored' then 15 else 0 end
      )) as quality_score,
      case lower(coalesce(l.certification_state,l.lifecycle_state,'intake'))
        when 'certified' then 100 when 'certification_review' then 90
        when 'stress_tested' then 85 when 'validated' then 75 when 'verified' then 60
        when 'audited' then 40 when 'needs_evidence' then 25 when 'rejected' then 0 else 20
      end as acceptance_score
    from public.contribution_ledger l
    where l.project_id=target_project and l.user_id is not null
      and (is_admin or l.user_id=uid)
  ), enriched as (
    select *,
      round((quality_score*acceptance_score/100.0),2) as impact_score,
      case when lower(coalesce(lifecycle_state,'')) in
        ('verified','validated','stress_tested','certification_review','certified')
        then greatest(0,coalesce(points,0)) else 0 end as points_awarded
    from scored
  ), self as (
    select count(*)::int input_count, coalesce(sum(points_awarded),0)::numeric total_points,
      round(coalesce(avg(quality_score),0),2) avg_quality,
      round(coalesce(avg(impact_score),0),2) avg_impact,
      count(*) filter(where lower(coalesce(certification_state,''))='certified')::int certified_inputs
    from enriched where user_id=uid
  ), candidates as (
    select left(md5(user_id::text||target_project::text||'n0nymous-v1'),10) anonymous_id,
      count(*)::int input_count, coalesce(sum(points_awarded),0)::numeric total_points,
      round(coalesce(avg(quality_score),0),2) avg_quality,
      round(coalesce(avg(impact_score),0),2) avg_impact,
      count(*) filter(where lower(coalesce(certification_state,''))='certified')::int certified_inputs
    from enriched group by user_id
    having coalesce(sum(points_awarded),0) >= 100
       and count(*) filter(where lower(coalesce(certification_state,''))='certified') >= 1
       and coalesce(avg(impact_score),0) >= 60
  )
  select jsonb_build_object(
    'status','consideration_only','criteria_version','n0nymous-v1',
    'thresholds',jsonb_build_object('minimum_points',100,'minimum_certified_inputs',1,'minimum_average_impact',60),
    'self',(select jsonb_build_object(
      'eligible_for_consideration',total_points >= 100 and certified_inputs >= 1 and avg_impact >= 60,
      'input_count',input_count,'total_points',total_points,'avg_quality',avg_quality,
      'avg_impact',avg_impact,'certified_inputs',certified_inputs) from self),
    'candidate_pool',case when is_admin then coalesce(
      (select jsonb_agg(jsonb_build_object(
        'anonymous_id',anonymous_id,'input_count',input_count,'total_points',total_points,
        'avg_quality',avg_quality,'avg_impact',avg_impact,'certified_inputs',certified_inputs)
        order by total_points desc) from candidates),'[]'::jsonb) else '[]'::jsonb end
  ) into result;
  return result;
end;
$fn$;

revoke all on function private.get_n0nymous_squad_consideration_v1(uuid) from public,authenticated;

create or replace function private.get_project_impact_dashboard_v1(target_project uuid)
returns jsonb language plpgsql security definer set search_path=public,private
as $fn$
declare result jsonb;
begin
  result := private.get_project_impact_dashboard_base_v1(target_project);
  result := result || jsonb_build_object(
    'n0nymous_squad',
    private.get_n0nymous_squad_consideration_v1(target_project)
  );
  return result;
end;
$fn$;

revoke all on function private.get_project_impact_dashboard_v1(uuid) from public;
grant execute on function private.get_project_impact_dashboard_v1(uuid) to authenticated;

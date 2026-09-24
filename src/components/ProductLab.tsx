"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Surface={
  id:string;project_id:string;name:string;url:string;environment:string;status:string;
  description:string|null;build_commit:string|null;release_id:string|null;build_label:string|null;updated_at:string
};
type TestCase={
  id:string;project_id:string;surface_id:string|null;title:string;description:string|null;
  expected_result:string;status:string;version:number;created_by:string;created_at:string
};
type TestRun={
  id:string;project_id:string;job_id:string|null;surface_id:string|null;test_case_id:string;
  tester_user_id:string;result:"pass"|"fail"|"blocked";notes:string|null;evidence_url:string|null;
  request_id:string|null;test_case_version:number|null;surface_url_snapshot:string|null;
  environment_snapshot:string|null;build_commit:string|null;release_id:string|null;
  browser_user_agent:string|null;viewport:Record<string,unknown>;created_at:string
};

function formatDate(value:string|null){
  if(!value)return "—";
  return new Intl.DateTimeFormat(undefined,{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
}
function shortCommit(value:string|null){
  if(!value)return "unversioned";
  return value.length>12?value.slice(0,12):value;
}

export default function ProductLab({
  projectId,currentUserId,canOperate
}:{
  projectId:string;
  currentUserId:string;
  canOperate:boolean;
}){
  const [surfaces,setSurfaces]=useState<Surface[]>([]);
  const [cases,setCases]=useState<TestCase[]>([]);
  const [runs,setRuns]=useState<TestRun[]>([]);
  const [selectedSurfaceId,setSelectedSurfaceId]=useState("");
  const [previewKey,setPreviewKey]=useState(0);

  const [surfaceName,setSurfaceName]=useState("Product Preview");
  const [surfaceUrl,setSurfaceUrl]=useState("");
  const [surfaceEnv,setSurfaceEnv]=useState("preview");
  const [surfaceBuild,setSurfaceBuild]=useState("");
  const [surfaceRelease,setSurfaceRelease]=useState("");

  const [caseTitle,setCaseTitle]=useState("");
  const [caseExpected,setCaseExpected]=useState("");
  const [caseDescription,setCaseDescription]=useState("");
  const [runNotes,setRunNotes]=useState<Record<string,string>>({});
  const [evidenceUrls,setEvidenceUrls]=useState<Record<string,string>>({});

  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [realtime,setRealtime]=useState("connecting");

  const load=useCallback(async()=>{
    const supabase=getSupabase();
    if(!supabase)return;

    const [s,c,r]=await Promise.all([
      supabase.from("product_surfaces")
        .select("id,project_id,name,url,environment,status,description,build_commit,release_id,build_label,updated_at")
        .eq("project_id",projectId).neq("status","archived").order("updated_at",{ascending:false}),
      supabase.from("product_test_cases")
        .select("id,project_id,surface_id,title,description,expected_result,status,version,created_by,created_at")
        .eq("project_id",projectId).eq("status","active").order("created_at",{ascending:false}),
      supabase.from("product_test_runs")
        .select("id,project_id,job_id,surface_id,test_case_id,tester_user_id,result,notes,evidence_url,request_id,test_case_version,surface_url_snapshot,environment_snapshot,build_commit,release_id,browser_user_agent,viewport,created_at")
        .eq("project_id",projectId).order("created_at",{ascending:false}).limit(150)
    ]);

    const first=s.error||c.error||r.error;
    if(first){setError(first.message);return;}

    setSurfaces((s.data||[]) as Surface[]);
    setCases((c.data||[]) as TestCase[]);
    setRuns((r.data||[]) as TestRun[]);
    const next=(s.data||[]) as Surface[];
    setSelectedSurfaceId(current=>current||next[0]?.id||"");
  },[projectId]);

  useEffect(()=>{void load()},[load]);

  useEffect(()=>{
    const supabase=getSupabase();
    if(!supabase)return;
    const refresh=()=>void load();
    const channel=supabase.channel("product-lab-"+projectId)
      .on("postgres_changes",{event:"*",schema:"public",table:"product_surfaces",filter:"project_id=eq."+projectId},refresh)
      .on("postgres_changes",{event:"*",schema:"public",table:"product_test_cases",filter:"project_id=eq."+projectId},refresh)
      .on("postgres_changes",{event:"*",schema:"public",table:"product_test_runs",filter:"project_id=eq."+projectId},refresh)
      .subscribe(status=>setRealtime(status==="SUBSCRIBED"?"live":status.toLowerCase()));
    return()=>{void supabase.removeChannel(channel)};
  },[projectId,load]);

  const selected=surfaces.find(s=>s.id===selectedSurfaceId)||null;
  const visibleCases=cases.filter(c=>c.surface_id===selectedSurfaceId);
  const metrics=useMemo(()=>{
    const relevant=runs.filter(r=>!selectedSurfaceId||r.surface_id===selectedSurfaceId);
    return {
      total:relevant.length,
      pass:relevant.filter(r=>r.result==="pass").length,
      fail:relevant.filter(r=>r.result==="fail").length,
      blocked:relevant.filter(r=>r.result==="blocked").length
    };
  },[runs,selectedSurfaceId]);

  async function addSurface(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();
    if(!supabase||!canOperate)return;
    if(!surfaceBuild.trim()){setError("A build commit or immutable build identifier is required.");return;}

    const {data,error:insertError}=await supabase.from("product_surfaces").insert({
      project_id:projectId,name:surfaceName.trim(),url:surfaceUrl.trim(),environment:surfaceEnv,
      status:"active",build_commit:surfaceBuild.trim(),release_id:surfaceRelease.trim()||null,
      build_label:surfaceRelease.trim()||shortCommit(surfaceBuild.trim()),
      created_by:currentUserId,updated_by:currentUserId
    }).select("id").single();

    if(insertError){setError(insertError.message);return;}
    setSurfaceUrl("");setSurfaceBuild("");setSurfaceRelease("");
    setNotice("Product surface added with immutable build identity.");
    await load();
    if(data?.id)setSelectedSurfaceId(data.id);
  }

  async function addTestCase(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();
    if(!supabase||!caseTitle.trim()||!caseExpected.trim())return;
    if(!selectedSurfaceId){setError("Select a versioned product surface before adding a test case.");return;}

    const {error:insertError}=await supabase.from("product_test_cases").insert({
      project_id:projectId,surface_id:selectedSurfaceId,title:caseTitle.trim(),
      description:caseDescription.trim()||null,expected_result:caseExpected.trim(),
      status:"active",created_by:currentUserId
    });

    if(insertError){setError(insertError.message);return;}
    setCaseTitle("");setCaseExpected("");setCaseDescription("");
    setNotice("Version 1 of the test case was added.");
    await load();
  }

  async function recordRun(testCase:TestCase,result:"pass"|"fail"|"blocked"){
    const supabase=getSupabase();
    if(!supabase)return;

    const surface=surfaces.find(s=>s.id===(testCase.surface_id||selectedSurfaceId));
    if(!surface){setError("A versioned product surface is required for this test.");return;}

    if(surface.environment==="production"){
      const confirmed=window.confirm(
        "PRODUCTION TEST\n\nYou are about to record a test against the production surface at build "+shortCommit(surface.build_commit)+". Confirm only if this test is safe and non-destructive."
      );
      if(!confirmed)return;
    }

    const requestId=crypto.randomUUID();
    const viewport={
      width:window.innerWidth,
      height:window.innerHeight,
      devicePixelRatio:window.devicePixelRatio
    };

    const {error:insertError}=await supabase.from("product_test_runs").insert({
      project_id:projectId,
      surface_id:surface.id,
      test_case_id:testCase.id,
      tester_user_id:currentUserId,
      result,
      notes:runNotes[testCase.id]?.trim()||null,
      evidence_url:evidenceUrls[testCase.id]?.trim()||null,
      request_id:requestId,
      browser_user_agent:navigator.userAgent,
      viewport
    });

    if(insertError){setError(insertError.message);return;}

    setRunNotes(current=>({...current,[testCase.id]:""}));
    setEvidenceUrls(current=>({...current,[testCase.id]:""}));
    setNotice("Test evidence recorded for "+shortCommit(surface.build_commit)+". Test evidence is recorded once per tester/test-version/build.");
    await load();
  }

  function latestRun(caseId:string){
    return runs.find(r=>r.test_case_id===caseId)||null;
  }

  return <div className="productLab">
    <section className="sectionIntro">
      <p className="eyebrow">PRODUCT LAB</p>
      <h2>Versioned Live Product Display & Testing</h2>
      <p>Every result is tied to a test-case version and product build. Repeated runs remain visible as versioned validation evidence.</p>
    </section>

    {notice&&<div className="notice goodNotice">{notice}</div>}
    {error&&<div className="notice errorNotice" role="alert">{error}</div>}

    <section className="metricGrid">
      <article className="metricCard"><span>Surfaces</span><strong>{surfaces.length}</strong><small>Versioned preview/staging/production</small></article>
      <article className="metricCard"><span>Tests</span><strong>{metrics.total}</strong><small>{visibleCases.length} active cases</small></article>
      <article className="metricCard"><span>Pass</span><strong>{metrics.pass}</strong><small>Recorded results</small></article>
      <article className="metricCard"><span>Fail / blocked</span><strong>{metrics.fail+metrics.blocked}</strong><small>Needs development attention</small></article>
      <article className="metricCard"><span>Realtime</span><strong className="realtimeWord">{realtime}</strong><small>Scoped project change feed</small></article>
    </section>

    <section className="productLabGrid">
      <div className="panel productPreviewPanel">
        <div className="panelHead">
          <div>
            <p className="eyebrow">LIVE SURFACE</p>
            <h3>{selected?.name||"No product surface"}</h3>
            {selected&&<div className="manifestMeta">
              <span className={selected.environment==="production"?"productionTag":""}>{selected.environment.toUpperCase()}</span>
              <span>Build {shortCommit(selected.build_commit)}</span>
              <span>Release {selected.release_id||"—"}</span>
            </div>}
          </div>
          <div className="rowActions">
            {selected&&<button className="secondaryButton compact" type="button" onClick={()=>setPreviewKey(v=>v+1)}>Reload</button>}
            {selected&&<a className="secondaryButton compact linkButton" href={selected.url} target="_blank" rel="noreferrer">Open</a>}
          </div>
        </div>
        {selected?.environment==="production"&&<div className="productionBanner">PRODUCTION SURFACE · confirm before running any potentially destructive test.</div>}
        {surfaces.length>0&&<label>Surface<select value={selectedSurfaceId} onChange={e=>setSelectedSurfaceId(e.target.value)}>{surfaces.map(s=><option key={s.id} value={s.id}>{s.name} · {s.environment} · {shortCommit(s.build_commit)}</option>)}</select></label>}
        {selected?<div className="productFrameShell">
          <iframe key={previewKey} className="productFrame" src={selected.url} title={selected.name} sandbox="allow-scripts allow-forms allow-popups allow-same-origin" referrerPolicy="no-referrer"/>
        </div>:<div className="emptyState"><div>▣</div><h3>No preview configured</h3><p>An operator can register a versioned preview, staging, or production URL.</p></div>}
      </div>

      <div className="panel">
        <div className="panelHead"><div><p className="eyebrow">TEST CASES</p><h3>Collaborative validation</h3></div><span className="countPill">{visibleCases.length}</span></div>
        <form className="plannerForm" onSubmit={addTestCase}>
          <label>Test title<input value={caseTitle} onChange={e=>setCaseTitle(e.target.value)} placeholder="e.g. Job invite appears in DataNest workspace" required/></label>
          <label>Expected result<textarea rows={3} value={caseExpected} onChange={e=>setCaseExpected(e.target.value)} required/></label>
          <label>Notes<textarea rows={2} value={caseDescription} onChange={e=>setCaseDescription(e.target.value)}/></label>
          <button className="secondaryButton" disabled={!selectedSurfaceId}>Add versioned test case</button>
        </form>
      </div>
    </section>

    {canOperate&&<section className="panel">
      <div className="panelHead"><div><p className="eyebrow">SURFACE ADMIN</p><h3>Add versioned product display</h3></div></div>
      <form className="surfaceForm productSurfaceForm" onSubmit={addSurface}>
        <label>Name<input value={surfaceName} onChange={e=>setSurfaceName(e.target.value)} required/></label>
        <label>URL<input type="url" value={surfaceUrl} onChange={e=>setSurfaceUrl(e.target.value)} placeholder="https://…" required/></label>
        <label>Environment<select value={surfaceEnv} onChange={e=>setSurfaceEnv(e.target.value)}><option value="preview">Preview</option><option value="staging">Staging</option><option value="production">Production</option><option value="local">Local</option></select></label>
        <label>Build commit / immutable ID<input value={surfaceBuild} onChange={e=>setSurfaceBuild(e.target.value)} placeholder="Git commit SHA" required/></label>
        <label>Release ID<input value={surfaceRelease} onChange={e=>setSurfaceRelease(e.target.value)} placeholder="Optional release/tag"/></label>
        <button className="primaryButton">Add surface</button>
      </form>
    </section>}

    <section className="testCaseGrid">
      {visibleCases.map(tc=>{
        const latest=latestRun(tc.id);
        return <article className="checkpointCard testCaseCard" key={tc.id}>
          <div className="rowBetween"><div><p className="eyebrow">TEST CASE v{tc.version}</p><h3>{tc.title}</h3></div>{latest&&<span className={"badge "+(latest.result==="pass"?"good":latest.result==="fail"?"bad":"warn")}>{latest.result.toUpperCase()}</span>}</div>
          {tc.description&&<p className="muted">{tc.description}</p>}
          <div className="resumeBox"><b>Expected</b>{tc.expected_result}</div>
          <label>Test notes<textarea rows={3} value={runNotes[tc.id]||""} onChange={e=>setRunNotes(current=>({...current,[tc.id]:e.target.value}))}/></label>
          <label>Evidence URL<input type="url" value={evidenceUrls[tc.id]||""} onChange={e=>setEvidenceUrls(current=>({...current,[tc.id]:e.target.value}))} placeholder="Optional screenshot, artifact, issue or recording"/></label>
          <div className="testActions">
            <button className="primaryButton compact" type="button" onClick={()=>void recordRun(tc,"pass")}>Pass</button>
            <button className="secondaryButton compact" type="button" onClick={()=>void recordRun(tc,"fail")}>Fail</button>
            <button className="secondaryButton compact" type="button" onClick={()=>void recordRun(tc,"blocked")}>Blocked</button>
          </div>
          {latest&&<div className="testEvidence">
            <small>Latest: {formatDate(latest.created_at)} · test v{latest.test_case_version||tc.version} · build {shortCommit(latest.build_commit)}</small>
            <small>{latest.environment_snapshot||"—"} · {latest.notes||"No notes"}</small>
            {latest.evidence_url&&<a href={latest.evidence_url} target="_blank" rel="noreferrer">Open evidence</a>}
          </div>}
        </article>;
      })}
      {!visibleCases.length&&<div className="panel emptyState"><div>✓</div><h3>No test cases yet</h3><p>Add the first validation case for the selected versioned product surface.</p></div>}
    </section>
  </div>;
}

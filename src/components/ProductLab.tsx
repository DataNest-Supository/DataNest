"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Surface={id:string;project_id:string;name:string;url:string;environment:string;status:string;description:string|null;updated_at:string};
type TestCase={id:string;project_id:string;surface_id:string|null;title:string;description:string|null;expected_result:string;status:string;created_by:string;created_at:string};
type TestRun={id:string;project_id:string;job_id:string|null;surface_id:string|null;test_case_id:string;tester_user_id:string;result:"pass"|"fail"|"blocked";notes:string|null;evidence_url:string|null;created_at:string};

function formatDate(value:string|null){
  if(!value)return "—";
  return new Intl.DateTimeFormat(undefined,{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
}

export default function ProductLab({
  projectId,currentUserId,canOperate
}:{
  projectId:string;
  currentUserId:string;
  canOperate:boolean;
}) {
  const [surfaces,setSurfaces]=useState<Surface[]>([]);
  const [cases,setCases]=useState<TestCase[]>([]);
  const [runs,setRuns]=useState<TestRun[]>([]);
  const [selectedSurfaceId,setSelectedSurfaceId]=useState("");
  const [previewKey,setPreviewKey]=useState(0);
  const [surfaceName,setSurfaceName]=useState("Product Preview");
  const [surfaceUrl,setSurfaceUrl]=useState("");
  const [surfaceEnv,setSurfaceEnv]=useState("preview");
  const [caseTitle,setCaseTitle]=useState("");
  const [caseExpected,setCaseExpected]=useState("");
  const [caseDescription,setCaseDescription]=useState("");
  const [runNotes,setRunNotes]=useState<Record<string,string>>({});
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const [realtime,setRealtime]=useState("connecting");

  const load=useCallback(async()=>{
    const supabase=getSupabase();
    if(!supabase)return;
    const [s,c,r]=await Promise.all([
      supabase.from("product_surfaces").select("id,project_id,name,url,environment,status,description,updated_at").eq("project_id",projectId).neq("status","archived").order("updated_at",{ascending:false}),
      supabase.from("product_test_cases").select("id,project_id,surface_id,title,description,expected_result,status,created_by,created_at").eq("project_id",projectId).eq("status","active").order("created_at",{ascending:false}),
      supabase.from("product_test_runs").select("id,project_id,job_id,surface_id,test_case_id,tester_user_id,result,notes,evidence_url,created_at").eq("project_id",projectId).order("created_at",{ascending:false}).limit(100)
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
    return ()=>{void supabase.removeChannel(channel)};
  },[projectId,load]);

  const selected=surfaces.find(s=>s.id===selectedSurfaceId)||null;
  const visibleCases=cases.filter(c=>!c.surface_id||c.surface_id===selectedSurfaceId);
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
    const {data,error:insertError}=await supabase.from("product_surfaces").insert({
      project_id:projectId,name:surfaceName.trim(),url:surfaceUrl.trim(),environment:surfaceEnv,
      status:"active",created_by:currentUserId,updated_by:currentUserId
    }).select("id").single();
    if(insertError){setError(insertError.message);return;}
    setSurfaceUrl("");setNotice("Product surface added.");
    await load();
    if(data?.id)setSelectedSurfaceId(data.id);
  }

  async function addTestCase(event:FormEvent){
    event.preventDefault();
    const supabase=getSupabase();
    if(!supabase||!caseTitle.trim()||!caseExpected.trim())return;
    const {error:insertError}=await supabase.from("product_test_cases").insert({
      project_id:projectId,surface_id:selectedSurfaceId||null,title:caseTitle.trim(),
      description:caseDescription.trim()||null,expected_result:caseExpected.trim(),
      status:"active",created_by:currentUserId
    });
    if(insertError){setError(insertError.message);return;}
    setCaseTitle("");setCaseExpected("");setCaseDescription("");setNotice("Test case added.");
    await load();
  }

  async function recordRun(testCase:TestCase,result:"pass"|"fail"|"blocked"){
    const supabase=getSupabase();
    if(!supabase)return;
    const {error:insertError}=await supabase.from("product_test_runs").insert({
      project_id:projectId,surface_id:testCase.surface_id||selectedSurfaceId||null,
      test_case_id:testCase.id,tester_user_id:currentUserId,result,
      notes:runNotes[testCase.id]?.trim()||null
    });
    if(insertError){setError(insertError.message);return;}
    setRunNotes(current=>({...current,[testCase.id]:""}));
    setNotice("Test result recorded and added to stakeholder contribution tracking.");
    await load();
  }

  function latestRun(caseId:string){
    return runs.find(r=>r.test_case_id===caseId)||null;
  }

  return <div className="productLab">
    <section className="sectionIntro">
      <p className="eyebrow">PRODUCT LAB</p>
      <h2>Live Product Display & Testing</h2>
      <p>Preview the evolving product, create shared test cases, record pass/fail evidence, and watch stakeholder testing update in realtime.</p>
    </section>

    {notice&&<div className="notice goodNotice">{notice}</div>}
    {error&&<div className="notice errorNotice">{error}</div>}

    <section className="metricGrid">
      <article className="metricCard"><span>Surfaces</span><strong>{surfaces.length}</strong><small>Preview/staging/production</small></article>
      <article className="metricCard"><span>Tests</span><strong>{metrics.total}</strong><small>{visibleCases.length} active cases</small></article>
      <article className="metricCard"><span>Pass</span><strong>{metrics.pass}</strong><small>Recorded results</small></article>
      <article className="metricCard"><span>Fail / blocked</span><strong>{metrics.fail+metrics.blocked}</strong><small>Needs development attention</small></article>
      <article className="metricCard"><span>Realtime</span><strong className="realtimeWord">{realtime}</strong><small>Supabase change feed</small></article>
    </section>

    <section className="productLabGrid">
      <div className="panel productPreviewPanel">
        <div className="panelHead">
          <div><p className="eyebrow">LIVE SURFACE</p><h3>{selected?.name||"No product surface"}</h3></div>
          <div className="rowActions">
            {selected&&<button className="secondaryButton compact" type="button" onClick={()=>setPreviewKey(v=>v+1)}>Reload</button>}
            {selected&&<a className="secondaryButton compact linkButton" href={selected.url} target="_blank" rel="noreferrer">Open</a>}
          </div>
        </div>
        {surfaces.length>0&&<label>Surface<select value={selectedSurfaceId} onChange={e=>setSelectedSurfaceId(e.target.value)}>{surfaces.map(s=><option key={s.id} value={s.id}>{s.name} · {s.environment}</option>)}</select></label>}
        {selected?<div className="productFrameShell">
          <iframe key={previewKey} className="productFrame" src={selected.url} title={selected.name} sandbox="allow-scripts allow-forms allow-popups allow-same-origin" referrerPolicy="no-referrer"/>
        </div>:<div className="emptyState"><div>▣</div><h3>No preview configured</h3><p>An operator can register a product preview, staging, or production URL.</p></div>}
      </div>

      <div className="panel">
        <div className="panelHead"><div><p className="eyebrow">TEST CASES</p><h3>Collaborative validation</h3></div><span className="countPill">{visibleCases.length}</span></div>
        <form className="plannerForm" onSubmit={addTestCase}>
          <label>Test title<input value={caseTitle} onChange={e=>setCaseTitle(e.target.value)} placeholder="e.g. Job invite appears in stakeholder workspace" required/></label>
          <label>Expected result<textarea rows={3} value={caseExpected} onChange={e=>setCaseExpected(e.target.value)} required/></label>
          <label>Notes<textarea rows={2} value={caseDescription} onChange={e=>setCaseDescription(e.target.value)}/></label>
          <button className="secondaryButton">Add test case</button>
        </form>
      </div>
    </section>

    {canOperate&&<section className="panel">
      <div className="panelHead"><div><p className="eyebrow">SURFACE ADMIN</p><h3>Add product display</h3></div></div>
      <form className="surfaceForm" onSubmit={addSurface}>
        <label>Name<input value={surfaceName} onChange={e=>setSurfaceName(e.target.value)} required/></label>
        <label>URL<input type="url" value={surfaceUrl} onChange={e=>setSurfaceUrl(e.target.value)} placeholder="https://…" required/></label>
        <label>Environment<select value={surfaceEnv} onChange={e=>setSurfaceEnv(e.target.value)}><option value="preview">Preview</option><option value="staging">Staging</option><option value="production">Production</option><option value="local">Local</option></select></label>
        <button className="primaryButton">Add surface</button>
      </form>
    </section>}

    <section className="testCaseGrid">
      {visibleCases.map(tc=>{
        const latest=latestRun(tc.id);
        return <article className="checkpointCard testCaseCard" key={tc.id}>
          <div className="rowBetween"><div><p className="eyebrow">TEST CASE</p><h3>{tc.title}</h3></div>{latest&&<span className={"badge "+(latest.result==="pass"?"good":latest.result==="fail"?"bad":"warn")}>{latest.result.toUpperCase()}</span>}</div>
          {tc.description&&<p className="muted">{tc.description}</p>}
          <div className="resumeBox"><b>Expected</b>{tc.expected_result}</div>
          <label>Test notes<textarea rows={3} value={runNotes[tc.id]||""} onChange={e=>setRunNotes(current=>({...current,[tc.id]:e.target.value}))}/></label>
          <div className="testActions">
            <button className="primaryButton compact" type="button" onClick={()=>void recordRun(tc,"pass")}>Pass</button>
            <button className="secondaryButton compact" type="button" onClick={()=>void recordRun(tc,"fail")}>Fail</button>
            <button className="secondaryButton compact" type="button" onClick={()=>void recordRun(tc,"blocked")}>Blocked</button>
          </div>
          {latest&&<small>Latest: {formatDate(latest.created_at)} · {latest.notes||"No notes"}</small>}
        </article>;
      })}
      {!visibleCases.length&&<div className="panel emptyState"><div>✓</div><h3>No test cases yet</h3><p>Add the first validation case for the selected product surface.</p></div>}
    </section>
  </div>;
}

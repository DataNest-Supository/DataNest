"use client";

import { useMemo } from "react";

type HomeDestination = "ai" | "unifi" | "scheduler" | "governance" | "thinktank" | "sparks";
type ProjectLike = { name:string; description:string|null };
type JobLike = { id:string; status:string; created_at:string };
type SummaryLike = { total:number; active:number; running:number; blocked:number; available:number; registered:number };

const dayFormatter = new Intl.DateTimeFormat(undefined,{weekday:"short"});

function statusTone(status:string) {
  const value=status.toUpperCase();
  if(["COMPLETED","READY"].includes(value)) return "complete";
  if(["RUNNING","QUEUED","MATCHING"].includes(value)) return "live";
  if(["BLOCKED","MANUAL_ACTION","PAUSED"].includes(value)) return "warn";
  return "quiet";
}

export default function ResonanceHome({
  project,
  jobs,
  counts,
  canOperate,
  onNavigate
}:{
  project:ProjectLike;
  jobs:JobLike[];
  counts:SummaryLike;
  canOperate:boolean;
  onNavigate:(view:HomeDestination)=>void;
}) {
  const pulse=useMemo(()=>{
    const today=new Date();
    today.setHours(0,0,0,0);
    return Array.from({length:7},(_,offset)=>{
      const date=new Date(today);
      date.setDate(today.getDate()-(6-offset));
      const next=new Date(date);
      next.setDate(date.getDate()+1);
      const value=jobs.filter(job=>{
        const created=new Date(job.created_at);
        return created>=date&&created<next;
      }).length;
      return {label:dayFormatter.format(date),value};
    });
  },[jobs]);

  const maxPulse=Math.max(1,...pulse.map(item=>item.value));
  const points=pulse.map((item,index)=>{
    const x=8+(index/(pulse.length-1))*84;
    const y=56-(item.value/maxPulse)*42;
    return {x,y,...item};
  });
  const polyline=points.map(point=>point.x+","+point.y).join(" ");

  const states=useMemo(()=>{
    const tally=new Map<string,number>();
    jobs.forEach(job=>tally.set(job.status,(tally.get(job.status)||0)+1));
    return Array.from(tally.entries())
      .sort((a,b)=>b[1]-a[1])
      .slice(0,5)
      .map(([status,value])=>({status,value,tone:statusTone(status)}));
  },[jobs]);
  const maxState=Math.max(1,...states.map(item=>item.value));

  const activeRate=counts.total ? Math.round((counts.active/counts.total)*100) : 0;
  const runningRate=counts.active ? Math.round((counts.running/counts.active)*100) : 0;

  return <div className="resonanceHome">
    <section className="aiIHero" aria-labelledby="ai-i-title">
      <div className="aiIAmbient" aria-hidden="true">
        <span className="ambientOrb orbOne"/>
        <span className="ambientOrb orbTwo"/>
        <span className="ambientGrid"/>
      </div>

      <div className="aiIHeroCopy">
        <div className="aiIEyebrow"><span className="signalDot"/> RESONANCE DATANEST · AI &amp; I</div>
        <h2 id="ai-i-title">Human intent.<br/><span>AI amplification.</span></h2>
        <p>{project.description||"A governed workspace where human direction and DataNest AI meet in one traceable operating system."}</p>
        <div className="aiIHeroActions">
          <button className="aiIPrimary" type="button" onClick={()=>onNavigate("ai")}>
            <span>Enter DataNest AI</span><b aria-hidden="true">↗</b>
          </button>
          <button className="aiIGhost" type="button" disabled={!canOperate} onClick={()=>onNavigate("unifi")}>
            {canOperate?"Create governed work":"Viewer mode"}
          </button>
        </div>
        <div className="aiIMicroStats" aria-label="Current DataNest operating state">
          <span><b>{counts.active}</b> active</span>
          <span><b>{counts.running}</b> running</span>
          <span><b>{counts.blocked}</b> blocked</span>
        </div>
      </div>

      <div className="aiICoreStage" aria-label="AI and human collaboration visualization">
        <div className="coreOrbit orbitOuter" aria-hidden="true"/>
        <div className="coreOrbit orbitMiddle" aria-hidden="true"/>
        <div className="signalArc arcOne" aria-hidden="true"/>
        <div className="signalArc arcTwo" aria-hidden="true"/>
        <div className="coreNode humanCore">
          <small>I</small>
          <strong>Intent</strong>
          <span>Human direction</span>
        </div>
        <div className="coreBridge" aria-hidden="true"><i/><i/><i/><i/></div>
        <div className="coreNode aiCore">
          <small>AI</small>
          <strong>Amplify</strong>
          <span>Governed intelligence</span>
        </div>
        <div className="coreCenter" aria-hidden="true"><span>R</span></div>
        <span className="coreCaption">Traceable collaboration loop</span>
      </div>
    </section>

    <section className="aiIStatsGrid" aria-label="DataNest project metrics">
      <article>
        <span className="metricSignal cyan"/>
        <div><small>Total work</small><strong>{counts.total}</strong><em>job manifests</em></div>
      </article>
      <article>
        <span className="metricSignal blue"/>
        <div><small>Active field</small><strong>{activeRate}%</strong><em>{counts.active} of {counts.total||0}</em></div>
      </article>
      <article>
        <span className="metricSignal green"/>
        <div><small>Execution</small><strong>{runningRate}%</strong><em>{counts.running} of {counts.active||0} active</em></div>
      </article>
      <article>
        <span className="metricSignal amber"/>
        <div><small>Constraint load</small><strong>{counts.blocked}</strong><em>need attention</em></div>
      </article>
    </section>

    <section className="aiIDataGrid">
      <article className="aiIGraphCard pulseCard">
        <div className="aiICardHead">
          <div><p className="eyebrow">WORK PULSE</p><h3>Recent creation signal</h3></div>
          <span className="aiILiveBadge"><i/> LIVE DATA</span>
        </div>
        <div className="pulsePlot" role="img" aria-label={"Recent jobs created over seven days: "+pulse.map(item=>item.label+" "+item.value).join(", ")}>
          <svg viewBox="0 0 100 62" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity=".25"/>
                <stop offset="100%" stopColor="currentColor" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path className="pulseArea" d={"M "+points[0].x+" 58 L "+points.map(point=>point.x+" "+point.y).join(" L ")+" L "+points[points.length-1].x+" 58 Z"}/>
            <polyline className="pulseLine" points={polyline}/>
            {points.map(point=><circle key={point.x} className="pulsePoint" cx={point.x} cy={point.y} r="1.4"/>)}
          </svg>
          <div className="pulseAxis">{pulse.map(item=><span key={item.label}>{item.label}</span>)}</div>
        </div>
        <p className="aiIGraphNote">Based on the recent jobs currently loaded in this project view.</p>
      </article>

      <article className="aiIGraphCard stateCard">
        <div className="aiICardHead">
          <div><p className="eyebrow">STATE FIELD</p><h3>Recent work distribution</h3></div>
          <button className="aiITextButton" type="button" onClick={()=>onNavigate("scheduler")}>Open queue →</button>
        </div>
        <div className="stateBars">
          {states.length?states.map(item=><div className="stateBarRow" key={item.status}>
            <div className="stateBarMeta"><span>{item.status.replaceAll("_"," ")}</span><b>{item.value}</b></div>
            <div className="stateBarTrack"><span className={item.tone} style={{width:Math.max(7,(item.value/maxState)*100)+"%"}}/></div>
          </div>):<div className="aiIEmptyGraph">No recent job states yet.</div>}
        </div>
      </article>
    </section>

    <section className="aiIFlow">
      <div className="aiIFlowIntro">
        <p className="eyebrow">RESONANCE LOOP</p>
        <h3>Move from thought to governed action.</h3>
        <p>Keep the home surface focused. The deeper workspaces stay one move away.</p>
      </div>
      <div className="aiIFlowRail">
        <button type="button" onClick={()=>onNavigate("sparks")}><span>01</span><b>Spark</b><small>Capture intent</small></button>
        <i aria-hidden="true"/>
        <button type="button" onClick={()=>onNavigate("thinktank")}><span>02</span><b>Think</b><small>Expand with AI</small></button>
        <i aria-hidden="true"/>
        <button type="button" onClick={()=>onNavigate("governance")}><span>03</span><b>Govern</b><small>Apply controls</small></button>
        <i aria-hidden="true"/>
        <button type="button" onClick={()=>onNavigate("scheduler")}><span>04</span><b>Execute</b><small>Route work</small></button>
      </div>
    </section>
  </div>;
}

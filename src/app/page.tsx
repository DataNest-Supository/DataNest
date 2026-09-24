"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Project = { id:string; name:string; description:string|null; status:string };
type Tool = { id:string; name:string; role:string; enabled:boolean };
type Job = { id:string; job_number:number; title:string; status:string; priority:number; created_at:string };

export default function Home() {
  const [project,setProject] = useState<Project|null>(null);
  const [tools,setTools] = useState<Tool[]>([]);
  const [jobs,setJobs] = useState<Job[]>([]);
  const [error,setError] = useState<string>("");

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setError("Supabase environment variables are not configured.");
      return;
    }
    (async () => {
      const p = await sb.from("projects").select("*").eq("slug","resonance-datanest").single();
      if (p.error) return setError(p.error.message);
      setProject(p.data);
      const [t,j] = await Promise.all([
        sb.from("tool_registry").select("id,name,role,enabled").eq("project_id",p.data.id).order("name"),
        sb.from("jobs").select("id,job_number,title,status,priority,created_at").eq("project_id",p.data.id).order("priority",{ascending:false}).limit(20)
      ]);
      if (t.error || j.error) return setError(t.error?.message || j.error?.message || "Load failed");
      setTools(t.data ?? []);
      setJobs(j.data ?? []);
    })();
  },[]);

  return <main className="shell">
    <header>
      <p className="eyebrow">RESONANCE APPDEV</p>
      <h1>{project?.name ?? "Resonance DataNest"}</h1>
      <p>{project?.description ?? "Project operating environment with UNIFI and TranScheduler."}</p>
    </header>

    {error && <div className="notice">{error}</div>}

    <section className="grid">
      {tools.map(tool => <article className="card" key={tool.id}>
        <div className="tag">TOOL</div>
        <h2>{tool.name}</h2>
        <p>{tool.role}</p>
        <span className="state">{tool.enabled ? "ENABLED" : "DISABLED"}</span>
      </article>)}
    </section>

    <section className="panel">
      <div className="panelHead">
        <div><p className="eyebrow">TRANSCHEDULER</p><h2>Job Queue</h2></div>
        <span>{jobs.length} loaded</span>
      </div>
      <div className="jobs">
        {jobs.length === 0 && <p className="muted">No jobs yet. Resonance DataNest is ready for its first UNIFI manifest.</p>}
        {jobs.map(job => <div className="job" key={job.id}>
          <b>JOB-{String(job.job_number).padStart(5,"0")}</b>
          <span>{job.title}</span>
          <span>P{job.priority}</span>
          <span className="state">{job.status}</span>
        </div>)}
      </div>
    </section>
  </main>
}

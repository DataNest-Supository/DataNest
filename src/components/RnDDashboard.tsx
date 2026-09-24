"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import JobInviteForm from "@/components/JobInviteForm";

type Job = {
  id: string;
  job_number: number;
  title: string;
  description: string | null;
  priority: number;
  status: string;
  required_capabilities: string[];
  acceptance: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type Collaborator = {
  id: string;
  email: string;
  role: string;
  status: string;
  invited_at: string;
  accepted_at: string | null;
  last_input_at: string | null;
};

type JobInput = {
  id: string;
  actor_label: string;
  input_type: string;
  content: string;
  status: string;
  created_at: string;
};

type AiMessage = {
  id: string;
  author_type: "user" | "ai" | "system";
  author_label: string;
  content: string;
  status: string;
  created_at: string;
};

type DevelopmentUpdate = {
  id: string;
  source: "ai" | "user" | "system";
  stage: string;
  status: string;
  progress: number;
  summary: string;
  created_at: string;
};

type Suggestion = {
  id: string;
  prompt: string;
  suggestion_type: string;
  priority: number;
  status: string;
  clicked_at: string | null;
  created_at: string;
};

type Props = {
  projectId: string;
  canOperate: boolean;
  currentUserEmail: string;
  openScheduler: () => void;
  setNotice: (value: string) => void;
  setError: (value: string) => void;
};

const jobColumns = "id,job_number,title,description,priority,status,required_capabilities,acceptance,created_at,updated_at";

function jobCode(job: Job) {
  return "JOB-" + String(job.job_number).padStart(5, "0");
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function actionFor(status: string): { label: string; status: string } | null {
  switch (status) {
    case "PLANNED":
      return { label: "Mark ready", status: "READY" };
    case "READY":
      return { label: "Queue for TranScheduler", status: "QUEUED" };
    case "PAUSED":
    case "BLOCKED":
    case "BLOCKED_DEPENDENCY":
    case "MANUAL_ACTION":
    case "RETRY_WAIT":
      return { label: "Return to ready", status: "READY" };
    case "RUNNING":
      return { label: "Send to verification", status: "VERIFYING" };
    case "VERIFYING":
      return { label: "Complete manifest", status: "COMPLETED" };
    default:
      return null;
  }
}

export default function RnDDashboard({
  projectId,
  canOperate,
  currentUserEmail,
  openScheduler,
  setNotice,
  setError
}: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [inputs, setInputs] = useState<JobInput[]>([]);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [updates, setUpdates] = useState<DevelopmentUpdate[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatDraft, setChatDraft] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [inputType, setInputType] = useState("comment");
  const [inputText, setInputText] = useState("");
  const [inputBusy, setInputBusy] = useState(false);
  const [updateStage, setUpdateStage] = useState("implementation");
  const [updateStatus, setUpdateStatus] = useState("in_progress");
  const [updateProgress, setUpdateProgress] = useState(25);
  const [updateSummary, setUpdateSummary] = useState("");
  const [updateBusy, setUpdateBusy] = useState(false);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  const latestUpdate = updates[0] || null;
  const activeSuggestions = suggestions.filter((item) => !["completed", "dismissed"].includes(item.status));

  const loadJobs = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data, error } = await supabase
      .from("jobs")
      .select(jobColumns)
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      setError(error.message);
      return;
    }

    const next = (data || []) as Job[];
    setJobs(next);
    setSelectedJobId((current) => {
      if (current && next.some((job) => job.id === current)) return current;
      return next[0]?.id || "";
    });
  }, [projectId, setError]);

  const loadWorkspace = useCallback(async (jobId: string) => {
    if (!jobId) return;
    const supabase = getSupabase();
    if (!supabase) return;

    setLoading(true);

    const [collabResult, inputResult, messageResult, updateResult, suggestionResult] = await Promise.all([
      supabase
        .from("job_collaborators")
        .select("id,email,role,status,invited_at,accepted_at,last_input_at")
        .eq("job_id", jobId)
        .order("invited_at", { ascending: false }),
      supabase
        .from("job_inputs")
        .select("id,actor_label,input_type,content,status,created_at")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("ai_messages")
        .select("id,author_type,author_label,content,status,created_at")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true })
        .limit(100),
      supabase
        .from("ai_development_updates")
        .select("id,source,stage,status,progress,summary,created_at")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("ai_prompt_queue")
        .select("id,prompt,suggestion_type,priority,status,clicked_at,created_at")
        .eq("job_id", jobId)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(40)
    ]);

    const firstError =
      collabResult.error ||
      inputResult.error ||
      messageResult.error ||
      updateResult.error ||
      suggestionResult.error;

    if (firstError) {
      setError(firstError.message);
    } else {
      setCollaborators((collabResult.data || []) as Collaborator[]);
      setInputs((inputResult.data || []) as JobInput[]);
      setMessages((messageResult.data || []) as AiMessage[]);
      setUpdates((updateResult.data || []) as DevelopmentUpdate[]);
      setSuggestions((suggestionResult.data || []) as Suggestion[]);
    }

    setLoading(false);
  }, [setError]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (selectedJobId) void loadWorkspace(selectedJobId);
  }, [selectedJobId, loadWorkspace]);

  async function refresh() {
    await loadJobs();
    if (selectedJobId) await loadWorkspace(selectedJobId);
  }

  async function actionManifest() {
    if (!selectedJob || !canOperate) return;
    const next = actionFor(selectedJob.status);
    if (!next) return;

    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.rpc("transition_job_status", {
      target_job: selectedJob.id,
      target_status: next.status
    });

    if (error) {
      setError(error.message);
      return;
    }

    setNotice(jobCode(selectedJob) + " moved to " + next.status + ".");
    await refresh();
  }

  async function submitInput(event: FormEvent) {
    event.preventDefault();
    if (!selectedJob || !inputText.trim()) return;

    const supabase = getSupabase();
    if (!supabase) return;

    setInputBusy(true);
    try {
      const { error } = await supabase.rpc("submit_job_input", {
        target_job: selectedJob.id,
        target_input_type: inputType,
        input_content: inputText.trim()
      });
      if (error) throw error;
      setInputText("");
      setNotice("R&D input recorded for " + jobCode(selectedJob) + ".");
      await loadWorkspace(selectedJob.id);
    } catch (inputError) {
      setError(inputError instanceof Error ? inputError.message : "Unable to record R&D input.");
    } finally {
      setInputBusy(false);
    }
  }

  async function sendChat(event: FormEvent) {
    event.preventDefault();
    if (!selectedJob || !chatDraft.trim()) return;

    const supabase = getSupabase();
    if (!supabase) return;

    setChatBusy(true);
    try {
      const { error } = await supabase.rpc("post_job_ai_message", {
        target_job: selectedJob.id,
        message_content: chatDraft.trim()
      });
      if (error) throw error;
      setChatDraft("");
      await loadWorkspace(selectedJob.id);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "Unable to post AI collaboration message.");
    } finally {
      setChatBusy(false);
    }
  }

  async function useSuggestion(suggestion: Suggestion) {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data, error } = await supabase.rpc("click_ai_suggestion", {
      target_suggestion: suggestion.id
    });

    if (error) {
      setError(error.message);
      return;
    }

    setChatDraft(String(data || suggestion.prompt));
    setNotice("Suggestion loaded into AI Collaboration.");
    await loadWorkspace(suggestion.id ? selectedJobId : selectedJobId);
  }

  async function dispatchSuggestion(suggestion: Suggestion) {
    if (!canOperate) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const { data, error } = await supabase.rpc("dispatch_ai_suggestion", {
      target_suggestion: suggestion.id
    });

    if (error) {
      setError(error.message);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const stepKey = String((row as Record<string, unknown> | null)?.step_key || "AI step");
    setNotice(stepKey + " added to the Job Manifest execution plan.");
    await loadWorkspace(selectedJobId);
  }

  async function recordUpdate(event: FormEvent) {
    event.preventDefault();
    if (!selectedJob || !canOperate || !updateSummary.trim()) return;

    const supabase = getSupabase();
    if (!supabase) return;

    setUpdateBusy(true);
    try {
      const { error } = await supabase.rpc("record_ai_development_update", {
        target_job: selectedJob.id,
        target_stage: updateStage,
        target_status: updateStatus,
        target_progress: updateProgress,
        update_summary: updateSummary.trim()
      });
      if (error) throw error;
      setUpdateSummary("");
      setNotice("Development update recorded.");
      await loadWorkspace(selectedJob.id);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to record development update.");
    } finally {
      setUpdateBusy(false);
    }
  }

  if (!jobs.length && !loading) {
    return <section className="panel">
      <p className="eyebrow">R&D CONTROL PLANE</p>
      <h2>No accessible Job Manifests</h2>
      <p className="muted">Create a Job Manifest in UNIFI or ask an operator to invite you to a specific R&D job.</p>
    </section>;
  }

  const nextAction = selectedJob ? actionFor(selectedJob.status) : null;

  return <div className="rndWorkspace">
    <section className="rndHero">
      <div>
        <p className="eyebrow">R&D CONTROL PLANE</p>
        <h2>Action Job Manifests with people + AI</h2>
        <p>Collaborate on requirements, track invited-user input, follow AI-assisted development progress, and dispatch suggested prompts into UNIFI/TranScheduler execution.</p>
      </div>
      <div className="rndHeroActions">
        <button className="secondaryButton compact" onClick={() => void refresh()}>Refresh R&D</button>
        <button className="secondaryButton compact" onClick={openScheduler}>Open TranScheduler</button>
      </div>
    </section>

    <section className="rndJobStrip" aria-label="R&D Job Manifests">
      {jobs.map((job) => <button
        key={job.id}
        className={"rndJobChip " + (job.id === selectedJobId ? "active" : "")}
        onClick={() => setSelectedJobId(job.id)}
      >
        <span>{jobCode(job)}</span>
        <b>{job.title}</b>
        <small>{job.status + " · P" + job.priority}</small>
      </button>)}
    </section>

    {selectedJob && <section className="panel rndManifestHeader">
      <div>
        <div className="rowBetween">
          <div>
            <p className="eyebrow">SELECTED JOB MANIFEST</p>
            <h2>{jobCode(selectedJob) + " · " + selectedJob.title}</h2>
          </div>
          <span className={"badge " + (selectedJob.status === "COMPLETED" ? "good" : "live")}>{selectedJob.status.replaceAll("_", " ")}</span>
        </div>
        <p className="muted">{selectedJob.description || "No description supplied."}</p>
        <div className="manifestMeta">
          <span>{"Priority " + selectedJob.priority}</span>
          <span>{selectedJob.required_capabilities?.join(", ") || "chat"}</span>
          <span>{"Updated " + formatDate(selectedJob.updated_at)}</span>
        </div>
      </div>
      <div className="rndManifestActions">
        {canOperate && nextAction && <button className="primaryButton" onClick={() => void actionManifest()}>{nextAction.label}</button>}
        <JobInviteForm
          jobId={selectedJob.id}
          canInvite={canOperate}
          onSent={(message) => {
            setNotice(message);
            void loadWorkspace(selectedJob.id);
          }}
        />
      </div>
    </section>}

    {loading ? <div className="loadingBar"><span /></div> : selectedJob && <>
      <section className="rndMetrics">
        <article><span>Development</span><strong>{latestUpdate?.progress ?? 0}%</strong><small>{latestUpdate?.stage || "planning"}</small></article>
        <article><span>Suggestions</span><strong>{activeSuggestions.length}</strong><small>clickable prompts</small></article>
        <article><span>Collaborators</span><strong>{collaborators.length}</strong><small>job scoped</small></article>
        <article><span>Tracked inputs</span><strong>{inputs.length}</strong><small>latest 50</small></article>
      </section>

      <section className="rndPrimaryGrid">
        <div className="panel rndDevelopmentPanel">
          <div className="panelHead">
            <div><p className="eyebrow">AI DEVELOPMENT TRACKING</p><h3>Progress timeline</h3></div>
            <span className="countPill">{latestUpdate?.progress ?? 0}%</span>
          </div>
          <div className="progressTrack"><span style={{ width: Math.max(2, latestUpdate?.progress ?? 0) + "%" }} /></div>
          <div className="rndTimeline">
            {updates.map((update) => <article key={update.id}>
              <div className="rndTimelineDot" />
              <div>
                <div className="rowBetween"><b>{update.stage.replaceAll("_", " ")}</b><small>{formatDate(update.created_at)}</small></div>
                <p>{update.summary}</p>
                <div className="manifestMeta"><span>{update.source}</span><span>{update.status}</span><span>{update.progress + "%"}</span></div>
              </div>
            </article>)}
          </div>
          {canOperate && <form className="plannerForm rndUpdateForm" onSubmit={recordUpdate} aria-busy={updateBusy}>
            <p className="eyebrow">LOG DEVELOPMENT UPDATE</p>
            <div className="fieldRow">
              <label>Stage<select value={updateStage} onChange={(event) => setUpdateStage(event.target.value)}>
                <option value="planning">Planning</option>
                <option value="architecture">Architecture</option>
                <option value="scheduling">Scheduling</option>
                <option value="implementation">Implementation</option>
                <option value="validation">Validation</option>
                <option value="release">Release</option>
              </select></label>
              <label>Status<select value={updateStatus} onChange={(event) => setUpdateStatus(event.target.value)}>
                <option value="planned">Planned</option>
                <option value="in_progress">In progress</option>
                <option value="blocked">Blocked</option>
                <option value="review">Review</option>
                <option value="complete">Complete</option>
              </select></label>
            </div>
            <label>Progress<input type="number" min={0} max={100} value={updateProgress} onChange={(event) => setUpdateProgress(Number(event.target.value))} /></label>
            <label>Summary<textarea rows={3} value={updateSummary} onChange={(event) => setUpdateSummary(event.target.value)} placeholder="What changed in development?" /></label>
            <button className="secondaryButton compact" disabled={updateBusy}>{updateBusy ? "Saving…" : "Record update"}</button>
          </form>}
        </div>

        <div className="panel rndChatPanel">
          <div className="panelHead">
            <div><p className="eyebrow">AI COLLABORATION</p><h3>UNIFI Copilot</h3></div>
            <span className="countPill">{messages.length + " messages"}</span>
          </div>
          <p className="muted rndChatIntro">Queue-backed collaboration keeps every prompt auditable. External model execution can consume the same prompt queue without changing this workflow.</p>
          <div className="rndChatLog" aria-live="polite">
            {messages.map((message) => <article key={message.id} className={"rndMessage " + message.author_type}>
              <div className="rowBetween"><b>{message.author_label}</b><small>{formatDate(message.created_at)}</small></div>
              <p>{message.content}</p>
            </article>)}
            {!messages.length && <div className="rndEmptyMini">Start with a question, a development decision, or one of the suggestion prompts.</div>}
          </div>
          <form className="rndChatComposer" onSubmit={sendChat} aria-busy={chatBusy}>
            <textarea
              rows={4}
              value={chatDraft}
              onChange={(event) => setChatDraft(event.target.value)}
              placeholder="Collaborate with UNIFI Copilot about this Job Manifest…"
            />
            <div className="rowBetween">
              <small>{"Posting as " + currentUserEmail}</small>
              <button className="primaryButton compact" disabled={chatBusy || !chatDraft.trim()}>{chatBusy ? "Posting…" : "Send to AI collaboration"}</button>
            </div>
          </form>
        </div>

        <div className="panel rndSuggestionPanel">
          <div className="panelHead">
            <div><p className="eyebrow">SUGGESTION PROMPTS QUEUE</p><h3>Click → collaborate → dispatch</h3></div>
            <span className="countPill">{activeSuggestions.length}</span>
          </div>
          <div className="rndSuggestionList">
            {activeSuggestions.map((suggestion) => <article className="rndSuggestion" key={suggestion.id}>
              <div className="rowBetween">
                <span className="suggestionType">{suggestion.suggestion_type.replaceAll("_", " ")}</span>
                <small>{"P" + suggestion.priority}</small>
              </div>
              <p>{suggestion.prompt}</p>
              <div className="rndSuggestionActions">
                <button className="secondaryButton compact" onClick={() => void useSuggestion(suggestion)}>Use prompt</button>
                {canOperate && suggestion.status !== "dispatched" && <button className="primaryButton compact" onClick={() => void dispatchSuggestion(suggestion)}>Dispatch step</button>}
              </div>
              <small>{suggestion.status.replaceAll("_", " ")}</small>
            </article>)}
            {!activeSuggestions.length && <div className="rndEmptyMini">No active suggestion prompts remain for this Job Manifest.</div>}
          </div>
        </div>
      </section>

      <section className="rndSecondaryGrid">
        <div className="panel">
          <div className="panelHead">
            <div><p className="eyebrow">INVITED USER INPUT TRACKING</p><h3>R&D contributions</h3></div>
            <span className="countPill">{inputs.length}</span>
          </div>
          <form className="plannerForm rndInputForm" onSubmit={submitInput} aria-busy={inputBusy}>
            <label>Input type<select value={inputType} onChange={(event) => setInputType(event.target.value)}>
              <option value="comment">Comment</option>
              <option value="requirement">Requirement</option>
              <option value="decision">Decision</option>
              <option value="feedback">Feedback</option>
              <option value="answer">Answer</option>
            </select></label>
            <label>Your R&D input<textarea rows={3} value={inputText} onChange={(event) => setInputText(event.target.value)} placeholder="Add evidence, a decision, requirement, review note, or answer…" /></label>
            <button className="primaryButton compact" disabled={inputBusy || !inputText.trim()}>{inputBusy ? "Recording…" : "Record input"}</button>
          </form>
          <div className="rndInputList">
            {inputs.map((input) => <article key={input.id}>
              <div className="rowBetween"><b>{input.actor_label}</b><small>{formatDate(input.created_at)}</small></div>
              <div className="manifestMeta"><span>{input.input_type}</span><span>{input.status}</span></div>
              <p>{input.content}</p>
            </article>)}
            {!inputs.length && <div className="rndEmptyMini">No tracked R&D input yet.</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panelHead">
            <div><p className="eyebrow">COLLABORATORS</p><h3>Job-scoped access</h3></div>
            <span className="countPill">{collaborators.length}</span>
          </div>
          <div className="rndCollaborators">
            {collaborators.map((collaborator) => <article key={collaborator.id}>
              <div className="rowBetween"><b>{collaborator.email}</b><span className={"badge " + (collaborator.status === "accepted" ? "good" : "warn")}>{collaborator.status}</span></div>
              <p>{collaborator.role}</p>
              <small>{collaborator.last_input_at ? "Last input " + formatDate(collaborator.last_input_at) : "Invited " + formatDate(collaborator.invited_at)}</small>
            </article>)}
            {!collaborators.length && <div className="rndEmptyMini">No external collaborators have been invited to this Job Manifest.</div>}
          </div>
          <JobInviteForm
            jobId={selectedJob.id}
            canInvite={canOperate}
            onSent={(message) => {
              setNotice(message);
              void loadWorkspace(selectedJob.id);
            }}
          />
        </div>
      </section>
    </>}
  </div>;
}

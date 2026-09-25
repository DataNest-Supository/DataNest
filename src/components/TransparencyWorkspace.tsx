"use client";

const auditDomains = [
  "UI / UX / information architecture",
  "Accessibility and interaction quality",
  "Architecture and system boundaries",
  "Authentication / authorization / security",
  "UNIFI planning and Job Manifests",
  "TranScheduler and execution controls",
  "DataNest AI and external AI handoff",
  "Think Tanks and reviewed institutional learning",
  "Contribution Intelligence and stakeholder progression",
  "Sparks internal-utility economy",
  "Sovereign Governance and formal membership",
  "Product Lab and output quality",
  "Auditability, traceability and observability",
  "Deployment, CI/CD and release integrity",
  "Reliability, recovery and failure handling",
  "Cost, maintainability and operational efficiency",
  "End-to-end user journeys",
  "Prioritized optimization backlog"
];

const invariantHighlights = [
  "GitHub remains source authority and Supabase remains the application/control-plane authority.",
  "UNKNOWN capability state is never treated as execution permission.",
  "Independent review, audit history, authorization checks and certification gates cannot be optimized away.",
  "Sparks remain internal utility only and do not create ownership, royalties or voting weight.",
  "Governance remains one active project member, one vote and does not amend contracts or financial rights.",
  "Project invitations do not create access or voting eligibility until the matching authenticated account becomes active.",
  "Normal user UI must not silently reintroduce Capacity or Operations Capabilities."
];

type TransparencyWorkspaceProps = {
  releaseSha: string;
};

export default function TransparencyWorkspace({releaseSha}:TransparencyWorkspaceProps){
  const docxHref="./transparency/audits/Resonance_DataNest_External_Full_System_Audit_Brief.docx";

  return <div className="transparencyWorkspace">
    <section className="heroPanel transparencyHero" aria-labelledby="transparency-title">
      <div>
        <p className="eyebrow">TRANSPARENCY</p>
        <h2 id="transparency-title">Audit library + public accountability record</h2>
        <p>
          DataNest publishes audit methodology, source documents, status and remediation evidence so stakeholders can inspect how the system is reviewed.
          Audit documents are informational evidence: they do not grant project roles, financial authority, ownership or governance power.
        </p>
        <div className="heroActions">
          <a className="primaryButton compact linkButton" href={docxHref} download>
            Download audit brief (DOCX)
          </a>
          <a className="secondaryButton compact linkButton" href="#audit-accessible-summary">
            Read accessible summary
          </a>
        </div>
      </div>
      <div className="stackDiagram" aria-label="Transparency lifecycle">
        <div>Audit brief <b>Published</b></div><span aria-hidden="true">↓</span>
        <div>External review <b>Pending</b></div><span aria-hidden="true">↓</span>
        <div>Findings <b>Not yet published</b></div><span aria-hidden="true">↓</span>
        <div>Remediation <b>Traceable</b></div>
      </div>
    </section>

    <section className="metricGrid" aria-label="Transparency status">
      <article className="metricCard"><span>Published source documents</span><strong>1</strong><small>Audit methodology / brief</small></article>
      <article className="metricCard"><span>External audit results</span><strong>0</strong><small>Awaiting completed audit</small></article>
      <article className="metricCard"><span>Open published findings</span><strong>0</strong><small>No external results imported yet</small></article>
      <article className="metricCard"><span>Remediation records</span><strong>0</strong><small>Created after validated findings</small></article>
    </section>

    <section className="panel" aria-labelledby="audit-library-heading">
      <div className="panelHead">
        <div><p className="eyebrow">AUDIT LIBRARY</p><h3 id="audit-library-heading">Published audit documents</h3></div>
        <span className="countPill">READ ONLY</span>
      </div>

      <article className="transparencyDocCard">
        <div className="transparencyDocHeader">
          <div>
            <p className="eyebrow">AUDIT METHODOLOGY · VERSION 1.0</p>
            <h3>Resonance DataNest / RONSAS External Full-System Audit Brief</h3>
          </div>
          <span className="badge good">PUBLISHED</span>
        </div>
        <p>
          Independent evidence-based audit specification covering UI, architecture, workflows, AI, governance, output quality,
          reliability, security, deployment and optimization. It includes PASS / PARTIAL / FAIL / NOT TESTED criteria,
          structured finding IDs and a paste-back return template.
        </p>
        <dl className="transparencyMeta">
          <div><dt>Published</dt><dd>25 Sep 2026</dd></div>
          <div><dt>Baseline source commit</dt><dd><code>ac93d51828707d398dfa9c5a471d8a6ed4c9059f</code></dd></div>
          <div><dt>Baseline DB release</dt><dd><code>datanest-project-member-invitations-v1</code></dd></div>
          <div><dt>Current UI commit</dt><dd><code>{releaseSha}</code></dd></div>
          <div><dt>Document type</dt><dd>Audit brief / audit return template</dd></div>
          <div><dt>Audit result</dt><dd>Not yet supplied</dd></div>
        </dl>
        <div className="heroActions">
          <a className="secondaryButton compact linkButton" href={docxHref} download>
            Download original DOCX
          </a>
          <a
            className="textButton linkButton"
            href="https://github.com/DataNest-Supository/DataNest"
            target="_blank"
            rel="noreferrer"
          >
            View source repository
          </a>
        </div>
      </article>
    </section>

    <section className="panel" id="audit-accessible-summary" aria-labelledby="accessible-summary-heading">
      <div className="panelHead">
        <div><p className="eyebrow">ACCESSIBLE SUMMARY</p><h3 id="accessible-summary-heading">What the external audit must inspect</h3></div>
        <span className="countPill">{auditDomains.length+" DOMAINS"}</span>
      </div>
      <p className="muted">
        This HTML summary is provided alongside the original document so the audit scope is readable without opening a downloadable file.
        The original DOCX remains the controlling audit brief for the complete checklist and return template.
      </p>
      <ol className="transparencyDomainList">
        {auditDomains.map((domain,index)=><li key={domain}><span>{String(index+1).padStart(2,"0")}</span><b>{domain}</b></li>)}
      </ol>
    </section>

    <section className="panel" aria-labelledby="invariants-heading">
      <div className="panelHead">
        <div><p className="eyebrow">AUDIT GUARDRAILS</p><h3 id="invariants-heading">Non-negotiable system invariants</h3></div>
        <span className="countPill">PRESERVE</span>
      </div>
      <ul className="transparencyChecklist">
        {invariantHighlights.map(item=><li key={item}>{item}</li>)}
      </ul>
      <p className="muted">
        An optimization proposal that removes one of these controls must be rejected or redesigned unless a separate governed change explicitly replaces the invariant.
      </p>
    </section>

    <section className="panel" aria-labelledby="publication-model-heading">
      <div className="panelHead">
        <div><p className="eyebrow">PUBLICATION MODEL</p><h3 id="publication-model-heading">How future audit evidence appears here</h3></div>
      </div>
      <div className="transparencyLifecycle">
        <article><b>1 · Source document</b><p>Audit brief, policy, methodology or evidence pack is published with version and baseline.</p></article>
        <article><b>2 · External result</b><p>Completed external audit is added unchanged or clearly marked as normalized/transcribed for accessibility.</p></article>
        <article><b>3 · Validation</b><p>Findings are reproduced or marked unverified; severity, evidence and affected system area remain attributable.</p></article>
        <article><b>4 · Remediation</b><p>Accepted work links to Job Manifest, PR, release, migration, tests and post-release verification.</p></article>
        <article><b>5 · Closure</b><p>Finding is closed only when evidence demonstrates the issue is corrected or the risk is formally accepted.</p></article>
      </div>
    </section>

    <section className="panel" aria-labelledby="accessibility-heading">
      <div className="panelHead">
        <div><p className="eyebrow">ACCESSIBILITY</p><h3 id="accessibility-heading">Transparency must be usable, not merely downloadable</h3></div>
      </div>
      <ul className="transparencyChecklist">
        <li>Document purpose, status, version, baseline and audit-result state are shown in normal HTML.</li>
        <li>Download links use descriptive accessible names rather than icon-only controls.</li>
        <li>Audit methodology and audit findings are visually and semantically distinguished.</li>
        <li>No secret, credential, session cookie, service-role key or protected personal data should be published in transparency artifacts.</li>
        <li>Future audit results should include an accessible HTML summary even when the original evidence is PDF, DOCX or another file format.</li>
      </ul>
    </section>
  </div>;
}

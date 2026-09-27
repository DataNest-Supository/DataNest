#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const GH = "https://api.github.com";
const SB = "https://api.supabase.com";

export function normalizeBranchFamily(name) {
  let value = String(name || "").toLowerCase();
  const endings = [/-20\d{6}$/, /-current-main$/, /-current$/, /-final$/, /-v\d+$/];
  for (let changed = true; changed;) {
    changed = false;
    for (const ending of endings) {
      const next = value.replace(ending, "");
      if (next !== value) { value = next; changed = true; }
    }
  }
  return value;
}

export function extractAuditIds(text) {
  return [...new Set(String(text || "").match(/AUD-\d{3}/g) || [])].sort();
}

const ageDays = (date, now = new Date()) =>
  date ? Math.max(0, (now - new Date(date)) / 86400000) : Number.NaN;
const matches = (value, patterns = []) =>
  patterns.some((p) => new RegExp(p).test(value));

export function classifyBranch(branch, config, now = new Date()) {
  const age = ageDays(branch.updatedAt, now);
  const rawAhead = branch.compare?.ahead_by ?? branch.compare?.aheadBy;
  const rawBehind = branch.compare?.behind_by ?? branch.compare?.behindBy;
  const ahead = rawAhead == null ? null : Number(rawAhead);
  const behind = rawBehind == null ? null : Number(rawBehind);
  const status = branch.compare?.status || "unknown";

  if (branch.protected || branch.name === config.baseBranch || matches(branch.name, config.protectedPatterns))
    return { decision:"keep", reason:"protected", ageDays:age, ahead, behind, status };
  if (branch.openPr)
    return { decision:"keep", reason:"open_pr", ageDays:age, ahead, behind, status };
  if (ahead === 0 && status !== "unknown" && Number.isFinite(age) && age >= config.minDeleteAgeDays)
    return { decision:"delete_candidate", reason:branch.mergedPr ? "merged_no_unique_commits" : "no_unique_commits", ageDays:age, ahead, behind, status };
  if (branch.mergedPr && ahead != null && ahead > 0)
    return { decision:"review", reason:"post_merge_unique_commits", ageDays:age, ahead, behind, status };
  if (Number.isFinite(age) && age >= config.staleDays && ahead != null && ahead > 0)
    return { decision:"review", reason:"stale_unique_work", ageDays:age, ahead, behind, status };
  if (branch.familyHasNewerSibling)
    return { decision:"review", reason:"possible_superseded_variant", ageDays:age, ahead, behind, status };
  return { decision:"keep", reason:"active_or_unresolved", ageDays:age, ahead, behind, status };
}

export function evaluateSupabaseProject(project, config = {}) {
  const checks = [];
  const status = project.project?.status || project.status || "UNKNOWN";
  if (!String(status).includes("HEALTHY"))
    checks.push({ level:"blocker", code:"project_unhealthy", detail:"Project status: " + status });

  for (const advisor of project.securityAdvisors || []) {
    const severity = String(advisor.level || advisor.severity || "warning").toLowerCase();
    checks.push({
      level:/critical|error/.test(severity) ? "blocker" : "warning",
      code:"security_advisor",
      detail:advisor.title || advisor.name || advisor.detail || "Supabase security advisor requires review"
    });
  }

  for (const b of project.branches || []) {
    const branchStatus = String(b.status || "UNKNOWN");
    if (/FAILED|ERROR/i.test(branchStatus))
      checks.push({
        level:b.is_default ? "blocker" : "warning",
        code:"supabase_branch_failure",
        detail:(b.name || b.git_branch || b.id) + ": " + branchStatus
      });
    if (config.expectedGitBranch && b.is_default && b.git_branch !== config.expectedGitBranch)
      checks.push({
        level:"warning",
        code:"git_branch_mapping_drift",
        detail:"Expected " + config.expectedGitBranch + ", got " + (b.git_branch || "unset")
      });
  }
  return checks;
}

export function getStrictBlockers(supabase) {
  return [
    ...(supabase?.globalChecks || []),
    ...(supabase?.projects || []).flatMap((p) => p.checks || []),
  ].filter((c) => c.level === "blocker");
}

export function migrationNameFromFile(file) {
  return String(file || "")
    .replace(/\.sql$/i, "")
    .replace(/^\d{14}_/, "");
}

export function compareMigrationParity(repoFiles = [], liveMigrations = []) {
  const repoEntries = repoFiles
    .filter((file) => String(file).endsWith(".sql"))
    .map((file) => ({
      file,
      version:(String(file).match(/^(\d{14})_/) || [])[1] || null,
      name:migrationNameFromFile(file),
    }));
  const liveEntries = liveMigrations
    .filter((m) => m?.name)
    .map((m) => ({ version:String(m.version || ""), name:String(m.name) }));

  const repoNames = new Set(repoEntries.map((m) => m.name));
  const liveNames = new Set(liveEntries.map((m) => m.name));
  const repoVersionsByName = new Map(repoEntries.map((m) => [m.name, m.version]));
  const liveVersionsByName = new Map(liveEntries.map((m) => [m.name, m.version]));

  return {
    repoCount:repoEntries.length,
    liveCount:liveEntries.length,
    repoOnly:[...repoNames].filter((name) => !liveNames.has(name)).sort(),
    liveOnly:[...liveNames].filter((name) => !repoNames.has(name)).sort(),
    versionMismatches:[...repoNames]
      .filter((name) => liveNames.has(name))
      .filter((name) => {
        const repoVersion = repoVersionsByName.get(name);
        const liveVersion = liveVersionsByName.get(name);
        return liveVersion && repoVersion !== liveVersion;
      })
      .map((name) => ({
        name,
        repoVersion:repoVersionsByName.get(name),
        liveVersion:liveVersionsByName.get(name),
      })),
  };
}

function parseArgs(argv) {
  const out = { apply:false, strict:false, config:"branch-cleaner.config.json", reportDir:"artifacts/branch-cleaner", staleDays:null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--apply") out.apply = true;
    else if (argv[i] === "--strict") out.strict = true;
    else if (argv[i] === "--config") out.config = argv[++i];
    else if (argv[i] === "--report-dir") out.reportDir = argv[++i];
    else if (argv[i] === "--stale-days") out.staleDays = Number(argv[++i]);
  }
  return out;
}

async function json(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers:{
      Accept:"application/json",
      ...(token ? { Authorization:"Bearer " + token } : {}),
      "User-Agent":"resonance-branch-cleaner",
      ...(options.headers || {})
    }
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = { raw }; }
  if (!response.ok) {
    const error = new Error(String(data?.message || data?.error || (response.status + " " + response.statusText)));
    error.status = response.status;
    throw error;
  }
  return data;
}

const gh = (repo, endpoint, token, options) =>
  json(GH + "/repos/" + repo + endpoint, token, {
    ...options,
    headers:{ "X-GitHub-Api-Version":"2022-11-28", ...(options?.headers || {}) }
  });
const sb = (endpoint, token) => json(SB + endpoint, token);

async function paginate(repo, endpoint, token) {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const join = endpoint.includes("?") ? "&" : "?";
    const data = await gh(repo, endpoint + join + "per_page=100&page=" + page, token);
    if (!Array.isArray(data)) break;
    out.push(...data);
    if (data.length < 100) break;
  }
  return out;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length:Math.min(limit, Math.max(items.length, 1)) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }));
  return out;
}

async function githubAudit(repo, token, config) {
  const [branches, prs] = await Promise.all([
    paginate(repo, "/branches", token),
    paginate(repo, "/pulls?state=all&sort=updated&direction=desc", token)
  ]);

  const prsByBranch = new Map();
  for (const pr of prs) {
    if (pr.head?.repo?.full_name && pr.head.repo.full_name !== repo) continue;
    if (!pr.head?.ref) continue;
    prsByBranch.set(pr.head.ref, [...(prsByBranch.get(pr.head.ref) || []), pr]);
  }

  const facts = await mapLimit(branches, 6, async (b) => {
    const [commit, compare] = await Promise.allSettled([
      gh(repo, "/commits/" + b.commit.sha, token),
      b.name === config.baseBranch
        ? Promise.resolve({ status:"identical", ahead_by:0, behind_by:0 })
        : gh(repo, "/compare/" + encodeURIComponent(config.baseBranch) + "..." + encodeURIComponent(b.name), token)
    ]);
    const c = commit.status === "fulfilled" ? commit.value : {};
    const d = compare.status === "fulfilled" ? compare.value : { status:"unknown" };
    const linked = prsByBranch.get(b.name) || [];
    return {
      name:b.name,
      sha:b.commit.sha,
      protected:!!b.protected,
      updatedAt:c.commit?.committer?.date || c.commit?.author?.date || null,
      compare:{ status:d.status || "unknown", ahead_by:d.ahead_by ?? null, behind_by:d.behind_by ?? null },
      openPr:linked.some((p) => p.state === "open"),
      mergedPr:linked.some((p) => !!p.merged_at),
      auditIds:extractAuditIds(linked.map((p) => (p.title || "") + "\n" + (p.body || "")).join("\n"))
    };
  });

  const families = new Map();
  for (const b of facts) {
    const family = normalizeBranchFamily(b.name);
    families.set(family, [...(families.get(family) || []), b]);
  }
  const superseded = new Set();
  for (const group of families.values()) {
    [...group]
      .sort((a,b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .slice(1)
      .forEach((b) => superseded.add(b.name));
  }

  return {
    pullRequestCount:prs.length,
    branches:facts.map((b) => ({
      ...b,
      family:normalizeBranchFamily(b.name),
      classification:classifyBranch({ ...b, familyHasNewerSibling:superseded.has(b.name) }, config)
    }))
  };
}

const digest = (text) => createHash("sha256").update(text).digest("hex");

async function learn(config) {
  const sources = [];
  let findings, backlog, index;
  for (const file of config.auditSources || []) {
    try {
      const text = await readFile(file, "utf8");
      sources.push({ path:file, sha256:digest(text), bytes:Buffer.byteLength(text) });
      if (file.endsWith("/findings.json")) findings = JSON.parse(text);
      if (file.endsWith("/remediation-backlog.json")) backlog = JSON.parse(text);
      if (file.endsWith("/audits/index.json")) index = JSON.parse(text);
    } catch (error) {
      sources.push({ path:file, error:error.message });
    }
  }
  const unresolved = (findings?.findings || [])
    .filter((f) => !["validated","remediated","closed"].includes(f.validation_state));
  return {
    sources,
    audit:{
      auditId:findings?.audit_id || null,
      certificationStatus:findings?.certification_status || null,
      validationState:findings?.validation_state ||
        index?.documents?.find((d) => d.document_type === "audit_return")?.findings?.validation_state || null,
      findingCount:findings?.findings?.length || 0,
      unresolvedCount:unresolved.length,
      highOrVerificationPriority:unresolved.filter((f) => String(f.priority || "").toUpperCase().startsWith("P1")).length,
      backlogCount:backlog?.items?.length || 0,
      unresolvedIds:unresolved.map((f) => f.id)
    }
  };
}

const advisorList = (data) =>
  Array.isArray(data) ? data :
  Array.isArray(data?.lints) ? data.lints :
  Array.isArray(data?.advisors) ? data.advisors : [];

async function supabaseAudit(config, token) {
  if (!token)
    return {
      skipped:true,
      reason:"SUPABASE_ACCESS_TOKEN not set",
      projects:[],
      globalChecks:[{
        level:"blocker",
        code:"supabase_audit_unavailable",
        detail:"Supabase verification is required before strict destructive cleanup.",
      }],
    };

  const projects = [];
  for (const entry of config.supabaseProjects || []) {
    const p = { ref:entry.ref, role:entry.role, errors:[] };
    const calls = [
      ["project", "/v1/projects/" + entry.ref],
      ["branches", "/v1/projects/" + entry.ref + "/branches"],
      ["securityAdvisors", "/v1/projects/" + entry.ref + "/advisors/security"],
      ["performanceAdvisors", "/v1/projects/" + entry.ref + "/advisors/performance"],
      ...(entry.migrationSourceDir
        ? [["migrations", "/v1/projects/" + entry.ref + "/database/migrations"]]
        : [])
    ];
    await Promise.all(calls.map(async ([key, endpoint]) => {
      try { p[key] = await sb(endpoint, token); }
      catch (error) { p.errors.push({ key, status:error.status || null, message:error.message }); }
    }));
    p.branches = Array.isArray(p.branches) ? p.branches : p.branches?.branches || [];
    p.securityAdvisors = advisorList(p.securityAdvisors);
    p.performanceAdvisors = advisorList(p.performanceAdvisors);
    p.migrations = Array.isArray(p.migrations) ? p.migrations : p.migrations?.migrations || [];
    p.checks = evaluateSupabaseProject(p, entry);

    if (entry.migrationSourceDir) {
      try {
        if (p.errors.some((error) => error.key === "migrations")) {
          throw new Error("Supabase migration history could not be retrieved");
        }
        const repoFiles = await readdir(entry.migrationSourceDir);
        p.migrationParity = compareMigrationParity(repoFiles, p.migrations);
        if (entry.enforceMigrationParity &&
            (p.migrationParity.repoOnly.length ||
             p.migrationParity.liveOnly.length ||
             p.migrationParity.versionMismatches.length)) {
          p.checks.push({
            level:"blocker",
            code:"migration_history_drift",
            detail:"Git migration history does not reproduce live migration history: " +
              p.migrationParity.repoCount + " repo files vs " +
              p.migrationParity.liveCount + " applied migrations; " +
              p.migrationParity.liveOnly.length + " live-only, " +
              p.migrationParity.repoOnly.length + " repo-only, " +
              p.migrationParity.versionMismatches.length + " version mismatches",
          });
        }
      } catch (error) {
        p.errors.push({
          key:"migrationParity",
          status:null,
          message:error.message,
        });
        if (entry.enforceMigrationParity) {
          p.checks.push({
            level:"blocker",
            code:"migration_parity_unresolved",
            detail:"Could not verify migration parity from " + entry.migrationSourceDir,
          });
        }
      }
    }

    const requiredFailures = p.errors.filter((error) =>
      ["project", "branches", "securityAdvisors", "migrations"].includes(error.key)
    );
    if (requiredFailures.length) {
      p.checks.push({
        level:"blocker",
        code:"supabase_audit_incomplete",
        detail:"Required Supabase checks failed: " +
          requiredFailures.map((error) => error.key).join(", "),
      });
    }

    projects.push(p);
  }

  const refs = new Set(projects.map((p) => p.ref));
  return {
    skipped:false,
    projects,
    globalChecks:refs.size === projects.length ? [] : [{
      level:"blocker",
      code:"duplicate_supabase_authority",
      detail:"Configured Supabase roles must use distinct project refs."
    }]
  };
}

async function applyDeletes(repo, token, branches) {
  const deleted = [], failed = [];
  for (const b of branches.filter((x) => x.classification.decision === "delete_candidate")) {
    try {
      const ref = ["heads", ...b.name.split("/")].map(encodeURIComponent).join("/");
      await gh(repo, "/git/refs/" + ref, token, { method:"DELETE" });
      deleted.push(b.name);
    } catch (error) {
      failed.push({ branch:b.name, status:error.status || null, message:error.message });
    }
  }
  return { deleted, failed };
}

const decisionCounts = (branches) =>
  branches.reduce((a,b) => {
    a[b.classification.decision] = (a[b.classification.decision] || 0) + 1;
    return a;
  }, {});

function markdown(r) {
  const lines = [
    "# Resonance Branch-Cleaner report",
    "",
    "Generated: " + r.generatedAt,
    "Repository: " + r.repository,
    "Mode: " + r.mode,
    "",
    "## Learning sources",
    "",
    "- External audit findings: " + r.learning.audit.findingCount +
      " (" + r.learning.audit.unresolvedCount + " unresolved; " +
      r.learning.audit.highOrVerificationPriority + " P1/P1-verify)",
    "- Remediation backlog items: " + r.learning.audit.backlogCount,
    "- Audit validation state: " + (r.learning.audit.validationState || "unknown"),
    "- Certification status: " + (r.learning.audit.certificationStatus || "not asserted"),
    "- Guardrails loaded: " + r.guardrails.length,
    "",
    "## GitHub branch hygiene",
    "",
    "- Branches inspected: " + r.github.branches.length,
    "- Pull requests indexed: " + r.github.pullRequestCount,
    "- Decisions: " + JSON.stringify(r.github.counts),
    ""
  ];
  for (const b of r.github.branches.filter((x) => x.classification.decision !== "keep")) {
    lines.push("- " + b.name + ": " + b.classification.decision + " / " +
      b.classification.reason + " / ahead=" + (b.classification.ahead ?? "?") +
      " / age=" + (Number.isFinite(b.classification.ageDays) ? b.classification.ageDays.toFixed(1) : "?"));
  }
  lines.push("", "## Supabase control-plane audit", "");
  if (r.supabase.skipped) {
    lines.push("Supabase checks skipped: " + r.supabase.reason);
  } else {
    for (const p of r.supabase.projects) {
      lines.push(
        "### " + p.role + " — " + p.ref,
        "- Project status: " + (p.project?.status || "unknown"),
        "- Branches returned: " + p.branches.length,
        "- Security advisors: " + p.securityAdvisors.length,
        "- Performance advisors: " + p.performanceAdvisors.length
      );
      if (p.migrationParity) {
        lines.push(
          "- Migration parity: repo=" + p.migrationParity.repoCount +
            ", live=" + p.migrationParity.liveCount +
            ", live-only=" + p.migrationParity.liveOnly.length +
            ", repo-only=" + p.migrationParity.repoOnly.length +
            ", version-mismatches=" + p.migrationParity.versionMismatches.length
        );
      }
      for (const c of p.checks) lines.push("- " + c.level + " " + c.code + ": " + c.detail);
      for (const e of p.errors) lines.push("- warning " + e.key + ": " + (e.status || "error") + " " + e.message);
      lines.push("");
    }
  }
  lines.push(
    "## Apply results",
    "",
    "- Deleted: " + (r.apply.deleted.join(", ") || "none"),
    "- Delete failures: " + r.apply.failed.length,
    "- Apply skipped: " + (r.apply.skipped ? (r.apply.reason || "yes") : "no"),
    "",
    "Branch-Cleaner reports evidence; it does not convert deletion, an advisor result, or a published audit into certification."
  );
  return lines.join("\n") + "\n";
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const config = JSON.parse(await readFile(a.config, "utf8"));
  if (Number.isFinite(a.staleDays) && a.staleDays > 0) config.staleDays = a.staleDays;

  const repo = process.env.BRANCH_CLEANER_REPOSITORY || process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!repo || !token) throw new Error("Set GITHUB_REPOSITORY and GITHUB_TOKEN (or GH_TOKEN).");

  const [learning, github, supabase] = await Promise.all([
    learn(config),
    githubAudit(repo, token, config),
    supabaseAudit(config, process.env.SUPABASE_ACCESS_TOKEN)
  ]);

  if (!supabase.skipped) {
    const gitNames = new Set(github.branches.map((b) => b.name));
    for (const p of supabase.projects) {
      for (const b of p.branches) {
        if (b.git_branch && !gitNames.has(b.git_branch)) {
          p.checks.push({
            level:"warning",
            code:"supabase_git_branch_orphan",
            detail:(b.name || b.id) + " maps to missing Git branch " + b.git_branch
          });
        }
      }
    }
  }

  const strictBlockers = getStrictBlockers(supabase);
  const apply = a.apply
    ? (a.strict && strictBlockers.length
      ? {
          deleted:[],
          failed:[],
          skipped:true,
          reason:"strict_control_plane_blockers",
          blockerCount:strictBlockers.length,
        }
      : await applyDeletes(repo, token, github.branches))
    : { deleted:[], failed:[], skipped:false };

  const report = {
    schemaVersion:1,
    generatedAt:new Date().toISOString(),
    repository:repo,
    mode:a.apply ? "apply" : "dry-run",
    guardrails:config.guardrails || [],
    learning,
    github:{ ...github, counts:decisionCounts(github.branches) },
    supabase,
    apply
  };

  await mkdir(a.reportDir, { recursive:true });
  await writeFile(path.join(a.reportDir, "branch-cleaner-report.json"), JSON.stringify(report, null, 2) + "\n");
  await writeFile(path.join(a.reportDir, "branch-cleaner-report.md"), markdown(report));
  process.stdout.write(markdown(report));

  if (a.strict && (strictBlockers.length || apply.failed.length)) process.exitCode = 2;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error("Branch-Cleaner failed: " + (error.stack || error.message));
    process.exitCode = 1;
  });
}

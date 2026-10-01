#!/usr/bin/env node
// Current-main security convergence.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const findings = [];
const roots = ["src", "supabase/functions", "scripts"];

const codeExtension = /\.(?:cjs|js|jsx|mjs|ts|tsx)$/;
const skippedDirectories = new Set([
  ".git",
  ".next",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "test-results",
]);

const secretPatterns = [
  ["supabase-service-role-jwt", /eyJhbGciOi[A-Za-z0-9_.-]{40,}/],
  ["supabase-secret-key", /\bsb_secret_[A-Za-z0-9_-]{20,}/],
  ["openai-key", /\bsk-[A-Za-z0-9]{32,}/],
  ["stripe-live-secret-key", /\bsk_live_[A-Za-z0-9]{20,}/],
  ["aws-access-key", /\bAKIA[0-9A-Z]{16}\b/],
  ["private-key-block", /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/],
];

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (skippedDirectories.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) yield* walk(full);
    else yield full.replaceAll("\\", "/");
  }
}

function isBrowserReachable(file) {
  return file.startsWith("src/") && !file.startsWith("src/app/api/");
}

function add(file, line, rule, detail) {
  findings.push({ file, line, rule, detail });
}

for (const root of roots) {
  for (const file of walk(root)) {
    if (!codeExtension.test(file)) continue;
    const source = readFileSync(file, "utf8");
    const lines = source.split("\n");

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      for (const [name, pattern] of secretPatterns) {
        if (pattern.test(line)) {
          add(file, lineNumber, `secret:${name}`, line.trim().slice(0, 160));
        }
      }

      if (/\beval\s*\(/.test(line) || /\bnew\s+Function\s*\(/.test(line)) {
        add(file, lineNumber, "eval-or-function-constructor", "Dynamic code execution is not permitted in governed application code.");
      }

      if (/(?:NEXT_PUBLIC|VITE)_[A-Z0-9_]*(?:SERVICE_ROLE|SECRET|PRIVATE_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY)/.test(line)) {
        add(file, lineNumber, "public-secret-environment", "A secret-bearing environment variable must never use a browser-public prefix.");
      }

      if (isBrowserReachable(file) && /(?:SUPABASE_SERVICE_ROLE(?:_KEY)?|SERVICE_ROLE_KEY|sb_secret_)/i.test(line)) {
        add(file, lineNumber, "service-role-in-browser-source", "Service-role credentials must remain outside browser-reachable source.");
      }

      if (file.startsWith("src/") && /dangerouslySetInnerHTML/.test(line)) {
        add(file, lineNumber, "dangerously-set-inner-html", "dangerouslySetInnerHTML requires an explicit reviewed exception before use.");
      }
    });
  }
}


const gitleaksPolicyPath = ".gitleaks.toml";
if (!existsSync(gitleaksPolicyPath)) {
  add(gitleaksPolicyPath, 1, "gitleaks-policy-missing", "A repository-local Gitleaks policy is required.");
} else {
  const policy = readFileSync(gitleaksPolicyPath, "utf8");
  const allowlistCount = (policy.match(/\[\[allowlists\]\]/g) || []).length;
  if (!/\[extend\][\s\S]*useDefault\s*=\s*true/.test(policy)) {
    add(gitleaksPolicyPath, 1, "gitleaks-default-rules-disabled", "Gitleaks policy must extend the upstream default rule set.");
  }
  if (allowlistCount !== 2) {
    add(gitleaksPolicyPath, 1, "gitleaks-allowlist-scope", `Expected exactly 2 narrow allowlists, found ${allowlistCount}.`);
  }
  if (!policy.includes("^sb_publishable_")) {
    add(gitleaksPolicyPath, 1, "gitleaks-publishable-key-allowlist", "The only API-key prefix exception must remain the Supabase publishable-key prefix.");
  }
  if (!policy.includes("apps/ronsas/syncvision/src/lib/billingReminder\\.ts")) {
    add(gitleaksPolicyPath, 1, "gitleaks-storage-key-path", "The localStorage-key exception must remain path-scoped to SyncVision billingReminder.ts.");
  }
  if (/sb_secret_|service[_-]?role|BEGIN .*PRIVATE KEY/i.test(policy)) {
    add(gitleaksPolicyPath, 1, "gitleaks-secret-allowlist", "Secret/service-role/private-key patterns must never be allowlisted.");
  }
  if (/paths\s*=\s*\[\s*['"]{1,3}(?:\.\*|\^?\.\*\$?)['"]{1,3}/m.test(policy)) {
    add(gitleaksPolicyPath, 1, "gitleaks-broad-path-allowlist", "Repository-wide path allowlists are forbidden.");
  }
}

if (findings.length) {
  console.error(`Security invariants failed with ${findings.length} finding(s).\n`);
  for (const finding of findings) {
    console.error(`[${finding.rule}] ${finding.file}:${finding.line}\n  ${finding.detail}`);
  }
  process.exit(1);
}

console.log("Security invariants passed.");

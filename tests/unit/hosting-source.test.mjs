import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const vercel=JSON.parse(readFileSync(new URL("../../vercel.json",import.meta.url),"utf8"));
const readme=readFileSync(new URL("../../README.md",import.meta.url),"utf8");
const deployment=readFileSync(new URL("../../docs/DEPLOYMENT.md",import.meta.url),"utf8");
const architecture=readFileSync(new URL("../../docs/ARCHITECTURE.md",import.meta.url),"utf8");
const pages=readFileSync(new URL("../../.github/workflows/pages.yml",import.meta.url),"utf8");

test("GitHub Pages is the active DataNest public host",()=>{
  assert.match(readme,/Primary free host: \*\*GitHub Pages\*\*/);
  assert.match(deployment,/GitHub Pages is the active public host/);
  assert.match(architecture,/active public DataNest frontend is deployed by GitHub Actions to \*\*GitHub Pages\*\*/);
  assert.match(pages,/name: Deploy GitHub Pages/);
});

test("Vercel automatic Git deployments are disabled",()=>{
  assert.equal(vercel.git?.deploymentEnabled,false);
  assert.doesNotMatch(readme,/Optional Vercel deployment/);
  assert.match(architecture,/Vercel is disabled for this repository/);
});

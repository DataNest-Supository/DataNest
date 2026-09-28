import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const outDir=path.join(repoRoot,"out");
const expectedOrigin="https://reson8.life";

assert.equal(
  (process.env.DATANEST_PUBLIC_ORIGIN||"").replace(/\/+$/,""),
  expectedOrigin,
  "Root-domain validation must run against the canonical reson8.life origin."
);
assert.equal(
  process.env.NEXT_PUBLIC_BASE_PATH??"",
  "",
  "The reson8.life build must not use a project-path basePath."
);

await access(path.join(outDir,"index.html"));
await access(path.join(outDir,"runtime-config.js"));
await access(path.join(outDir,"release-manifest.json"));
await access(path.join(outDir,"apps","index.html"));

const home=await readFile(path.join(outDir,"index.html"),"utf8");
assert.doesNotMatch(home,/\/DataNest\//,"Root-domain HTML must not emit the legacy /DataNest prefix.");
assert.match(home,/\/_next\/static\//,"Root-domain HTML must reference Next.js assets from /_next.");

const release=JSON.parse(await readFile(path.join(outDir,"release-manifest.json"),"utf8"));
assert.equal(release.publicOrigin,expectedOrigin);
assert.equal(release.basePath,"");
assert.equal(release.deliveryTarget,"lovable-domain");

const manifest=JSON.parse(await readFile(path.join(outDir,"apps","manifest.json"),"utf8"));
assert.equal(manifest.contract,"datanest-ronsas-apps@1");
assert.equal(manifest.publicOrigin,expectedOrigin);
assert.equal(manifest.deliveryTarget,"lovable-domain");
assert.equal(manifest.hubPath,"/apps/");
assert.ok(Array.isArray(manifest.apps)&&manifest.apps.length>=7);
for(const app of manifest.apps){
  assert.equal(app.path,`/apps/${app.slug}/`);
  await access(path.join(outDir,"apps",app.slug,"index.html"));
}

console.log(`Verified root-domain DataNest artifact for ${expectedOrigin} with ${manifest.apps.length} hosted RONSAS apps.`);

import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { validateRonsasLaunchRegistryText } from "./lib/ronsas-import-validation.mjs";

const root = process.cwd();

const required = [
  "apps/ronsas/shared/legal-contract.json",
  "apps/ronsas/shared/resonance-brand-contract.json",
  "apps/ronsas/epublisher/package.json",
  "apps/ronsas/epublisher/package-lock.json",
  "apps/ronsas/creative-studio/package.json",
  "apps/ronsas/creative-studio/package-lock.json",
  "apps/ronsas/syncvision/package.json",
  "apps/ronsas/syncvision/package-lock.json",
  "apps/ronsas/syncvision/scripts/vendor-ffmpeg-core.mjs",
  "apps/ronsas/career-compass/package.json",
  "apps/ronsas/career-compass/package-lock.json",
  "apps/ronsas/sovereign-forge/package.json",
  "apps/ronsas/sovereign-forge/package-lock.json",
  "apps/ronsas/lyricsync-studio/package.json",
  "apps/ronsas/lyricsync-studio/package-lock.json",
  "apps/ronsas/scene-song-spark/package.json",
  "apps/ronsas/scene-song-spark/package-lock.json",
  "apps/ronsas/youtube-optimizer/package.json",
  "apps/ronsas/youtube-optimizer/bun.lock",
  "apps/ronsas/sovereign-backend/requirements-dev.txt",
  "apps/ronsas/syncvision/runtime/musetalk/musetalk_bridge.py",
  "ops/ronsas/ealiophin/START-SYNCVISION-MUSETALK.ps1",
  "ops/ronsas/ealiophin/RONSAS-MODULES.json",
  "ops/ronsas/ealiophin/START-RONSAS-DATANEST.ps1",
  "ops/ronsas/ealiophin/INSTALL-RONSAS-SUPERVISOR.ps1",
  "ops/ronsas/ealiophin/RONSAS-SUPERVISOR.ps1",
];

const controlRequired = [
  "ops/ronsas/ealiophin/RONSAS-MODULES.json",
  "ops/ronsas/ealiophin/START-RONSAS-DATANEST.ps1",
  "ops/ronsas/ealiophin/STATUS-RONSAS-DATANEST.ps1",
  "ops/ronsas/ealiophin/STOP-RONSAS-DATANEST.ps1",
  "ops/ronsas/ealiophin/rons-control.example.json",
  "ops/ronsas/ealiophin/README.md",
];

const syncVisionCore = {
  "version": "0.12.10",
  "resolved": "https://registry.npmjs.org/@ffmpeg/core/-/core-0.12.10.tgz",
  "integrity": "sha512-dzNplnn2Nxle2c2i2rrDhqcB19q9cglCkWnoMTDN9Q9l3PvdjZWd1HfSPjCNWc/p8Q3CT+Es9fWOR0UhAeYQZA=="
};

const syncVisionFallbackAssets = new Map([
  ["apps/ronsas/syncvision/public/og-v2.png", 89407],
  ["apps/ronsas/syncvision/public/og-v3.png", 89407],
  ["apps/ronsas/syncvision/src/assets/resonance-app-dev-logo.png", 632680],
]);

const failures = [];

const launchRegistryPath = resolve(root, "src/lib/ronsasApps.ts");
if (existsSync(launchRegistryPath)) {
  failures.push(
    ...validateRonsasLaunchRegistryText(readFileSync(launchRegistryPath, "utf8"))
  );
}


for (const rel of [...required, ...controlRequired]) {
  const path = resolve(root, rel);
  if (!existsSync(path)) {
    failures.push(`missing required RONSAS source/control file: ${rel}`);
    continue;
  }
  if (statSync(path).size === 0) {
    failures.push(`required RONSAS source/control file is empty: ${rel}`);
  }
}

for (const [rel, expectedSize] of syncVisionFallbackAssets) {
  const path = resolve(root, rel);
  if (!existsSync(path)) {
    failures.push(`missing governed SyncVision fallback asset: ${rel}`);
    continue;
  }
  const actual = statSync(path).size;
  if (actual !== expectedSize) {
    failures.push(`SyncVision fallback asset size mismatch: ${rel} expected ${expectedSize} bytes, got ${actual}`);
  }
}

const syncVisionPackagePath = resolve(root, "apps/ronsas/syncvision/package.json");
const syncVisionLockPath = resolve(root, "apps/ronsas/syncvision/package-lock.json");
const syncVisionVendorPath = resolve(root, "apps/ronsas/syncvision/scripts/vendor-ffmpeg-core.mjs");
if (existsSync(syncVisionPackagePath) && existsSync(syncVisionLockPath) && existsSync(syncVisionVendorPath)) {
  try {
    const pkg = JSON.parse(readFileSync(syncVisionPackagePath, "utf8"));
    const lock = JSON.parse(readFileSync(syncVisionLockPath, "utf8"));
    const locked = lock.packages?.["node_modules/@ffmpeg/core"];
    if (pkg.dependencies?.["@ffmpeg/core"] !== syncVisionCore.version) failures.push("SyncVision must pin @ffmpeg/core 0.12.10");
    if (pkg.scripts?.["vendor:ffmpeg-core"] !== "node scripts/vendor-ffmpeg-core.mjs") failures.push("SyncVision FFmpeg vendor script is not canonical");
    if (pkg.scripts?.prebuild !== "npm run vendor:ffmpeg-core" || pkg.scripts?.predev !== "npm run vendor:ffmpeg-core") failures.push("SyncVision must vendor FFmpeg before build and dev");
    if (lock.packages?.[""]?.dependencies?.["@ffmpeg/core"] !== syncVisionCore.version) failures.push("SyncVision lock root does not pin @ffmpeg/core 0.12.10");
    if (!locked || locked.version !== syncVisionCore.version || locked.resolved !== syncVisionCore.resolved || locked.integrity !== syncVisionCore.integrity) failures.push("SyncVision @ffmpeg/core lock integrity does not match the governed package");
    const vendor = readFileSync(syncVisionVendorPath, "utf8");
    for (const token of ["node_modules", "@ffmpeg", "core", "dist", "esm", "ffmpeg-core.js", "ffmpeg-core.wasm", "public", "ffmpeg-core"]) {
      if (!vendor.includes(token)) failures.push(`SyncVision vendor script missing token: ${token}`);
    }
  } catch (error) {
    failures.push(`invalid SyncVision FFmpeg vendoring contract: ${error.message}`);
  }
}

for (const rel of [
  "apps/ronsas/epublisher/package.json",
  "apps/ronsas/creative-studio/package.json",
  "apps/ronsas/syncvision/package.json",
  "apps/ronsas/career-compass/package.json",
  "apps/ronsas/sovereign-forge/package.json",
  "apps/ronsas/lyricsync-studio/package.json",
  "apps/ronsas/scene-song-spark/package.json",
  "apps/ronsas/youtube-optimizer/package.json",
  "ops/ronsas/ealiophin/RONSAS-MODULES.json",
  "ops/ronsas/ealiophin/rons-control.example.json",
]) {
  const path = resolve(root, rel);
  if (!existsSync(path)) continue;
  try {
    JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    failures.push(`invalid JSON in ${rel}: ${error.message}`);
  }
}

const registryPath = resolve(root, "ops/ronsas/ealiophin/RONSAS-MODULES.json");
if (existsSync(registryPath)) {
  try {
    const registry = JSON.parse(readFileSync(registryPath, "utf8"));
    if (registry.schema !== "datanest.ronsas.module-registry.v2") {
      failures.push(`unexpected RONSAS registry schema: ${registry.schema}`);
    }
    if (registry.repository !== "DataNest-Supository/DataNest") {
      failures.push(`RONSAS registry authority is not DataNest-Supository/DataNest: ${registry.repository}`);
    }
    if (registry.policy?.singleRepositoryAuthority !== true) {
      failures.push("RONSAS registry must assert singleRepositoryAuthority=true");
    }
    if (registry.policy?.billingState !== "free-promotion" || registry.policy?.paidCheckoutActive !== false) {
      failures.push("RONSAS registry must preserve free-promotion / no-paid-checkout policy");
    }

    const expectedSources = new Map([
      ["epublisher", "apps/ronsas/epublisher"],
      ["creative-studio", "apps/ronsas/creative-studio"],
      ["syncvision", "apps/ronsas/syncvision"],
      ["youtube-optimizer", "apps/ronsas/youtube-optimizer"],
      ["career-compass", "apps/ronsas/career-compass"],
      ["sovereign-forge", "apps/ronsas/sovereign-forge"],
      ["lyricsync-studio", "apps/ronsas/lyricsync-studio"],
      ["scene-song-spark", "apps/ronsas/scene-song-spark"],
      ["sovereign-backend", "apps/ronsas/sovereign-backend"],
    ]);
    for (const [id, expectedSource] of expectedSources) {
      const module = registry.modules?.find((entry) => entry.id === id);
      if (!module) {
        failures.push(`RONSAS registry missing module: ${id}`);
      } else if (module.source !== expectedSource) {
        failures.push(`RONSAS registry source mismatch for ${id}: expected ${expectedSource}, got ${module.source}`);
      }
    }
  } catch (error) {
    failures.push(`invalid DataNest RONSAS registry: ${error.message}`);
  }
}

for (const rel of controlRequired.filter((path) => path.endsWith(".ps1") || path.endsWith(".json"))) {
  const path = resolve(root, rel);
  if (!existsSync(path)) continue;
  const source = readFileSync(path, "utf8");
  for (const forbidden of [
    "resonance36912-cell/RONSAS",
    "rons-sovereign-codebase",
    "Resonance\\OpenNova",
  ]) {
    if (source.includes(forbidden)) {
      failures.push(`active DataNest RONSAS control plane contains retired authority '${forbidden}' in ${rel}`);
    }
  }
}

if (existsSync(registryPath)) {
  try {
    const registry = JSON.parse(readFileSync(registryPath, "utf8"));
    if (registry.repository !== "DataNest-Supository/DataNest") {
      failures.push("RONSAS module registry source authority is not DataNest-Supository/DataNest");
    }
    if (registry.policy?.paidCheckoutActive !== false || registry.policy?.billingState !== "free-promotion") {
      failures.push("RONSAS module registry does not preserve the free-promotion billing policy");
    }
    const museTalk = registry.modules?.find((module) => module.id === "syncvision-musetalk");
    if (!museTalk) {
      failures.push("RONSAS module registry is missing syncvision-musetalk");
    } else {
      if (museTalk.health !== "http://127.0.0.1:7863/health") {
        failures.push("SyncVision MuseTalk health endpoint must remain localhost-only on port 7863");
      }
      if (museTalk.required !== false) {
        failures.push("SyncVision MuseTalk must remain optional until machine-local model prerequisites are installed");
      }
    }
  } catch (error) {
    failures.push(`invalid RONSAS module registry: ${error.message}`);
  }
}

for (const [rel, forbidden] of [
  ["ops/ronsas/ealiophin/START-SYNCVISION-MUSETALK.ps1", ["Resonance\\\\OpenNova", "rons-sovereign-codebase", "resonance36912-cell/RONSAS"]],
  ["ops/ronsas/ealiophin/START-RONSAS-DATANEST.ps1", ["Resonance\\\\OpenNova", "rons-sovereign-codebase", "resonance36912-cell/RONSAS"]],
]) {
  const path = resolve(root, rel);
  if (!existsSync(path)) continue;
  const source = readFileSync(path, "utf8");
  for (const token of forbidden) {
    if (source.includes(token)) failures.push(`legacy authority token remains in ${rel}: ${token}`);
  }
}


const sourceAuthorities = new Map([
  ["apps/ronsas/epublisher/RONSAS-SOURCE-AUTHORITY.json", "apps/ronsas/epublisher"],
  ["apps/ronsas/creative-studio/RONSAS-SOURCE-AUTHORITY.json", "apps/ronsas/creative-studio"],
  ["apps/ronsas/syncvision/RONSAS-SOURCE-AUTHORITY.json", "apps/ronsas/syncvision"],
  ["apps/ronsas/youtube-optimizer/RONSAS-SOURCE-AUTHORITY.json", "apps/ronsas/youtube-optimizer"],
  ["apps/ronsas/sovereign-backend/RONSAS-SOURCE-AUTHORITY.json", "apps/ronsas/sovereign-backend"],
]);
for (const [rel, expectedSource] of sourceAuthorities) {
  const path = resolve(root, rel);
  if (!existsSync(path)) {
    failures.push(`missing RONSAS source-authority file: ${rel}`);
    continue;
  }
  try {
    const authority = JSON.parse(readFileSync(path, "utf8").replace(/^\\uFEFF/, ""));
    if (authority.repository !== "https://github.com/DataNest-Supository/DataNest") {
      failures.push(`RONSAS source authority is not DataNest in ${rel}: ${authority.repository}`);
    }
    if (authority.ronsas_repository && authority.ronsas_repository !== "https://github.com/DataNest-Supository/DataNest") {
      failures.push(`RONSAS control authority is stale in ${rel}: ${authority.ronsas_repository}`);
    }
    if (authority.control_repository && authority.control_repository !== "https://github.com/DataNest-Supository/DataNest") {
      failures.push(`RONSAS control authority is stale in ${rel}: ${authority.control_repository}`);
    }
    if (authority.source_path !== expectedSource) {
      failures.push(`RONSAS source path mismatch in ${rel}: expected ${expectedSource}, got ${authority.source_path}`);
    }
    if (authority.authority_state !== "active" || authority.historical_authority !== "evidence-only") {
      failures.push(`RONSAS authority state is not active/evidence-only in ${rel}`);
    }
  } catch (error) {
    failures.push(`invalid RONSAS source-authority JSON in ${rel}: ${error.message}`);
  }
}


const legalContractPath = resolve(root, "apps/ronsas/shared/legal-contract.json");
if (existsSync(legalContractPath)) {
  try {
    const raw = readFileSync(legalContractPath, "utf8");
    const contract = JSON.parse(raw);
    const expectedRoutes = {
      legal:"/legal",
      governance:"/governance",
      privacy:"/privacy",
      terms:"/terms",
      disclaimers:"/disclaimers",
      acceptableUse:"/acceptable-use",
      intellectualProperty:"/intellectual-property",
      accessibility:"/accessibility"
    };
    if (contract.schema !== "datanest.ronsas.legal-contract.v1") failures.push("unexpected cross-app legal contract schema");
    if (contract.legalOperator !== "Resonance Sole Proprietorship") failures.push("cross-app legal contract legal operator mismatch");
    if (contract.businessBrand !== "Resonance App Development") failures.push("cross-app legal contract business brand mismatch");
    if (contract.platform !== "Resonance DataNest") failures.push("cross-app legal contract platform mismatch");
    if (contract.governanceLabel !== "RSGP Governed") failures.push("cross-app legal contract governance label mismatch");
    if (contract.policyState !== "review-gated") failures.push("cross-app legal contract must remain review-gated");
    if (contract.commercialState !== "free-promotion" || contract.paidCheckoutActive !== false) failures.push("cross-app legal contract must preserve free-promotion / no-paid-checkout policy");
    if (JSON.stringify(contract.routes) !== JSON.stringify(expectedRoutes)) failures.push("cross-app legal contract route map mismatch");
    if (/RSGP\s+(?:means|stands for|is short for)/i.test(raw)) failures.push("cross-app legal contract invents an RSGP expansion");
    if (/"policyState"\s*:\s*"approved"/i.test(raw)) failures.push("cross-app legal contract cannot mark policy approved before human/legal review");
    if (/encryption|retention|jurisdiction|waiver|indemnif|liabilit/i.test(raw)) failures.push("cross-app legal contract must stay structural and avoid substantive policy promises");
  } catch (error) {
    failures.push(`invalid cross-app legal contract: ${error.message}`);
  }
}

if (failures.length) {
  console.error("RONSAS import/control contract validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RONSAS import and DataNest control-plane contract validation passed.");

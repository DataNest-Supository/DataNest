import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const required = [
  "apps/ronsas/epublisher/package.json",
  "apps/ronsas/epublisher/package-lock.json",
  "apps/ronsas/creative-studio/package.json",
  "apps/ronsas/creative-studio/package-lock.json",
  "apps/ronsas/syncvision/package.json",
  "apps/ronsas/syncvision/package-lock.json",
  "apps/ronsas/youtube-optimizer/package.json",
  "apps/ronsas/youtube-optimizer/bun.lock",
  "apps/ronsas/sovereign-backend/requirements-dev.txt",
];

const controlRequired = [
  "ops/ronsas/ealiophin/RONSAS-MODULES.json",
  "ops/ronsas/ealiophin/START-RONSAS-DATANEST.ps1",
  "ops/ronsas/ealiophin/STATUS-RONSAS-DATANEST.ps1",
  "ops/ronsas/ealiophin/STOP-RONSAS-DATANEST.ps1",
  "ops/ronsas/ealiophin/rons-control.example.json",
  "ops/ronsas/ealiophin/README.md",
];

const criticalAssets = new Map([
  ["apps/ronsas/syncvision/public/ffmpeg-core/ffmpeg-core.wasm", 32129114],
  ["apps/ronsas/syncvision/public/og-v2.png", 1746155],
  ["apps/ronsas/syncvision/public/og-v3.png", 1620052],
  ["apps/ronsas/syncvision/src/assets/resonance-app-dev-logo.png", 1833523],
]);

const failures = [];

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

for (const [rel, expectedSize] of criticalAssets) {
  const path = resolve(root, rel);
  if (!existsSync(path)) {
    failures.push(`missing critical SyncVision asset: ${rel}`);
    continue;
  }
  const actual = statSync(path).size;
  if (actual !== expectedSize) {
    failures.push(`SyncVision asset size mismatch: ${rel} expected ${expectedSize} bytes, got ${actual}`);
  }
}

for (const rel of [
  "apps/ronsas/epublisher/package.json",
  "apps/ronsas/creative-studio/package.json",
  "apps/ronsas/syncvision/package.json",
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

if (failures.length) {
  console.error("RONSAS import/control contract validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RONSAS import and DataNest control-plane contract validation passed.");

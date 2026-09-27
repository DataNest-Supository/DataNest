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

const criticalAssets = new Map([
  ["apps/ronsas/syncvision/public/ffmpeg-core/ffmpeg-core.wasm", 32129114],
  ["apps/ronsas/syncvision/public/og-v2.png", 1746155],
  ["apps/ronsas/syncvision/public/og-v3.png", 1620052],
  ["apps/ronsas/syncvision/src/assets/resonance-app-dev-logo.png", 1833523],
]);

const failures = [];

for (const rel of required) {
  const path = resolve(root, rel);
  if (!existsSync(path)) {
    failures.push(`missing required RONSAS source file: ${rel}`);
    continue;
  }
  if (statSync(path).size === 0) {
    failures.push(`required RONSAS source file is empty: ${rel}`);
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
]) {
  const path = resolve(root, rel);
  if (!existsSync(path)) continue;
  try {
    JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    failures.push(`invalid JSON in ${rel}: ${error.message}`);
  }
}

if (failures.length) {
  console.error("RONSAS import contract validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RONSAS import contract validation passed.");

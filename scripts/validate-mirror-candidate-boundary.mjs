import { readFileSync, writeFileSync } from "node:fs";
import { classifyPaths, loadBoundary } from "./lib/repository-boundary.mjs";

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const pathsFile = arg("--paths-file");
const contractPath = arg("--contract") ?? "config/repository-boundary.json";
const outputPath = arg("--output");

if (!pathsFile) throw new Error("Usage: node scripts/validate-mirror-candidate-boundary.mjs --paths-file <file> [--contract <file>] [--output <file>]");

const boundary = loadBoundary(contractPath);
const paths = readFileSync(pathsFile, "utf8").split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
const classifications = classifyPaths([...new Set(paths)], boundary);
const blocked = classifications.filter((item) => item.policy !== "promotable");
const promotablePaths = classifications.filter((item) => item.policy === "promotable").map((item) => item.path);

const report = {
  schemaVersion: "mirror-candidate-boundary-v1",
  sourcePathCount: classifications.length,
  promotablePaths,
  classifications,
  blocked
};

if (outputPath) writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n", "utf8");

if (blocked.length) {
  for (const item of blocked) {
    console.error(`Boundary blocked: ${item.path} -> ${item.policy} (${item.pattern ?? "unclassified"})`);
  }
  process.exit(1);
}

console.log(`Mirror candidate boundary clean: ${promotablePaths.length} promotable path(s).`);

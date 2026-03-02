import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const outDir = path.join(root, "release");
const outFile = path.join(outDir, "manifest.json");

function safeGit(command, fallback = "unknown") {
  try {
    return execSync(command, { cwd: root, encoding: "utf8" }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function getPackageVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  return pkg.version || "0.0.0";
}

const manifest = {
  appName: "is601_demo",
  version: getPackageVersion(),
  gitSha: safeGit("git rev-parse --short HEAD"),
  gitBranch: safeGit("git rev-parse --abbrev-ref HEAD"),
  builtAt: new Date().toISOString(),
  nodeVersion: process.version,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`Release manifest generated at ${outFile}\n`);

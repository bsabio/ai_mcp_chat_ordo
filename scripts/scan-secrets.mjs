import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ALLOWLIST = new Set([".env.example", "package-lock.json"]);

const SECRET_PATTERNS = [
  /sk-ant-[A-Za-z0-9_\-]+/g,
  /sk-proj-[A-Za-z0-9_\-]+/g,
  /ANTHROPIC_API_KEY\s*=\s*sk-[A-Za-z0-9_\-]+/g,
  /OPENAI_API_KEY\s*=\s*sk-[A-Za-z0-9_\-]+/g,
];

function getTrackedFiles() {
  const output = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" });
  return output
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => !ALLOWLIST.has(entry));
}

function scanFile(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return [];
  }

  const stat = fs.statSync(absolutePath);
  if (!stat.isFile()) {
    return [];
  }

  const content = fs.readFileSync(absolutePath, "utf8");
  const hits = [];

  for (const pattern of SECRET_PATTERNS) {
    const found = content.match(pattern);
    if (found) {
      hits.push(...found.map((value) => ({ file: relativePath, value })));
    }
  }

  return hits;
}

function main() {
  const files = getTrackedFiles();
  const findings = files.flatMap(scanFile);

  if (findings.length > 0) {
    process.stderr.write("Potential secrets detected in tracked files:\n");
    for (const finding of findings) {
      process.stderr.write(`- ${finding.file}: ${finding.value.slice(0, 18)}...\n`);
    }
    process.exit(1);
  }

  process.stdout.write("Secret scan passed.\n");
}

main();

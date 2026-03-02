import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const targets = ["src/app/api", "src/lib/chat"];
const allowListPatterns = [
  /const\s+warnedLegacyKeys\s*=\s*new Set/, // controlled one-time deprecation warning cache
];

function collectFiles(directory) {
  const absolute = path.join(root, directory);
  if (!fs.existsSync(absolute)) {
    return [];
  }

  const entries = fs.readdirSync(absolute, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(relative));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(relative);
    }
  }

  return files;
}

function hasForbiddenTopLevelMutableState(content) {
  const lines = content.split("\n");
  let depth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    for (const char of line) {
      if (char === "{") depth += 1;
      if (char === "}") depth = Math.max(0, depth - 1);
    }

    if (depth === 0 && /^let\s+/.test(trimmed)) {
      const isAllowed = allowListPatterns.some((pattern) => pattern.test(trimmed));
      if (!isAllowed) {
        return true;
      }
    }
  }

  return false;
}

const files = targets.flatMap(collectFiles);
const offenders = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(root, file), "utf8");
  if (hasForbiddenTopLevelMutableState(content)) {
    offenders.push(file);
  }
}

if (offenders.length > 0) {
  process.stderr.write("Found forbidden module-level mutable state:\n");
  for (const file of offenders) {
    process.stderr.write(`- ${file}\n`);
  }
  process.exit(1);
}

process.stdout.write("Stateless runtime check passed.\n");

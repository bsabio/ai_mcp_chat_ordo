import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = [".env.example", ".env.staging.example", ".env.production.example"];

function parseKeys(fileName) {
  const filePath = path.join(root, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing env template: ${fileName}`);
  }

  const content = fs.readFileSync(filePath, "utf8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => line.split("=")[0].trim())
    .sort();
}

const baseline = parseKeys(files[0]);
for (const file of files.slice(1)) {
  const keys = parseKeys(file);
  if (JSON.stringify(keys) !== JSON.stringify(baseline)) {
    throw new Error(
      `Environment key mismatch in ${file}. Expected keys: ${baseline.join(", ")}, got: ${keys.join(", ")}`,
    );
  }
}

process.stdout.write("Environment parity validation passed.\n");

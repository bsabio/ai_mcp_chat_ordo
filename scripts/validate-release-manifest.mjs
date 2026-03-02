import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "release", "manifest.json");

if (!fs.existsSync(manifestPath)) {
  process.stderr.write("Missing release/manifest.json. Run npm run release:prepare first.\n");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const required = ["appName", "version", "gitSha", "builtAt", "nodeVersion"];

for (const key of required) {
  if (!manifest[key]) {
    process.stderr.write(`Invalid release manifest. Missing key: ${key}\n`);
    process.exit(1);
  }
}

process.stdout.write("Release manifest validation passed.\n");

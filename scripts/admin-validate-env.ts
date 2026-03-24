import { loadLocalEnv } from "./load-local-env";
import { getEnvValidationReport } from "../src/lib/admin/processes";

loadLocalEnv();

function main() {
  const report = getEnvValidationReport();
  const output = `${JSON.stringify(report)}\n`;

  if (report.status === "error") {
    process.stderr.write(output);
    process.exit(1);
  }

  process.stdout.write(output);
}

main();

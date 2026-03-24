import { loadLocalEnv } from "./load-local-env";
import { getEnvValidationReport } from "../src/lib/admin/processes";

loadLocalEnv();

function main() {
  const report = getEnvValidationReport();

  if (report.status === "error") {
    process.stderr.write(`${report.message}\n`);
    process.exit(1);
  }

  process.stdout.write(`${report.message}\n`);
}

main();

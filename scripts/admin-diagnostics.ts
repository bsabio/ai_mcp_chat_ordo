import { getDiagnosticsReport } from "../src/lib/admin/processes";

function main() {
  const report = getDiagnosticsReport();
  process.stdout.write(`${JSON.stringify(report)}\n`);
}

main();

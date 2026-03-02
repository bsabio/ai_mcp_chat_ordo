import { getHealthSweepReport } from "../src/lib/admin/processes";

function main() {
  const report = getHealthSweepReport();

  if (report.status === "error") {
    process.stderr.write(`${JSON.stringify(report)}\n`);
    process.exit(1);
  }

  process.stdout.write(`${JSON.stringify(report)}\n`);
}

main();

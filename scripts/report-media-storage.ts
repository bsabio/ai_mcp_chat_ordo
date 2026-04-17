import { getUserFileDataMapper } from "../src/adapters/RepositoryFactory";
import { reconcileMediaStorage } from "../src/lib/storage/media-storage-accounting";

async function main() {
  const report = await reconcileMediaStorage(getUserFileDataMapper());
  process.stdout.write(`${JSON.stringify(report)}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
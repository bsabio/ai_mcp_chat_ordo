import { loadLocalEnv } from "./load-local-env";
import { runDeferredJobRuntime } from "@/lib/jobs/deferred-job-runtime";

loadLocalEnv();

async function main() {
  const controller = new AbortController();
  const runOnce = process.env.DEFERRED_JOB_RUN_ONCE === "1";

  const shutdown = () => {
    controller.abort();
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  const summary = await runDeferredJobRuntime({
    workerId: process.env.DEFERRED_JOB_WORKER_ID ?? "worker_local",
    signal: runOnce ? undefined : controller.signal,
    singlePass: runOnce,
  });

  if (summary.lastResult?.outcome === "failed") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[deferred-jobs] fatal", error);
  process.exitCode = 1;
});

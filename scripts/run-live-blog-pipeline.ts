import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { loadLocalEnv } from "./load-local-env";

interface CliOptions {
  brief: string;
  audience?: string;
  objective?: string;
  tone?: string;
  enhanceImagePrompt?: boolean;
  keepWorkspace: boolean;
}

function parseBooleanFlag(value: string | undefined, label: string): boolean {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`${label} must be true or false.`);
}

function parseArgs(argv: string[]): CliOptions {
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      flags.add(key);
      continue;
    }

    values.set(key, next);
    index += 1;
  }

  return {
    brief: values.get("brief")
      ?? "Write a practical article for operations leaders on how to turn a backlog of ad hoc support requests into a repeatable triage workflow.",
    audience: values.get("audience"),
    objective: values.get("objective"),
    tone: values.get("tone"),
    enhanceImagePrompt: values.has("enhance-image-prompt")
      ? parseBooleanFlag(values.get("enhance-image-prompt"), "--enhance-image-prompt")
      : undefined,
    keepWorkspace: flags.has("keep-workspace"),
  };
}

async function main(): Promise<void> {
  loadLocalEnv();

  const options = parseArgs(process.argv.slice(2));
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "studio-ordo-live-blog-"));
  const dbPath = path.join(tempRoot, "live-blog-pipeline.db");
  const assetRoot = path.join(tempRoot, "blog-assets");

  process.env.STUDIO_ORDO_DB_PATH = dbPath;
  process.env.STUDIO_ORDO_BLOG_ASSET_ROOT = assetRoot;

  const [
    { getDb },
    { JobQueueDataMapper },
    { UserDataMapper },
    { ConversationDataMapper },
    { BlogPostDataMapper },
    { BlogAssetDataMapper },
    { BlogPostArtifactDataMapper },
    { DeferredJobWorker },
    { createDeferredJobHandlers },
  ] = await Promise.all([
    import("@/lib/db"),
    import("@/adapters/JobQueueDataMapper"),
    import("@/adapters/UserDataMapper"),
    import("@/adapters/ConversationDataMapper"),
    import("@/adapters/BlogPostDataMapper"),
    import("@/adapters/BlogAssetDataMapper"),
    import("@/adapters/BlogPostArtifactDataMapper"),
    import("@/lib/jobs/deferred-job-worker"),
    import("@/lib/jobs/deferred-job-handlers"),
  ]);

  const db = getDb();
  const userRepo = new UserDataMapper(db);
  const conversationRepo = new ConversationDataMapper(db);
  const jobRepo = new JobQueueDataMapper(db);
  const postRepo = new BlogPostDataMapper(db);
  const assetRepo = new BlogAssetDataMapper(db);
  const artifactRepo = new BlogPostArtifactDataMapper(db);

  const conversationId = `live_blog_conv_${Date.now()}`;
  const user = await userRepo.create({
    email: `live-blog-${Date.now()}@example.com`,
    name: "Live Blog Pipeline",
    passwordHash: "live-blog-pipeline",
  });

  await conversationRepo.create({
    id: conversationId,
    userId: user.id,
    title: "Live blog pipeline verification",
    sessionSource: "authenticated",
  });

  const userId = user.id;
  const job = await jobRepo.createJob({
    conversationId,
    userId,
    toolName: "produce_blog_article",
    dedupeKey: `live:${Date.now()}`,
    initiatorType: "user",
    requestPayload: {
      brief: options.brief,
      ...(options.audience ? { audience: options.audience } : {}),
      ...(options.objective ? { objective: options.objective } : {}),
      ...(options.tone ? { tone: options.tone } : {}),
      ...(typeof options.enhanceImagePrompt === "boolean"
        ? { enhance_image_prompt: options.enhanceImagePrompt }
        : {}),
    },
  });

  await jobRepo.appendEvent({
    jobId: job.id,
    conversationId,
    eventType: "queued",
    payload: { toolName: job.toolName },
  });

  const worker = new DeferredJobWorker(jobRepo, createDeferredJobHandlers());

  console.log(JSON.stringify({
    status: "running",
    workspace: tempRoot,
    dbPath,
    assetRoot,
    jobId: job.id,
    brief: options.brief,
  }, null, 2));

  const outcome = await worker.runNext({
    workerId: "live_blog_pipeline_worker",
  });

  const currentJob = await jobRepo.findJobById(job.id);
  const jobEvents = await jobRepo.listEventsForUserJob(userId, job.id, { limit: 50 });

  if (!currentJob) {
    throw new Error(`Deferred job disappeared during live run: ${job.id}`);
  }

  if (outcome.outcome !== "succeeded" || !currentJob.resultPayload) {
    console.error(JSON.stringify({
      status: "failed",
      workspace: tempRoot,
      jobId: job.id,
      outcome: outcome.outcome,
      errorMessage: currentJob.errorMessage ?? outcome.errorMessage ?? "Unknown deferred job failure.",
      progressLabel: currentJob.progressLabel,
      progressPercent: currentJob.progressPercent,
      events: jobEvents.map((event) => ({
        sequence: event.sequence,
        eventType: event.eventType,
        payload: event.payload,
        createdAt: event.createdAt,
      })),
    }, null, 2));

    process.exitCode = 1;
    return;
  }

  const result = currentJob.resultPayload as {
    id: string;
    imageAssetId: string;
    stages: string[];
    summary: string;
  };
  const post = await postRepo.findById(result.id);
  const asset = await assetRepo.findById(result.imageAssetId);
  const artifacts = await artifactRepo.listByPost(result.id);
  const assetExists = asset
    ? await fs.access(path.join(assetRoot, asset.storagePath)).then(() => true).catch(() => false)
    : false;

  console.log(JSON.stringify({
    status: "ok",
    workspace: tempRoot,
    cleanup: options.keepWorkspace ? "preserved" : "pending",
    job: {
      id: currentJob.id,
      status: currentJob.status,
      progressLabel: currentJob.progressLabel,
      progressPercent: currentJob.progressPercent,
      completedAt: currentJob.completedAt,
    },
    result,
    persisted: {
      post: post
        ? {
          id: post.id,
          slug: post.slug,
          title: post.title,
          heroImageAssetId: post.heroImageAssetId,
          status: post.status,
        }
        : null,
      asset: asset
        ? {
          id: asset.id,
          postId: asset.postId,
          storagePath: asset.storagePath,
          visibility: asset.visibility,
          selectionState: asset.selectionState,
          fileExists: assetExists,
        }
        : null,
      artifacts: artifacts.map((artifact) => ({
        id: artifact.id,
        artifactType: artifact.artifactType,
      })),
    },
    events: jobEvents.map((event) => ({
      sequence: event.sequence,
      eventType: event.eventType,
      createdAt: event.createdAt,
    })),
  }, null, 2));

  if (!options.keepWorkspace) {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
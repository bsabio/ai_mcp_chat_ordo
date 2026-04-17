import { createMediaWorkerServer } from "@/lib/media/server/media-worker-http";

const PORT = Number.parseInt(process.env.MEDIA_WORKER_PORT ?? "3101", 10);
const server = createMediaWorkerServer();

server.listen(PORT, "0.0.0.0", () => {
  process.stdout.write(`[media-worker] listening on :${PORT}\n`);
});

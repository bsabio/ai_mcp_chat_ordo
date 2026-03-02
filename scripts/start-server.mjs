import { createServer } from "node:http";
import next from "next";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const shutdownTimeoutMs = Number.parseInt(process.env.SHUTDOWN_TIMEOUT_MS ?? "10000", 10);

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

let shuttingDown = false;
const sockets = new Set();

const server = createServer((req, res) => {
  if (shuttingDown) {
    res.statusCode = 503;
    res.setHeader("Connection", "close");
    res.end("Server is shutting down.");
    return;
  }

  void handle(req, res);
});

server.on("connection", (socket) => {
  sockets.add(socket);
  socket.on("close", () => {
    sockets.delete(socket);
  });
});

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.info(`[shutdown] received ${signal}; draining connections`);

  server.close(() => {
    console.info("[shutdown] server closed cleanly");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("[shutdown] timeout reached; force closing remaining sockets");
    for (const socket of sockets) {
      socket.destroy();
    }
    process.exit(1);
  }, shutdownTimeoutMs).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

server.listen(port, hostname, () => {
  console.info(`server listening on http://${hostname}:${port}`);
});

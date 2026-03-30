/**
 * Extracted restart-with-backoff logic from start-server.mjs.
 * Testable in isolation without spawning real processes.
 */

export const MAX_WORKER_RESTARTS = 3;
export const RESTART_WINDOW_MS = 60_000;

export interface WorkerSupervisorOptions {
  maxRestarts?: number;
  windowMs?: number;
  onRestart: (restartCount: number, maxRestarts: number) => void;
  onShutdown: (restartCount: number) => void;
  now?: () => number;
}

export interface WorkerSupervisor {
  handleExit(shuttingDown: boolean): void;
  isHealthy(): boolean;
  resetState(): void;
}

export function createWorkerSupervisor(options: WorkerSupervisorOptions): WorkerSupervisor {
  const maxRestarts = options.maxRestarts ?? MAX_WORKER_RESTARTS;
  const windowMs = options.windowMs ?? RESTART_WINDOW_MS;
  const getNow = options.now ?? (() => Date.now());

  let restartTimestamps: number[] = [];
  let healthy = true;

  return {
    handleExit(shuttingDown: boolean): void {
      if (shuttingDown) return;

      healthy = false;

      const now = getNow();
      restartTimestamps = restartTimestamps.filter((t) => now - t < windowMs);
      restartTimestamps.push(now);

      if (restartTimestamps.length > maxRestarts) {
        options.onShutdown(restartTimestamps.length);
        return;
      }

      options.onRestart(restartTimestamps.length, maxRestarts);
      healthy = true;
    },

    isHealthy(): boolean {
      return healthy;
    },

    resetState(): void {
      restartTimestamps = [];
      healthy = true;
    },
  };
}

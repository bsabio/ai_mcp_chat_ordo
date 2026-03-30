import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createWorkerSupervisor,
  MAX_WORKER_RESTARTS,
  RESTART_WINDOW_MS,
} from "../scripts/worker-supervisor";

describe("Spec 04: Worker/Server Decoupling", () => {
  const onRestart = vi.fn();
  const onShutdown = vi.fn();
  let clock: number;

  function createSupervisor(opts?: { maxRestarts?: number; windowMs?: number }) {
    return createWorkerSupervisor({
      maxRestarts: opts?.maxRestarts,
      windowMs: opts?.windowMs,
      onRestart,
      onShutdown,
      now: () => clock,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    clock = 0;
  });

  it("worker restart is attempted after first unexpected exit", () => {
    const supervisor = createSupervisor();

    supervisor.handleExit(false);

    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onRestart).toHaveBeenCalledWith(1, MAX_WORKER_RESTARTS);
    expect(onShutdown).not.toHaveBeenCalled();
  });

  it("worker restart count is tracked within the time window", () => {
    const supervisor = createSupervisor();

    supervisor.handleExit(false); clock += 1000;
    supervisor.handleExit(false); clock += 1000;
    supervisor.handleExit(false);

    expect(onRestart).toHaveBeenCalledTimes(3);
    expect(onShutdown).not.toHaveBeenCalled();
  });

  it("server shuts down after exceeding MAX_WORKER_RESTARTS in window", () => {
    const supervisor = createSupervisor();

    supervisor.handleExit(false); clock += 1000;
    supervisor.handleExit(false); clock += 1000;
    supervisor.handleExit(false); clock += 1000;
    // 4th crash within the window → should trigger shutdown
    supervisor.handleExit(false);

    expect(onShutdown).toHaveBeenCalledTimes(1);
    expect(onRestart).toHaveBeenCalledTimes(3); // only the first 3 triggered restart
  });

  it("old exits outside the time window do not count", () => {
    const supervisor = createSupervisor();

    // 2 crashes in old window
    supervisor.handleExit(false); clock += 1000;
    supervisor.handleExit(false);

    // Advance past window
    clock += RESTART_WINDOW_MS + 1;

    // 2 more crashes in new window — should NOT trigger shutdown
    supervisor.handleExit(false); clock += 1000;
    supervisor.handleExit(false);

    expect(onRestart).toHaveBeenCalledTimes(4);
    expect(onShutdown).not.toHaveBeenCalled();
  });

  it("graceful shutdown does not trigger restart", () => {
    const supervisor = createSupervisor();

    supervisor.handleExit(true); // shuttingDown = true

    expect(onRestart).not.toHaveBeenCalled();
    expect(onShutdown).not.toHaveBeenCalled();
  });

  it("workerHealthy flag reflects current state", () => {
    const supervisor = createSupervisor();

    expect(supervisor.isHealthy()).toBe(true);

    supervisor.handleExit(false);

    // After successful restart, healthy should be true
    expect(supervisor.isHealthy()).toBe(true);
  });

  it("workerHealthy is false when shutdown is triggered after too many crashes", () => {
    const supervisor = createSupervisor();

    supervisor.handleExit(false); clock += 1000;
    supervisor.handleExit(false); clock += 1000;
    supervisor.handleExit(false); clock += 1000;
    supervisor.handleExit(false); // triggers shutdown

    // After shutdown trigger, worker is not healthy
    expect(supervisor.isHealthy()).toBe(false);
  });

  it("exports correct constants", () => {
    expect(MAX_WORKER_RESTARTS).toBe(3);
    expect(RESTART_WINDOW_MS).toBe(60_000);
  });
});

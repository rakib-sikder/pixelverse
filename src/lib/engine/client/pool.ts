/**
 * A pool of conversion workers, sized to the machine.
 *
 * Converting a batch one file at a time leaves most of a modern CPU idle, and
 * spawning one worker per file thrashes — each worker instantiates its own copy
 * of every wasm codec it touches. A small fixed pool with a queue gets the
 * parallelism without the memory blow-up.
 *
 * Workers are spawned lazily on first use, so a visitor who never converts
 * anything never pays for them.
 */

import * as Comlink from "comlink";
import type { WorkerJob, WorkerResult } from "../types";
import type { ConvertWorkerApi } from "./worker";

/**
 * Four is enough to saturate typical consumer hardware while keeping peak
 * memory sane; the codecs, not the scheduler, are the bottleneck past that.
 */
const MAX_WORKERS = 4;

interface PooledWorker {
  worker: Worker;
  api: Comlink.Remote<ConvertWorkerApi>;
  busy: boolean;
}

type Waiter = (worker: PooledWorker) => void;

class ConversionPool {
  private workers: PooledWorker[] = [];
  private waiting: Waiter[] = [];

  private get size(): number {
    return Math.min(MAX_WORKERS, Math.max(1, navigator.hardwareConcurrency || 2));
  }

  private spawn(): PooledWorker {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), {
      // Module workers are what let the codecs be `import()`ed lazily inside
      // the worker instead of all being bundled up front.
      type: "module",
    });
    const pooled: PooledWorker = { worker, api: Comlink.wrap<ConvertWorkerApi>(worker), busy: false };
    this.workers.push(pooled);
    return pooled;
  }

  private acquire(): Promise<PooledWorker> {
    const idle = this.workers.find((w) => !w.busy);
    if (idle) {
      idle.busy = true;
      return Promise.resolve(idle);
    }

    if (this.workers.length < this.size) {
      const fresh = this.spawn();
      fresh.busy = true;
      return Promise.resolve(fresh);
    }

    return new Promise<PooledWorker>((resolve) => this.waiting.push(resolve));
  }

  private release(worker: PooledWorker): void {
    const next = this.waiting.shift();
    if (next) {
      // Stay busy and hand straight to the next caller, so a queued job cannot
      // be overtaken by one arriving in between.
      next(worker);
      return;
    }
    worker.busy = false;
  }

  /**
   * Replaces a worker that died. A wasm out-of-memory on a very large image
   * kills the whole worker, and without this every later job in the batch would
   * be handed the same corpse.
   */
  private discard(dead: PooledWorker): void {
    dead.worker.terminate();
    this.workers = this.workers.filter((w) => w !== dead);

    const next = this.waiting.shift();
    if (next) {
      const fresh = this.spawn();
      fresh.busy = true;
      next(fresh);
    }
  }

  async convert(job: WorkerJob): Promise<WorkerResult> {
    const worker = await this.acquire();
    try {
      const transfers = job.source.kind === "bytes" ? [job.source.bytes] : [job.source.pixels.data];
      const result = await worker.api.convert(Comlink.transfer(job, transfers));
      this.release(worker);
      return result;
    } catch (error) {
      this.discard(worker);
      throw error;
    }
  }

  /** Tears every worker down. Used when the queue is cleared. */
  terminate(): void {
    for (const { worker } of this.workers) worker.terminate();
    this.workers = [];
    this.waiting = [];
  }
}

let pool: ConversionPool | null = null;

export function getPool(): ConversionPool {
  if (!pool) pool = new ConversionPool();
  return pool;
}

export function terminatePool(): void {
  pool?.terminate();
  pool = null;
}

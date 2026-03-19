import { BackgroundJobManager, JobMetrics, JobStatus, TriggerDevConfig } from './types';
import { getTriggerDevConfig } from './config';

type SchedulesApi = {
  task: (def: {
    id: string;
    cron: string;
    run: (payload: unknown) => Promise<void> | void;
  }) => unknown;
};

/**
 * TriggerDevJobManager (SDK v4 ready)
 *
 * Registers schedules with @trigger.dev/sdk when enabled. It does not execute
 * local timers to avoid duplicate runs in production. The actual execution is
 * handled by the Trigger.dev worker.
 */
export class TriggerDevJobManager implements BackgroundJobManager {
  private registeredTasks: Set<string> = new Set();
  private jobStatuses: Map<string, JobStatus> = new Map();
  private metrics: JobMetrics = {
    totalExecutions: 0,
    successfulJobs: 0,
    failedJobs: 0,
    averageJobDuration: 0,
    lastCleanup: new Date()
  };
  private jobFunctions: Map<string, () => void | Promise<void>> = new Map();
  private config: TriggerDevConfig;

  private schedulesApi: SchedulesApi | null = null;

  constructor(config?: TriggerDevConfig) {
    this.config = config || getTriggerDevConfig();
  }

  private async loadSchedulesApi(): Promise<SchedulesApi | null> {
    if (this.schedulesApi) return this.schedulesApi;
    
    if (!this.config.isFullyConfigured) {
      console.warn('⚠️  Trigger.dev not fully configured, skipping SDK initialization');
      return null;
    }
    
    try {
      const sdk = await import('@trigger.dev/sdk');
      const maybe = (sdk as unknown as { schedules?: SchedulesApi }).schedules;
      this.schedulesApi = maybe ?? null;
      return this.schedulesApi;
    } catch {
      return null;
    }
  }

  private intervalToCron(intervalMs: number): string {
    // Best-effort conversion: prefer minutes, then seconds
    const minute = 60_000;
    const second = 1_000;
    if (intervalMs % minute === 0) {
      const n = Math.max(1, Math.floor(intervalMs / minute));
      return `*/${n} * * * *`;
    }
    if (intervalMs % second === 0) {
      const n = Math.max(1, Math.floor(intervalMs / second));
      // second-level cron (supported by Trigger.dev) */n * * * * *
      return `*/${n} * * * * *`;
    }
    // Fallback: every minute
    return '*/1 * * * *';
  }


  private async registerTask(id: string, cron: string, job: () => void | Promise<void>): Promise<void> {
    if (this.registeredTasks.has(id)) return;
    const schedules = await this.loadSchedulesApi();
    if (!schedules) {
      // SDK not available in this runtime; registration will be handled by the worker process.
      return;
    }
    schedules.task({
      id,
      cron,
      run: async () => {
        // This run handler is for the worker; record minimal metrics locally
        const status: JobStatus = this.jobStatuses.get(id) ?? {
          id,
          name: id,
          status: 'scheduled',
          lastRun: null,
          nextRun: new Date(),
          duration: 0
        };
        const start = Date.now();
        status.status = 'running';
        status.lastRun = new Date();
        try {
          await job();
          status.status = 'completed';
          status.duration = Date.now() - start;
          this.metrics.successfulJobs += 1;
          this.metrics.totalExecutions += 1;
          const totalDur = this.metrics.averageJobDuration * (this.metrics.totalExecutions - 1) + status.duration;
          this.metrics.averageJobDuration = totalDur / this.metrics.totalExecutions;
        } catch (e) {
          status.status = 'failed';
          status.duration = Date.now() - start;
          this.metrics.failedJobs += 1;
          this.metrics.totalExecutions += 1;
          const totalDur = this.metrics.averageJobDuration * (this.metrics.totalExecutions - 1) + status.duration;
          this.metrics.averageJobDuration = totalDur / this.metrics.totalExecutions;
          // Optional: surface minimal error log
          console.error(`[Job ${id}] failed:`, e);
        } finally {
          this.jobStatuses.set(id, status);
        }
      }
    });
    this.jobFunctions.set(id, job);
    this.registeredTasks.add(id);
  }

  scheduleJob(id: string, name: string, job: () => void | Promise<void>, interval: number): void {
    const cron = this.intervalToCron(interval);
    this.jobStatuses.set(id, {
      id,
      name,
      status: 'scheduled',
      lastRun: null,
      nextRun: new Date(Date.now() + interval),
      duration: 0
    });
    void this.registerTask(id, cron, job);
  }

  scheduleCronJob(id: string, name: string, job: () => void | Promise<void>, cronExpression: string): void {
    this.jobStatuses.set(id, {
      id,
      name,
      status: 'scheduled',
      lastRun: null,
      nextRun: new Date(),
      duration: 0
    });
    void this.registerTask(id, cronExpression, job);
  }

  async triggerJob(id: string): Promise<void> {
    const fn = this.jobFunctions.get(id);
    if (fn) {
      await fn();
    }
  }

  stopJob(id: string): void {
    // No-op: Trigger.dev schedules are managed remotely. We only clear local status.
    this.jobFunctions.delete(id);
    this.jobStatuses.delete(id);
    this.registeredTasks.delete(id);
  }

  stopAllJobs(): void {
    this.jobFunctions.clear();
    this.jobStatuses.clear();
    this.registeredTasks.clear();
  }

  getJobStatus(id: string): JobStatus | undefined {
    return this.jobStatuses.get(id);
  }

  getAllJobStatuses(): JobStatus[] {
    return Array.from(this.jobStatuses.values());
  }

  getJobMetrics(): JobMetrics {
    return { ...this.metrics };
  }
}



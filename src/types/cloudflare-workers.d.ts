// Cloudflare Workflows 런타임 모듈("cloudflare:workers") 최소 타입 선언.
// 워커 엔트리(src/cloudflare-worker.ts)와 src/workflows/*에서만 사용한다.
declare module "cloudflare:workers" {
  export type WorkflowDurationLabel =
    | "second" | "seconds" | "minute" | "minutes" | "hour" | "hours" | "day" | "days";
  export type WorkflowDuration = `${number} ${WorkflowDurationLabel}` | number;

  export interface WorkflowStepConfig {
    retries?: {
      limit: number;
      delay: WorkflowDuration;
      backoff?: "constant" | "linear" | "exponential";
    };
    timeout?: WorkflowDuration;
  }

  export interface WorkflowEvent<T> {
    payload: Readonly<T>;
    timestamp: Date;
    instanceId: string;
  }

  export abstract class WorkflowStep {
    do<T>(name: string, callback: () => Promise<T>): Promise<T>;
    do<T>(name: string, config: WorkflowStepConfig, callback: () => Promise<T>): Promise<T>;
    sleep(name: string, duration: WorkflowDuration): Promise<void>;
  }

  export abstract class WorkflowEntrypoint<Env = unknown, T = unknown> {
    protected ctx: unknown;
    protected env: Env;
    constructor(ctx: unknown, env: Env);
    abstract run(event: Readonly<WorkflowEvent<T>>, step: WorkflowStep): Promise<unknown>;
  }
}

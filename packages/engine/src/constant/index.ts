// baseType
export const BASE_START_NODE = 'start';

// eventType
export const EVENT_INSTANCE_COMPLETE = 'instance:complete';
export const EVENT_INSTANCE_INTERRUPTED = 'instance:interrupted';

// flowStatus
export enum FlowStatus {
  COMPLETED = 'completed',
  INTERRUPTED = 'interrupted',
  RUNNING = 'running',
  Error = 'error',
}

// taskStatus
export enum TaskStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  INTERRUPTED = 'interrupted',
}

import Engine from '..';
import { storage } from '../utils';

export const LOGICFLOW_ENGINE_INSTANCES = 'LOGICFLOW_ENGINE_INSTANCES';

export default class Recorder implements Recorder.Base {
  async getExecutionTasks(executionId) {
    return storage.getItem(executionId);
  }

  private pushExecution(executionId) {
    const instance = storage.getItem(LOGICFLOW_ENGINE_INSTANCES) || [];
    instance.push(executionId);
    storage.setItem(LOGICFLOW_ENGINE_INSTANCES, instance);
  }

  private pushTaskToExecution(executionId, taskId) {
    const tasks = storage.getItem(executionId) || [];
    tasks.push(taskId);
    storage.setItem(executionId, tasks);
  }
  /**
   * @param {Object} task
   * {
   *   taskId: '',
   *   nodeId: '',
   *   executionId: '',
   *   nodeType: '',
   *   timestamp: '',
   *   properties: {},
   * }
   */
  async addTask(task: Recorder.Info) {
    const { executionId, taskId } = task;
    const instanceData = await this.getExecutionTasks(executionId);

    if (!instanceData) {
      this.pushExecution(executionId);
    }
    this.pushTaskToExecution(executionId, taskId);
    storage.setItem(taskId, task);
  }

  async getTask(taskId: Engine.Key) {
    return storage.getItem(taskId);
  }

  clear() {
    const instance = storage.getItem(LOGICFLOW_ENGINE_INSTANCES) || [];
    instance.forEach((executionId) => {
      storage.removeItem(executionId);
      const instanceData = storage.getItem(executionId) || [];
      instanceData.forEach((taskId) => {
        storage.removeItem(taskId);
      });
    });

    storage.removeItem(LOGICFLOW_ENGINE_INSTANCES);

  }
}

export namespace Recorder {
  export interface Base {
    addTask: (task: Info) => Promise<void>;
    getTask: (taskId: Engine.Key) => Promise<Info>;
    getExecutionTasks: (executionId: Engine.Key) => Promise<string[]>;
    clear: () => void;
  }

  export type Info = {
    nodeType: string;
    timestamp: number;
    properties?: Record<string, unknown>;
  } & Engine.TaskParam;
}

import Engine from '.';
import Recorder from './recorder';
import Scheduler from './Scheduler';
import { BaseNode } from './nodes';
import { createExecId } from './utils';
import { EVENT_INSTANCE_COMPLETE, EVENT_INSTANCE_INTERRUPTED } from './constant';
import { ErrorCode, getErrorMsg } from './constant/logCode';

export default class FlowModel {
  /**
   * 流程支持的节点类型.
   */
  nodeModelMap: Map<string, BaseNode.NodeConstructor>;
  /**
   * 每一次执行流程都会生成一个唯一的 executionId.
   */
  executionId?: Engine.Key;
  /**
   * 调度器，用于调度节点执行
   */
  scheduler: Scheduler;
  /**
   * 待执行的队列，当流程正在执行时，如果再次触发执行。那么会将执行参数放到队列中，等待上一次执行完成后再执行。
   */
  executeQueue: FlowModel.ExecParams[];
  /**
   * 当前正在执行的任务。当监听到调度器执行完成时，触发执行参数中的回调，告知外部执行完成。
   */
  executingInstance: FlowModel.ExecParams | null | undefined;
  /**
   * 当前流程模型中的所有节点，边会被转换成节点的 incoming 和 outgoing 属性
   */
  nodeConfigMap: Map<Engine.Key, BaseNode.NodeConfig> = new Map();
  /**
   * 当流程正在执行时，如果再次触发执行。那么会将执行参数放入到队列中，等待上一次执行完成后再执行。
   */
  isRunning: boolean;
  /**
   * 开始接地那类型，在执行流程时，会从这些节点开始执行
   */
  startNodeType: string;
  /**
   * 当前流程中开始节点组成的数组
   */
  startNodes: BaseNode.NodeConfig[] = [];
  /**
   * 用于存储全局数据，最终会传递给每个节点
   */
  globalData: Record<string, unknown> = {};

  /**
   * 外部传入的上下文，最终会传递给每个节点
   * 例如：
   * const context = {
   *   request: {
   *     get: (url) => {
   *       return fetch(url);
   *     },
   *   },
   * }
   * 在节点内可以通过 this.context.request.get(url) 来调用。
   */
  context: Record<string, unknown>;

  constructor({
    nodeModelMap,
    recorder,
    context = {},
    globalData = {},
    startNodeType = 'StartNode',
  }: FlowModel.IFlowModelProps) {
    // 流程包含的节点类型
    this.nodeModelMap = nodeModelMap;
    // 需要执行的队列
    this.executeQueue = [];
    // 执行中的任务
    this.executingInstance = null;
    // 外部传入的上下文，最终会传递给每个节点
    this.context = context;
    // 用于存储全局数据，可以在流程中共享
    this.globalData = globalData;
    // 开始节点类型，在执行流程时，会从这些节点开始执行
    this.startNodeType = startNodeType;
    this.isRunning = false;
    this.scheduler = new Scheduler({
      flowModel: this,
      recorder,
    });

    this.scheduler.on(EVENT_INSTANCE_COMPLETE, (result) => {
      this.onTaskFinished(result);
    });

    this.scheduler.on(EVENT_INSTANCE_INTERRUPTED, (result) => {
      this.onTaskFinished(result);
    });
  }

  public load(graphData) {
    const { nodes = [], edges = [] } = graphData;
    nodes.forEach((node) => {
      if (this.nodeModelMap.has(node.type)) {
        const nodeConfig = {
          id: node.id,
          type: node.type,
          properties: node.properties,
          incoming: [],
          outgoing: [],
        };
        this.nodeConfigMap.set(node.id, nodeConfig);
        if (node.type === this.startNodeType) {
          this.startNodes.push(nodeConfig);
        }
      } else {
        console.warn(`未识别的节点类型：${node.type}`);
      }
    });

    edges.forEach((edge) => {
      const sourceNode = this.nodeConfigMap.get(edge.sourceNodeId);
      const targetNode = this.nodeConfigMap.get(edge.targetNodeId);
      if (sourceNode) {
        sourceNode.outgoing.push({
          id: edge.id,
          properties: edge.properties,
          target: edge.targetNodeId,
        });
      }
      if (targetNode && targetNode.type !== this.startNodeType) {
        targetNode.incoming.push({
          id: edge.id,
          properties: edge.properties,
          source: edge.sourceNodeId,
        });
      }
    });
  }

  private createExecution() {
    const execParams = this.executeQueue.shift();
    this.executingInstance = execParams;
    if (execParams?.executionId) {
      this.executionId = execParams.executionId;
    } else {
      this.executionId = createExecId();
    }

    // 如果有 taskId，那么表示恢复执行
    if (execParams?.taskId) {
      this.scheduler.resume({
        executionId: this.executionId,
        taskId: execParams.taskId,
        nodeId: execParams.nodeId,
        data: execParams.data,
      });
      return;
    }

    if (execParams?.nodeId) {
      const nodeConfig = this.nodeConfigMap.get(execParams.nodeId);
      if (!nodeConfig) {
        execParams?.onError?.(new Error(`${getErrorMsg(ErrorCode.NONE_NODE_ID)}(${execParams.nodeId})`));
        return;
      }
      this.startNodes = [nodeConfig];
    }

    this.startNodes.forEach((startNode) => {
      this.scheduler.addTask({
        executionId: this.executionId as Engine.Key,
        nodeId: startNode.id,
      });
    });
    // 所有的开始节点都执行
    this.scheduler.run({
      executionId: this.executionId,
    });
  }

  /**
   * 执行流程
   * 同一次执行，这次执行内部的节点执行顺序为并行。
   * 多次执行，多次执行之间为串行
   * 允许一个流程多次执行，效率更高。
   * 例如：
   * 一个流程存在两个开始节点，A 和 B，A 和 B 的下一个节点都是 C，C 的下两个节点是 D 和 E
   * 外部分别出发了 A 和 B 的执行，那么 A 和 B 的执行是串行（即 A 执行完再执行 B），但是 D 和 E 的执行时并行的。
   * 如果希望 A 和 B 的执行时并行的，就不能使用同一个流程模型执行，应该初始化两个。
   * @param params 
   */
  public async execute(params: FlowModel.ExecParams) {
    this.executeQueue.push(params);

    if (this.isRunning) return;
    this.isRunning = true;
    this.createExecution();
  }

  public async resume(params: Partial<FlowModel.ExecParams>) {
    this.executeQueue.push(params as any);

    if (this.isRunning) return;
    this.isRunning = true;
    this.createExecution();
  }

  // TODO: 确认下面这种场景，类型如何定义
  public createTask(nodeId: Engine.Key): any {
    const nodeConfig = this.nodeConfigMap.get(nodeId);
    if (nodeConfig) {
      const NodeModel = this.nodeModelMap.get(nodeConfig.type);
      if (!NodeModel) {
        throw new Error('该 NodeModel 不存在，抛出异常');
        return;
      }
      const task = new NodeModel({
        nodeConfig,
        globalData: this.globalData,
        context: this.context,
      });
      return task;
    }
  }

  public setStartNodeType(type) {
    this.startNodeType = type;
  }

  public updateGlobalData(data) {
    // TODO: 数据的合并，是否考虑子项的合并（默认值的替换）
    this.globalData = {
      ...this.globalData,
      ...data,
    };
  }

  private onTaskFinished(result) {
    const { executionId } = result;
    if (executionId !== this.executionId) return;

    const callback = this.executingInstance?.callback;
    if (callback) {
      callback(result);
    }
    this.executingInstance = null;
    if (this.executeQueue.length > 0) {
      this.createExecution();
    } else {
      this.isRunning = false;
    }
  }
}

export namespace FlowModel {
  export type FlowResult = {
    result?: Record<string, unknown>;
  } & Engine.TaskParam;

  export type TaskParams = {
    executionId: Engine.Key;
    taskId: Engine.Key;
    nodeId: Engine.Key;
    data?: Record<string, unknown>;
  };

  export type ExecParams = {
    callback?: (result: FlowResult) => void;
    onError?: (error: Error) => void;
  } & TaskParams;

  export interface IFlowModelProps {
    nodeModelMap: Map<string, BaseNode.NodeConstructor>;
    recorder: Recorder;
    context?: Record<string, unknown>;
    globalData?: Record<string, unknown>;
    startNodeType?: string;
  }
}

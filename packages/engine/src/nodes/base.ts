import Engine from '..';
import { TaskStatus } from '../constant';
import { getExpressionResult } from '../expression';

export interface IBaseNodeProps {
  nodeConfig: BaseNode.NodeConfig;
  context: Record<string, unknown>;
  globalData: Record<string, unknown>;
};

export class BaseNode implements BaseNode.Base {
  readonly baseType: string;
  static nodeTypeName = 'BaseNode';

  incoming: BaseNode.IncomingConfig[];
  outgoing: BaseNode.OutgoingConfig[];
  properties?: Record<string, unknown>;
  nodeId: Engine.Key;
  type: string;
  context: Record<string, unknown>;
  globalData: Record<string, unknown>;

  constructor({ nodeConfig, context, globalData }: IBaseNodeProps) {
    const { outgoing, incoming, id, type, properties } = nodeConfig;
    this.baseType = 'base';
    this.outgoing = outgoing;
    this.incoming = incoming;
    this.nodeId = id;
    this.type = type;
    this.properties = properties;

    this.context = context;
    this.globalData = globalData;
  }

  /**
   * 节点的执行逻辑
   * @overridable 可以自定义节点重写此方法
   * @param params.executionId 流程执行记录 ID
   * @param params.taskId 此节点执行记录 ID
   * @param params.nodeId 节点 ID
   */
  public async action(params: Engine.ActionParams): Promise<Engine.ActionResult> {
    console.log('action params --->>>', params);
    return undefined;
  }

  /**
   * 节点重新恢复执行的逻辑
   * @overridable 可以自定义节点重写此方法
   * @param params.executionId 流程执行记录 ID
   * @param params.taskId 此节点执行记录 ID
   * @param params.nodeId 节点 ID
   */
  public async onResume(params: Engine.ResumeParam): Promise<void> {
    console.log('onResume params --->>>', params);
    return undefined;
  }

  /**
   * 判断该节点是否满足条件
   */
  private async isPass(properties: Record<string, unknown>): Promise<boolean | any> {
    if (!properties) return true;

    const { conditionExpression } = properties;
    if (!conditionExpression) return true;

    try {
      const result = await getExpressionResult(`result${this.nodeId} = (${conditionExpression})`, {
        ...this.globalData,
      });
      return result[`result${this.nodeId}`];
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取当前节点执行的下一个节点
   */
  private async getOutgoing(): Promise<BaseNode.OutgoingConfig[]> {
    const outgoing: BaseNode.OutgoingConfig[] = [];
    const expressions = [];
    for (const item of this.outgoing) {
      const { properties } = item;
      expressions.push(this.isPass(properties));
    }

    const result = await Promise.all(expressions);
    result.forEach((item, index) => {
      if (item) {
        outgoing.push(this.outgoing[index]);
      }
    });
    return outgoing;
  }

  /**
   * 节点的每一次执行都会生成一个唯一的 taskId
   */
  public async execute(params: Engine.ExecParam): Promise<Engine.NodeExecResult> {
    const { executionId, taskId } = params;
    const res = await this.action({
      nodeId: this.nodeId,
      executionId,
      taskId,
    });

    if (!res || res.status === TaskStatus.SUCCESS) {
      const outgoing = await this.getOutgoing();
      params.next({
        nodeId: this.nodeId,
        nodeType: this.type,
        properties: this.properties,
        executionId,
        taskId,
        outgoing,
      });
    }

    return {
      status: res?.status,
      detail: res?.detail,
      executionId,
      taskId,
      nodeId: this.nodeId,
      nodeType: this.type,
      properties: this.properties,
    };
  }
}

export namespace BaseNode {
  export interface Base {
    incoming: IncomingConfig[];
    outgoing: OutgoingConfig[];
    properties?: Record<string, unknown>;
    nodeId: Engine.Key;
    type: string;
    readonly baseType: string;
    execute(taskParam: Engine.TaskParam): Promise<Engine.NodeExecResult>;
  }

  export type IncomingConfig = {
    id: Engine.Key;
    source: string;
    properties?: Record<string, unknown>;
  };

  export type OutgoingConfig = {
    id: Engine.Key;
    target: string;
    properties?: Record<string, unknown>;
  };

  export type NodeConfig = {
    id: Engine.Key;
    type: string;
    properties?: Record<string, unknown>;
    incoming: IncomingConfig[];
    outgoing: OutgoingConfig[];
  };

  export type NodeConstructor = {
    new (config: {
      nodeConfig: NodeConfig;
      context: Record<string, unknown>;
      globalData: Record<string, unknown>;
    }): BaseNode;
  };
}

export default BaseNode;

// import { LogicFlow } from '@logicflow/core';
import { BaseNode, StartNode, TaskNode } from './nodes'
import { FlowModel } from './FlowModel'
import Recorder from './recorder'

export class Engine {
  globalData?: Record<string, unknown>
  // graphData: LogicFlow.GraphConfigData;
  graphData: any
  nodeModelMap: Map<string, BaseNode.NodeConstructor>
  flowModel?: FlowModel
  recorder: Recorder

  constructor() {
    this.nodeModelMap = new Map()
    this.recorder = new Recorder()
    // 默认注册节点 register default nodes
    this.register({
      type: StartNode.nodeTypeName,
      model: StartNode,
    })
    this.register({
      type: TaskNode.nodeTypeName,
      model: TaskNode,
    })
  }

  /**
   * 注册节点
   * @param nodeConfig { type: 'custom-node', model: Model }
   */
  register(nodeConfig: Engine.NodeConfig) {
    this.nodeModelMap.set(nodeConfig.type, nodeConfig.model)
  }

  /**
   * 自定义执行记录的存储，默认浏览器使用 sessionStorage, nodejs 使用内存存储
   * 注意：由于执行记录不全会主动删除，所以需要自行清理。
   * nodejs 环境建议自定义为持久化存储。
   * @param recorder
   */
  setCustomRecorder(recorder: Recorder) {
    this.recorder = recorder
  }

  /**
   * 加载流程图数据
   */
  load({
    graphData,
    startNodeType = 'StartNode',
    globalData = {},
    context = {},
  }): FlowModel {
    this.graphData = graphData
    this.globalData = globalData
    const flowModel = new FlowModel({
      nodeModelMap: this.nodeModelMap,
      recorder: this.recorder,
      context,
      globalData,
      startNodeType,
    })

    flowModel.load(graphData)
    this.flowModel = flowModel
    return flowModel
  }

  /**
   * 执行流程，允许多次调用
   */
  async execute(param?: Partial<Engine.TaskParam>) {
    return new Promise<FlowModel.FlowResult | Error>((resolve, reject) => {
      let execParam = param
      if (!param) {
        execParam = {}
      }

      this.flowModel?.execute({
        ...(execParam as Engine.TaskParam),
        callback: (result) => {
          resolve(result)
        },
        onError: (error) => {
          reject(error)
        },
      })
    })
  }

  /**
   * 中断流程恢复
   * @param resumeParam
   * @returns
   */
  async resume(resumeParam: Engine.ResumeParam) {
    return new Promise((resolve, reject) => {
      this.flowModel?.resume({
        ...resumeParam,
        callback: (result) => {
          resolve(result)
        },
        onError: (error) => {
          reject(error)
        },
      })
    })
  }

  /**
   * 获取执行任务记录
   * @param executionId
   * @returns
   */
  async getExecutionRecord(executionId: Engine.Key) {
    const tasks = await this.recorder.getExecutionTasks(executionId)
    // TODO: 确认 records 的类型
    const records: any = []
    for (let i = 0; i < tasks?.length; i++) {
      const task = tasks[i]
      records.push(this.recorder.getTask(task))
    }

    return Promise.all(records)
  }
}

export namespace Engine {
  export type Key = string | number
  export type NodeConfig = {
    type: string
    model: any // TODO: NodeModel 可能有多个，类型该如何定义呢？？？
  }

  export type NodeParam = {
    executionId: Key
    nodeId: Key
  }

  export type CommonTaskInfo = {
    taskId: Key
  } & NodeParam

  export type TaskParam = CommonTaskInfo

  export type ResumeParam = {
    data?: Record<string, unknown>
  } & CommonTaskInfo

  export type ExecParam = {
    next: (data: NextTaskParam) => void
  } & TaskParam

  export type ExecResumeParams = {
    next: (data: NextTaskParam) => void
  } & ResumeParam

  export type TaskStatus = 'success' | 'error' | 'interrupted' | '' // ??? Question: '' 状态是什么状态
  export type ActionParams = CommonTaskInfo
  export type ActionResult = {
    status?: TaskStatus
    detail?: Record<string, unknown>
  }

  export type NextTaskParam = {
    executionId: Key
    nodeId: Key
    taskId: Key
    nodeType: string
    outgoing: BaseNode.OutgoingConfig[]
    properties?: Record<string, unknown>
  }

  export type NodeExecResult = {
    nodeType: string
    properties?: Record<string, unknown>
  } & CommonTaskInfo &
    ActionResult
}

// export default Engine;

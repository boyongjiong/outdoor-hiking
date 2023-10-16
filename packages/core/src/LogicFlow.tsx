import { cloneDeep, forEach, map } from 'lodash'
import { createElement as h, render, Component } from 'preact/compat'
import { observer } from 'mobx-preact'
import { Options, Options as LFOptions } from './options'
import {
  BaseEdgeModel,
  BaseNodeModel,
  GraphModel,
  EditConfigModel,
  TransformModel,
  Model,
  SnaplineModel,
} from './model'
import { snaplineTool, Tool } from './tool'
import { formatRawData } from './util'
import { Dnd } from './view/behavior'
import { ElementType, EventType } from './constant'
import Graph from './view/Graph'
import * as _View from './view'
import * as _Model from './model'

import Extension = LogicFlow.Extension
import NodeConfig = LogicFlow.NodeConfig
import FakeNodeConfig = LogicFlow.FakeNodeConfig
import NodeData = LogicFlow.NodeData
import RegisterConfig = LogicFlow.RegisterConfig
import RegisterElementFunc = LogicFlow.RegisterElementFunc
import RegisterParam = LogicFlow.RegisterParam
import GraphConfigData = LogicFlow.GraphConfigData
import GraphElements = LogicFlow.GraphElements
import PointTuple = LogicFlow.PointTuple
import EdgeData = LogicFlow.EdgeData
import EdgeType = Options.EdgeType
import EdgeConfig = LogicFlow.EdgeConfig
import { CallbackType, EventArgs } from './event/eventEmitter'

export class LogicFlow {
  container: HTMLElement
  graphModel: GraphModel
  viewMap: Map<string, Component> = new Map()
  dnd: Dnd
  tool: Tool
  snaplineModel?: SnaplineModel
  components: LogicFlow.RenderFunc[] = []
  // 个性配置的插件，可覆盖全局配置的插件（外部）
  readonly plugins?: Extension[]
  // 全局配置的插件，所有的 LogicFlow 示例都会使用（内部）
  static extensions: Map<string, Extension> = new Map()
  // 插件扩展的方法
  extension: Record<string, unknown> = {}
  readonly options: LFOptions.Definition

  // TODO: 确认要这玩意儿干啥呢？？？
  // readonly width: number;
  // readonly height:number;

  /**
   * 自定义数据转换方法
   * 当接入系统格式和 LogicFlow 数据格式不一致时，可自定义此方法来进行数据格式转换
   * 详情请参考 adapter docs
   * 包括 adapterIn 和 adapterOut 两个方法
   */
  private adapterIn?: (data: unknown) => LogicFlow.GraphConfigData
  private adapterOut?: (
    data: LogicFlow.GraphConfigData,
    ...rest: any
  ) => unknown;
  // 支持插件在 LogicFlow 实例上增加自定义方法
  [propName: string]: unknown

  initContainer(container: HTMLElement | HTMLDivElement) {
    // TODO: 确认是否需要，后续是否只要返回 container 即可（下面方法是为了解决事件绑定问题的）
    const lfContainer = document.createElement('div')
    lfContainer.style.position = 'relative'
    lfContainer.style.width = '100%'
    lfContainer.style.height = '100%'
    container.innerHTML = ''
    container.appendChild(lfContainer)

    return lfContainer
  }

  protected get [Symbol.toStringTag]() {
    return LogicFlow.toStringTag
  }

  constructor(options: LFOptions.Common) {
    this.options = LFOptions.get(options)
    console.log('this.options', this.options)
    this.container = this.initContainer(options.container)
    this.graphModel = new GraphModel({
      ...this.options,
      container: this.container,
    })

    this.tool = new Tool(this)
    this.dnd = new Dnd({ lf: this })
    if (options.snapline !== false) {
      this.snaplineModel = new SnaplineModel(this.graphModel)
      snaplineTool(this.graphModel.eventCenter, this.snaplineModel)
    }
    this.plugins = options.plugins

    this.defaultRegister()
  }

  /*********************************************************
   * Register 相关
   ********************************************************/
  // TODO: 确认内部保留方法是什么意思，实例无法访问还是外部无法修改？？？
  protected setView = (type: string, component: Component) => {
    this.viewMap.set(type, component)
  }
  // 根据类型获取对应的 View
  protected getView = (type: string): Component | undefined => {
    return this.viewMap.get(type)
  }

  /**
   * 注册自定义节点和边，支持两种方式：
   * 方式一（推荐）：
   * @example
   * import { RectNode, RectModel } from '@logicflow/core'
   * class CustomView extends RectNode {
   * }
   * class CustomModel extends RectModel {
   * }
   * lf.register({
   *   type: 'custom',
   *   view: CustomView,
   *   model: CustomModel
   * })
   *
   * 方式二（不推荐）：
   * 极个别在自定义组件时需要用到 lf 的情况下，可以用这种方式。
   * 大多数情况下，我们可以直接在 view 中从 this.props 中获取 graphModel
   * 或者 model 中直接 this.graphModel 获取 model 的方法。
   * @example
   * lf.register('custom', ({ RectNode, RectModel }) => {
   *    class CustomView extends RectNode {}
   *    class CustomModel extends RectModel {}
   *    return {
   *      view: CustomView,
   *      model: CustomModel
   *    }
   * })
   */
  // TODO: TS 重载类型定义，参考一下
  // register(): void
  register(
    type: string | RegisterConfig,
    fn?: RegisterElementFunc,
    isObserverView = true,
  ) {
    if (typeof type !== 'string') {
      this.registerElement(type)
      return
    }

    const registerParam: RegisterParam = {
      // TODO: 列举 All Model and View
      BaseEdge: _View.BaseEdge,
      BaseEdgeModel: _Model.BaseEdgeModel,
      LineEdge: _View.LineEdge,
      LineEdgeModel: _Model.LineEdgeModel,

      BaseNode: _View.BaseNode,
      BaseNodeModel: _Model.BaseNodeModel,
      RectNode: _View.RectNode,
      RectNodeModel: _Model.RectNodeModel,
      // mobx
      h,
      type,
    }

    // 为了能让后来注册的可以继承前面注册的
    // 例如我注册了一个 “开始节点”
    // 然后我想再注册一个 "立即开始节点"
    // 注册传递参数改为动态
    // TODO: 确认下面类型问题
    this.viewMap.forEach((component) => {
      // TODO: 不能用 any 解决问题，extendKey 是在哪儿定义的，干什么用的
      const key = (component as any).extendKey
      if (key) {
        registerParam[key] = component
      }
    })

    this.graphModel.modelMap.forEach((component) => {
      const key = component.extendKey
      if (key) {
        registerParam[key as string] = component
      }
    })

    const registerElement = fn?.(registerParam)
    if (registerElement) {
      const { view: View, model: Model } = registerElement
      let ViewClass = View as any
      if (isObserverView && !ViewClass.isObservered) {
        ViewClass.isObservered = true
        ViewClass = observer(ViewClass)
      }
      this.setView(type, ViewClass)
      this.graphModel.setModel(type, Model)
    }
  }
  protected registerElement(config: RegisterConfig) {
    let ViewComp = config.view

    if (config.isObserverView !== false && !ViewComp.isObservered) {
      ViewComp.isObservered = true
      ViewComp = observer(ViewComp)
    }

    this.setView(config.type, ViewComp)
    this.graphModel.setModel(config.type, config.model)
  }
  batchRegister(elements: RegisterConfig[]) {
    forEach(elements, (element) => {
      this.registerElement(element)
    })
  }
  private defaultRegister() {
    const defaultElements: RegisterConfig[] = [
      {
        type: 'rect',
        view: _View.RectNode,
        model: _Model.RectNodeModel,
      },
      {
        type: 'circle',
        view: _View.CircleNode,
        model: _Model.CircleNodeModel,
      },
      {
        type: 'polygon',
        view: _View.PolygonNode,
        model: _Model.PolygonNodeModel,
      },
      {
        type: 'text',
        view: _View.TextNode,
        model: _Model.TextNodeModel,
      },
      {
        type: 'ellipse',
        view: _View.EllipseNode,
        model: _Model.EllipseNodeModel,
      },
      {
        type: 'diamond',
        view: _View.DiamondNode,
        model: _Model.DiamondNodeModel,
      },
      {
        type: 'html',
        view: _View.HtmlNode,
        model: _Model.HtmlNodeModel,
      },
      {
        type: 'line',
        view: _View.LineEdge,
        model: _Model.LineEdgeModel,
      },
      {
        type: 'polyline',
        view: _View.PolylineEdge,
        model: _Model.PolylineEdgeModel,
      },
      {
        type: 'bezier',
        view: _View.BezierEdge,
        model: _Model.BezierEdgeModel,
      },
    ]
    forEach(defaultElements, (element) => {
      this.registerElement(element)
    })
  }

  /*********************************************************
   * Edge 相关方法
   ********************************************************/
  /**
   * 设置默认边的类型
   * 也就是设置在节点直接由用户手动绘制的连线类型
   * @param type EdgeType
   */
  setDefaultEdgeType(type: EdgeType) {
    this.graphModel.setDefaultEdgeType(type)
  }

  /**
   * 给两个节点之间加一条边
   * @param edgeConfig
   */
  addEdge(edgeConfig: EdgeConfig) {
    return this.graphModel.addEdge(edgeConfig)
  }

  /**
   * 删除边
   * @param edgeId 边的 id
   */
  deleteEdge(edgeId: string): boolean {
    const { guards } = this.options
    const edgeModel = this.graphModel.getEdgeModelById(edgeId)
    if (!edgeModel) return false

    const edgeData = edgeModel.getData()
    const isEnableDelete = guards?.beforeDelete
      ? guards.beforeDelete(edgeData)
      : true
    if (isEnableDelete) {
      this.graphModel.deleteEdgeById(edgeId)
    }
    return isEnableDelete
  }

  /**
   * 删除指定类型的边，基于边的起点和终点，可以只传其一
   * @param sourceNodeId 边的起始节点 id
   * @param targetNodeId 边的终点节点 id
   */
  deleteEdgeByNodeId({
    sourceNodeId,
    targetNodeId,
  }: {
    sourceNodeId?: string
    targetNodeId?: string
  }) {
    if (sourceNodeId && targetNodeId) {
      this.graphModel.deleteEdgeBySourceAndTarget(sourceNodeId, targetNodeId)
    } else if (sourceNodeId) {
      this.graphModel.deleteEdgeBySource(sourceNodeId)
    } else if (targetNodeId) {
      this.graphModel.deleteEdgeByTarget(targetNodeId)
    }
  }

  /**
   * 修改边的 id，如果不传新的 id，内部会自动创建一个
   * @param edgeId 将要被修改的边的 id
   * @param newId 修改后的 id， 可选
   * @return 修改后的边的 id，如果传入的 edgeId 不存在，则返回空字符串
   */
  changeEdgeId(edgeId: string, newId?: string) {
    return this.graphModel.changeEdgeId(edgeId, newId)
  }

  /**
   * 修改边的类型
   * @param id 边的 id
   * @param type 边的类型（可以是系统默认的几种线的类型，也可以是用户自定义线的类型）
   */
  changeEdgeType(id: string, type: string) {
    this.graphModel.changeEdgeType(id, type)
  }

  /**
   * 基于边的 id 获取边的 model
   * @param id 边的 id
   */
  getEdgeModelById(id: string) {
    return this.graphModel.getEdgeModelById(id)
  }

  /**
   * 基于 id 获取边的数据
   * @param id 边的 Id
   */
  getEdgeDataById(id: string) {
    return this.getEdgeModelById(id)?.getData()
  }

  /**
   * 获取满足条件的边的 model
   * @param id
   * @param sourceNodeId
   * @param targetNodeId
   */
  getEdgeModels({
    sourceNodeId,
    targetNodeId,
  }: {
    sourceNodeId?: string
    targetNodeId?: string
  }): BaseEdgeModel[] {
    const results: BaseEdgeModel[] = []
    const { edges } = this.graphModel
    if (sourceNodeId && targetNodeId) {
      forEach(edges, (edge) => {
        if (
          edge.sourceNodeId === sourceNodeId &&
          edge.targetNodeId === targetNodeId
        ) {
          results.push(edge)
        }
      })
    } else if (sourceNodeId) {
      forEach(edges, (edge) => {
        if (edge.sourceNodeId === sourceNodeId) {
          results.push(edge)
        }
      })
    } else if (targetNodeId) {
      forEach(edges, (edge) => {
        if (edge.targetNodeId === targetNodeId) {
          results.push(edge)
        }
      })
    }
    return results
  }

  /**
   * 获取节点连接的所有边的 Model
   * @param nodeId 节点 id
   */
  getNodeEdges(nodeId: string) {
    return this.graphModel.getNodeEdges(nodeId)
  }

  /*********************************************************
   * Node 相关方法
   ********************************************************/
  /**
   * 添加节点
   * @param nodeConfig 节点配置数据
   * @param eventType 新增节点事件类型，默认为 EventType.NODE_ADD
   * @param e 非必传 事件
   */
  addNode(
    nodeConfig: NodeConfig,
    eventType: EventType = EventType.NODE_ADD,
    e?: MouseEvent,
  ) {
    return this.graphModel.addNode(nodeConfig, eventType, e)
  }

  /**
   * 删除节点
   * @param nodeId 节点 id
   */
  deleteNode(nodeId: string): boolean {
    const nodeModel = this.graphModel.getNodeModelById(nodeId)
    if (!nodeModel) return false

    const data = nodeModel.getData()
    const { guards } = this.options
    const isEnableDelete = guards?.beforeDelete
      ? guards.beforeDelete(data)
      : true

    if (isEnableDelete) {
      this.graphModel.deleteNode(nodeId)
    }
    return isEnableDelete
  }

  /**
   * 克隆节点
   * @param nodeId 节点 id
   */
  cloneNode(nodeId: string) {
    const nodeModel = this.graphModel.getNodeModelById(nodeId)
    const nodeData = nodeModel?.getData()
    if (nodeData) {
      const { guards } = this.options
      const isEnableClone = guards?.beforeClone
        ? guards.beforeClone(nodeData)
        : true
      if (isEnableClone) {
        return this.graphModel.cloneNode(nodeId)
      }
    }
  }

  /**
   * 修改节点的 id，如果不传入新的 id，内部会自动创建一个
   * @param nodeId 将要被修改的节点 id
   * @param newId 非必传 修改后的新节点 id
   * @return 修改后节点 id，如果传入的 nodeId 不存在，返回空字符串
   */
  changeNodeId(nodeId: string, newId?: string) {
    return this.graphModel.changeNodeId(nodeId, newId)
  }

  /**
   * 修改节点的类型
   * @param nodeId 节点 id
   * @param type 节点的类型（可以是系统默认的几种节点的类型，也可以是用户自定义节点的类型）
   */
  changeNodeType(nodeId: string, type: string) {
    this.graphModel.changeNodeType(nodeId, type)
  }

  /**
   * 获取节点 Model
   * @param nodeId 节点 id
   */
  getNodeModelById(nodeId: string) {
    return this.graphModel.getNodeModelById(nodeId)
  }

  /**
   * 根据 id 获取节点的数据
   * @param nodeId 节点 id
   */
  getNodeDataById(nodeId: string) {
    return this.graphModel.getNodeModelById(nodeId)?.getData()
  }

  /**
   * 获取所有以此节点为中点的边
   * @param nodeId 节点 id
   */
  getNodeIncomingEdge(nodeId: string) {
    return this.graphModel.getNodeIncomingEdge(nodeId)
  }

  /**
   * 获取所有以此节点为起点的边
   * @param nodeId 节点 id
   */
  getNodeOutgoingEdge(nodeId: string) {
    return this.graphModel.getNodeOutgoingEdge(nodeId)
  }

  /**
   * 获取所有作为起始节点连接到当前节点的节点 Model
   * @param nodeId 节点 id
   */
  getNodeIncomingNode(nodeId: string) {
    return this.graphModel.getNodeIncomingNode(nodeId)
  }

  /**
   * 获取所有作为结束节点从当前节点连出的节点 Model
   * @param nodeId 节点 id
   */
  getNodeOutgoingNode(nodeId: string) {
    return this.graphModel.getNodeOutgoingNode(nodeId)
  }

  /**
   * 创建一个 fakeNode，用于 dnd 插件拖动节点进画布的时候使用 内部保留方法
   * @param nodeConfig
   * @protected
   */
  createFakeNode(nodeConfig: FakeNodeConfig): BaseNodeModel | undefined {
    const Model = this.graphModel.getModel(nodeConfig.type)
    if (!Model) {
      console.error(
        `当前不存在节点类型为 ${nodeConfig.type} 的节点，请确认是否注册`,
      )
      return
    }
    // TODO: 确认此处该如何处理，ts 类型。此处类型肯定是 BaseNodeModel，下面的 config 可以保证 new 成功
    // @ts-ignore
    const fakeNodeModel = new Model(
      { ...nodeConfig, virtual: true },
      this.graphModel,
    )
    this.graphModel.setFakeNode(fakeNodeModel)
    return fakeNodeModel
  }

  /**
   * 移除 fakeNode 内部保留方法
   */
  removeFakeNode() {
    this.graphModel.removeFakeNode()
  }

  /**
   * 用于 fakeNode 显示对齐线 内部保留方法
   * @param nodeData
   */
  setNodeSnapline(nodeData: NodeData) {
    if (this.snaplineModel) {
      this.snaplineModel.setNodeSnapline(nodeData)
    }
  }

  /**
   * 移除n fakeNode 的对齐线 内部保留方法
   */
  removeNodeSnapline() {
    if (this.snaplineModel) {
      this.snaplineModel.clearSnapline()
    }
  }

  // Element 相关方法
  /**
   * 添加多个元素，包括边和节点
   * @param nodes NodeConfig 节点数据
   * @param edges EdgeConfig 边数据
   */
  addElements({ nodes, edges }: GraphConfigData): GraphElements {
    const nodeIdMap: Record<string, string> = {}
    const elements: GraphElements = {
      nodes: [],
      edges: [],
    }
    forEach(nodes, (node) => {
      const nodeId = node.id
      const nodeModel = this.addNode(node)
      // TODO: 确认下面是否是没用的。如果没有对应的 NodeModel，在上面方法调用的时候会抛出错误
      // if (!nodeModel) return;
      if (nodeId) nodeIdMap[nodeId] = nodeModel.id
      elements.nodes.push(nodeModel)
    })

    forEach(edges, (edge) => {
      let { sourceNodeId, targetNodeId } = edge
      // use new source and target nodeId when paste issue#866、#859
      if (nodeIdMap[sourceNodeId]) sourceNodeId = nodeIdMap[sourceNodeId]
      if (nodeIdMap[targetNodeId]) targetNodeId = nodeIdMap[targetNodeId]

      const edgeModel = this.graphModel.addEdge({
        ...edge,
        sourceNodeId,
        targetNodeId,
      })
      elements.edges.push(edgeModel)
    })

    return elements
  }
  /**
   * 根据 id 选中图中的元素
   * @param id 元素 id
   * @param multiple 是否允许多选，如果是 true，则不会重置之前选中元素的状态
   * @param toFront 是否将选中的元素指定，默认为 true
   */
  selectElementById(id: string, multiple = false, toFront = true) {
    this.graphModel.selectEdgeById(id, multiple)
    if (!multiple && toFront) {
      this.graphModel.toFront(id)
    }
  }

  /**
   * 删除元素，在不确定元素是节点还是边时使用
   * @param id 元素 id
   */
  deleteElement(id: string): boolean {
    const model = this.getModelById(id)
    if (!model) return false
    const callback: Record<ElementType, (id: string) => boolean | void> = {
      [ElementType.NODE]: this.deleteNode,
      [ElementType.EDGE]: this.deleteEdge,
      [ElementType.GRAPH]: () => {},
    }

    const { baseType } = model
    return callback[baseType]?.call(this, id) ?? false
  }

  /**
   * 设置元素的 zIndex。注意：默认堆叠模式下，不建议使用此方法（Why？？？）
   * @param id 元素 id
   * @param zIndex 元素要设置的 zIndex
   */
  setElementZIndex(id: string, zIndex: number | 'top' | 'bottom') {
    return this.graphModel.setElementZIndex(id, zIndex)
  }

  /**
   * TODO: 当前本接口返回的是所有区域内节点的数据，是否符合预期
   * 获取指定区域内的所有元素，此区域必须是 DOM 层？？？（如何理解，还有什么层）
   * 例如鼠标绘制选区后，获取选区内的所有元素
   * @param leftTopPoint 左上角点坐标
   * @param rightBottomPoint 右下角点坐标
   * @param wholeEdge 是否必须包含完整线
   * @param wholeNode 是否必须包含完整节点
   * @param ignoreHideElement 是否忽略隐藏元素
   */
  getAreaElement(
    leftTopPoint: PointTuple,
    rightBottomPoint: PointTuple,
    wholeEdge = true,
    wholeNode = true,
    ignoreHideElement = false,
  ): (NodeData | EdgeData)[] {
    const areaElements = this.graphModel.getAreaElements(
      leftTopPoint,
      rightBottomPoint,
      wholeEdge,
      wholeNode,
      ignoreHideElement,
    )

    return map(areaElements, (element) => element.getData())
  }

  /**
   * 获取选中的元素数据
   * @param isIgnoreCheck 是否包括 sourceNode 和 targetNode 未被选中的边，默认包括
   * REMIND：复制的时候不能包括此类边，因为复制的时候不允许悬空的边。
   */
  getSelectElements(isIgnoreCheck = true) {
    return this.graphModel.getSelectElements(isIgnoreCheck)
  }

  /**
   * 将所有选中的元素设置为非选中
   */
  clearSelectElements() {
    this.graphModel.clearSelectElements()
  }

  /**
   * 设置元素的自定义属性
   * @param id 元素 id
   * @param properties 自定义属性
   */
  setProperties(id: string, properties: Record<string, unknown>) {
    this.graphModel.getElement(id)?.setProperties(formatRawData(properties))
  }

  /**
   * 获取元素的自定义属性
   * @param id 元素 id
   */
  getProperties(id: string) {
    return this.graphModel.getElement(id)?.getProperties()
  }

  /**
   * 删除元素的自定义属性（只能删除用户自定义的属性）
   * @param id 元素 id
   * @param key 要删除的属性 key 值
   */
  deleteProperty(id: string, key: string) {
    this.graphModel.getElement(id)?.deleteProperty(key)
  }
  updateAttributes(id: string, attributes: LogicFlow.AttributesType) {
    this.graphModel.updateAttributes(id, attributes)
  }

  /*********************************************************
   * Text 相关方法
   ********************************************************/
  /**
   * 显示节点、连线的文本编辑框
   * @param id 元素 id
   */
  editText(id: string) {
    this.graphModel.editText(id)
  }

  /**
   * 更新节点或边的文案
   * @param id 元素 id
   * @param value 文案内容
   */
  updateText(id: string, value: string) {
    this.graphModel.updateText(id, value)
  }

  // Model 相关方法
  getModelById(id: string): BaseNodeModel | BaseEdgeModel | undefined {
    return this.graphModel.getElement(id)
  }

  /*********************************************************
   * EditConfig 相关方法
   ********************************************************/
  /**
   * 获取流程图当前编辑相关设置
   */
  getEditConfig() {
    return this.graphModel.editConfigModel.getConfig()
  }

  /**
   * 更新流程图相关设置
   * @param config
   */
  updateEditConfig(config: EditConfigModel.Options) {
    this.graphModel.editConfigModel.updateEditConfig(config)
  }

  // Graph 相关方法
  /**
   * 设置图主题样式，用户可自定义部分主题
   * @param style Theme
   */
  setTheme(style: LogicFlow.Theme) {
    this.graphModel.setTheme(style)
  }

  /**
   * 定位到画布视口中心
   * 支持用户传入图形当前的坐标或 id，可以通过 type 来区分是节点还是边的 id（也可以不传）
   * TODO: 确认此处是否参数必须有一个，id 或 coordinate 必须得有一个有值，不然此方法无效果
   * @param id 如果传入 id，则画布视口中心移动到该元素的中心店
   * @param coordinate 如果传入的是坐标，则画布视口中心移动到此坐标位置
   */
  focusOn({ id, coordinate }: LogicFlow.FocusOnParams) {
    let centerPoint = cloneDeep(coordinate)
    const { transformModel, width, height } = this.graphModel
    if (!centerPoint && id) {
      const nodeModel = this.getNodeModelById(id)
      if (nodeModel) {
        centerPoint = nodeModel.getData()
      }
      const edgeModel = this.getEdgeModelById(id)
      if (edgeModel) {
        centerPoint = edgeModel.textPosition
      }
    }

    // 此处最重要保证最后是有一个移动的目标坐标点
    if (centerPoint) {
      const { x, y } = centerPoint
      transformModel.focusOn(x, y, width, height)
    }
  }
  resize(width?: number, height?: number) {
    this.graphModel.resize(width, height)
    this.options.width = this.graphModel.width
    this.options.height = this.graphModel.height
  }

  /**
   * 将某个元素放置到顶部。
   * 如果堆叠模式为「默认模式」，则将原置顶元素重新恢复原有层级
   * 如果堆叠模式为「递增模式」，则将需指定元素的 zIndex 设置为当前最大 zIndex + 1.
   * @param id
   */
  toFront(id: string) {
    this.graphModel.toFront(id)
  }

  /**
   * 获取事件位置相对于画布左上角的坐标
   * 画布所在的位置可以是页面的任何地方，原生时间返回的坐标是相对于页面左上角的
   * 该方法可以提供以画布左上角为原点的准确位置。
   * @param x 事件触发位置 e.clientX
   * @param y 事件触发位置 e.clientY
   */
  getPointByClient(x: number, y: number) {
    return this.graphModel.getPointByClient({ x, y })
  }

  /*********************************************************
   * Data 相关方法
   ********************************************************/
  getDataById(id: string) {
    return this.graphModel.getElement(id)?.getData()
  }

  /**
   * 获取流程图数据
   * REMIND: getGraphData 返回的数据收到 adapter 影响，所以其数据格式不一定是 LogicFlow 内部图数据格式
   * 如果实现通用插件，请使用 getGraphRawData
   * @param args 参数，未知（根据用户 adapterOut 而定）
   */
  getGraphData(...args: any): LogicFlow.GraphConfigData | unknown {
    const data = this.graphModel.modelToGraphData()
    if (this.adapterOut) {
      return this.adapterOut(data, ...args)
    }
    return data
  }

  /**
   * 获取流程图 LogicFlow 内部原始数据
   * 当存在 adapter 时，可以使用 getGraphRawData 获取图原始数据
   */
  getGraphRawData() {
    return this.graphModel.modelToGraphData()
  }

  /**
   * 清空画布数据
   */
  clearData() {
    this.graphModel.clearData()
  }

  /*********************************************************
   * History 相关方法
   ********************************************************/
  undo() {}
  redo() {}

  /**
   * 放大缩小图形
   * @param zoomSize 缩放值，允许 0~n之间的数字。小于 1 表示缩小，大于 1 表示放大。支持 true | false 传值按内置的刻度缩放
   * @param point 缩放的原点
   * @return 放大缩小的比例
   */
  zoom(zoomSize: TransformModel.ZoomParamType, point?: PointTuple) {
    const { transformModel } = this.graphModel
    return transformModel.zoom(zoomSize, point)
  }

  /**
   * 重置图形的放大缩小比例为默认值
   */
  resetZoom() {
    const { transformModel } = this.graphModel
    transformModel.resetZoom()
  }

  /**
   * 设置图形放大缩小时，能缩放到的最小倍数。参数为 0~1 自己。默认为 0.2
   * @param min 图形缩小的最小值
   */
  setZoomMiniSize(min: number) {
    const { transformModel } = this.graphModel
    transformModel.setZoomMinSize(min)
  }

  /**
   * 设置图形放大时，能放大到的最大倍数，默认为 16
   * @param max 图形放大的最大值
   */
  setZoomMaxSize(max: number) {
    const { transformModel } = this.graphModel
    transformModel.setZoomMaxSize(max)
  }

  /*********************************************************
   * Transform 相关方法
   ********************************************************/
  /**
   * 获取 transformModel 缩放和平移的值
   */
  getTransform() {
    const {
      transformModel: { SCALE_X, SCALE_Y, TRANSLATE_X, TRANSLATE_Y },
    } = this.graphModel
    return {
      SCALE_X,
      SCALE_Y,
      TRANSLATE_X,
      TRANSLATE_Y,
    }
  }

  /**
   * 平移图
   * @param dx x 轴移动的距离
   * @param dy y 轴移动的距离
   */
  translate(dx: number, dy: number) {
    const { transformModel } = this.graphModel
    transformModel.translate(dx, dy)
  }

  /**
   * 图形画布居中显示
   */
  translateCenter() {
    this.graphModel.translateCenter()
  }

  /**
   * 还原图形为初始位置
   */
  resetTranslate() {
    const {
      transformModel: { TRANSLATE_X, TRANSLATE_Y },
    } = this.graphModel
    this.translate(-TRANSLATE_X, -TRANSLATE_Y)
  }

  /**
   * 图形适应屏幕大小
   * @param verticalOffset 距离盒子上下的距离，默认为 20
   * @param horizontalOffset 距离盒子左右的距离，默认为 20
   */
  fitView(verticalOffset?: number, horizontalOffset?: number) {
    if (typeof horizontalOffset === 'undefined') {
      horizontalOffset = verticalOffset
    }
    this.graphModel.fitView(verticalOffset, horizontalOffset)
  }

  /**
   * 开启边的动画
   * @param edgeId
   */
  openEdgeAnimation(edgeId: string) {
    this.graphModel.openEdgeAnimation(edgeId)
  }

  /**
   * 关闭边的动画
   * @param edgeId
   */
  closeEdgeAnimation(edgeId: string) {
    this.graphModel.closeEdgeAnimation(edgeId)
  }

  /*********************************************************
   * 事件系统方法
   ********************************************************/
  /**
   * 监听事件，支持同时监听多个事件
   * @param evt 事件名
   * @param callback 回调方法
   * @example
   * lf.on('node:click,node:contextmenu', (data) => {
   *   //...
   * });
   */
  on(evt: string, callback: CallbackType) {
    this.graphModel.eventCenter.on(evt, callback)
  }

  /**
   * 监听事件，只监听一次
   * @param evt
   * @param callback
   */
  once(evt: string, callback: CallbackType) {
    this.graphModel.eventCenter.once(evt, callback)
  }

  /**
   * 撤销监听事件
   * @param evt
   * @param callback
   */
  off(evt: string, callback: CallbackType) {
    this.graphModel.eventCenter.off(evt, callback)
  }

  /**
   * 主动触发监听事件
   * @param evt
   * @param args
   */
  emit(evt: string, args: EventArgs) {
    this.graphModel.eventCenter.emit(evt, args)
  }

  /*********************************************************
   * 插件系统方法
   ********************************************************/
  use() {}
  // initContainer() {}
  installPlugins() {}
  installPlugin() {}

  /*********************************************************
   * Render 相关方法
   ********************************************************/
  renderRawData(graphRawData: any) {
    this.graphModel.graphDataToModel(formatRawData(graphRawData))
    if (this.options.history !== false) {
      // this.history.watch(this.graphModel);
    }
    render(
      <Graph
        getView={this.getView}
        tool={this.tool}
        options={this.options}
        dnd={this.dnd}
        snaplineModel={this.snaplineModel}
        graphModel={this.graphModel}
      />,
      this.container,
    )
  }

  render(data: any) {
    let graphData = cloneDeep(data)
    if (this.adapterIn) {
      graphData = this.adapterIn(data)
    }
    this.renderRawData(graphData)
  }
}

// TODO: 这样管理 TypeScript 项目的类型定义是否合理
// Option
export namespace LogicFlow {
  import AnchorConfig = Model.AnchorConfig

  export interface Options extends LFOptions.Common {}

  export interface GraphConfigData {
    nodes: NodeConfig[]
    edges: EdgeConfig[]
  }

  export type AttributesType = Record<string, unknown>
  export type EventArgsType = Record<string, unknown>

  export type OffsetData = {
    dx: number
    dy: number
  }
  export type Position = {
    x: number
    y: number
  }
  export type Point = {
    id?: string
    [key: string]: any
  } & Position
  export type PointTuple = [number, number]
  export interface LineSegment {
    start: Point
    end: Point
  }
  export type Direction = 'vertical' | 'horizontal'
  export type RadiusCircleInfo = {
    r: number
  } & Position
  export type Vector = {
    id?: string
    x: number
    y: number
    z: 0
    [key: string]: any
  }
  export type RectSize = {
    width: number
    height: number
  }
  export type TextConfig = {
    value: string
    editable?: boolean
    draggable?: boolean
  } & Point

  export type ArrowConfig = {
    start: Point
    end: Point
    hover: boolean
    isSelected: boolean
  }

  export type AppendConfig = {
    startIndex: number
    endIndex: number
    direction: Direction
    draggable?: boolean
  } & LineSegment

  export interface FakeNodeConfig {
    type: string
    text?: TextConfig | string
    properties?: Record<string, unknown>
    [key: string]: unknown
  }
  export interface NodeConfig {
    id?: string
    type: string
    x: number
    y: number
    text?: TextConfig | string
    zIndex?: number
    properties?: Record<string, unknown>
    virtual?: boolean // 是否虚拟节点
    rotate?: number
    [key: string]: any
  }

  export interface NodeData extends NodeConfig {
    id: string
    [key: string]: unknown
  }

  export interface NodeAttribute extends Partial<NodeConfig> {
    id: string
  }

  export interface EdgeConfig {
    id?: string
    type: string // TODO: 将所有类型选项列出来；LogicFlow 内部默认为 polyline

    sourceNodeId: string
    sourceAnchorId?: string
    targetNodeId: string
    targetAnchorId?: string

    startPoint?: Point
    endPoint?: Point
    text?: TextConfig | string
    pointsList?: Point[]
    zIndex?: number
    properties?: Record<string, unknown>
  }

  // TODO: 确认这种类型该如何定义（必需和非必需动态调整，优雅的处理方式）
  export interface EdgeData extends EdgeConfig {
    id: string
    type: string
    text?: TextConfig
    [key: string]: unknown
  }

  export interface EdgeAttribute extends Partial<EdgeConfig> {
    id: string
  }

  export interface MenuConfig {
    text?: string
    className?: string
    icon?: boolean
    callback: (id: string | number) => void
  }

  export type ConnectRule = {
    message: string
    validate: (
      source?: BaseNodeModel,
      target?: BaseNodeModel,
      sourceAnchor?: AnchorConfig,
      targetAnchor?: AnchorConfig,
      // 调整的边的 id，在开启 adjustEdgeStartAndEnd 后调整边连接的节点时会传入
      // 详见：https://github.com/didi/LogicFlow/issues/926#issuecomment-1371823306
      edgeId?: string,
    ) => boolean
  }

  export type ConnectRuleResult = {
    isAllPass: boolean
    msg?: string
  }
}

// Theme
export namespace LogicFlow {
  export type NumberOrPercent = `${number}%` | number
  /**
   * 颜色 - CSS 属性用颜色
   * 如：#000000, rgba(0, 0, 0, 0), 如果是透明的，可以传 'none'
   */
  export type Color = string | 'none'
  /**
   * svg虚线
   * 格式为逗号分割字符串，如
   * @see https://developer.mozilla.org/zh-CN/docs/Web/SVG/Attribute/stroke-dasharray
   */
  export type DashArray = string
  export type CommonTheme = {
    path?: string
    fill?: Color // 填充颜色
    stroke?: Color // 边框颜色
    strokeWidth?: number // 边框宽度 TODO: svg 实际可赋值类型：NumberOrPercent
    /**
     * 其他属性 - 我们会把你自定义的所有属性最终传递到 DOM 上
     * 详情请参考 svg 属性规范：
     * https://developer.mozilla.org/zh-CN/docs/Web/SVG/Attribute
     * 注意: 请不要在主题中设置“形状属性”，例如：x、y、width、height、radius、r、rx、ry
     * @see https://docs.logic-flow.cn/docs/#/zh/api/themeApi?id=%e5%bd%a2%e7%8a%b6%e5%b1%9e%e6%80%a7）
     */
    radius?: number
    rx?: number
    ry?: number
    [key: string]: unknown
  }
  export type CommonThemePropTypes = CommonTheme[keyof CommonTheme]

  export type AppendAttributes = {
    d: string
    fill: string
    stroke: Color
    strokeWidth: number
    strokeDasharray: DashArray
  }

  export type ContainerTheme = {
    width?: string
    height?: string
  }
  // 节点 Shape 类型
  /**
   * rect 节点主题
   * svg基础图形-矩形
   * https://developer.mozilla.org/zh-CN/docs/Web/SVG/Element/rect
   */
  export type RectTheme = CommonTheme
  /**
   * circle 节点主题
   * svg基础图形-圆形
   * https://developer.mozilla.org/zh-CN/docs/Web/SVG/Element/circle
   */
  export type CircleTheme = CommonTheme
  /**
   * polygon 节点主题
   * svg基础图形-多边形
   * https://developer.mozilla.org/zh-CN/docs/Web/SVG/Element/polygon
   */
  export type PolygonTheme = CommonTheme
  /**
   * ellipse 节点主题
   * svg基础图形-椭圆
   * https://developer.mozilla.org/zh-CN/docs/Web/SVG/Element/ellipse
   */
  export type EllipseTheme = CommonTheme
  // 锚点样式（svg 基础图形 - 圆）
  export type AnchorTheme = {
    r?: number
    hover?: {
      r: number
    } & CommonTheme
  } & CommonTheme

  // 文本样式
  export type TextTheme = {
    color?: Color
    fontSize: number
    textWidth?: number
    lineHeight?: number
    textAnchor?: 'start' | 'middle' | 'end'
    dominantBaseline?:
      | 'auto'
      | 'text-bottom'
      | 'alphabetic'
      | 'ideographic'
      | 'middle'
      | 'central'
      | 'mathematical'
      | 'hanging'
      | 'text-top'
  } & CommonTheme

  // 文本节点样式
  export type TextNodeTheme = {
    background?: RectTheme
  } & TextTheme

  // 节点上文本样式
  export type NodeTextTheme = {
    /**
     * 文本超出指定宽度处理方式
     * default: 不特殊处理，允许超出
     * autoWrap: 超出自动换行
     * ellipsis: 超出省略
     */
    overflowMode?: 'default' | 'autoWrap' | 'ellipsis'
    background?: RectTheme
    /**
     * 背景区域 padding
     * wrapPadding: '5px,10px'
     */
    wrapPadding?: string
  } & TextTheme
  // 边上文本样式
  export type EdgeTextTheme = {
    textWidth: number
    background?: {
      /**
       * 背景区域 padding
       * wrapPadding: '5px,10px'
       */
      wrapPadding?: string
    } & RectTheme
    // hover状态下文本样式
    hover?: EdgeTextTheme
  } & NodeTextTheme &
    TextTheme

  // 边 Edge 主题
  export type EdgeTheme = CommonTheme
  export type EdgeBezierTheme = {
    // 贝塞尔调整线主题
    adjustLine?: EdgeTheme
    // 贝塞尔调整锚点主题
    adjustAnchor?: CircleTheme
  } & EdgeTheme
  export type EdgePolylineTheme = EdgeTheme
  export type EdgeAnimation = {
    stroke?: Color
    strokeDasharray?: string
    strokeDashoffset?: NumberOrPercent
    animationName?: string
    animationDuration?: `${number}s` | `${number}ms`
    animationIterationCount?: 'infinite' | number
    animationTimingFunction?: string
    animationDirection?: string
  }

  export type OutlineTheme = {
    hover?: CommonTheme
  } & CommonTheme &
    EdgeAnimation

  export type ArrowTheme = {
    /**
     * 箭头长度.
     * 以符号"->"为例, offset表示箭头大于号的宽度。
     */
    offset: number
    /**
     * 箭头垂直于边的距离
     * 以符号"->"为例, verticalLength表示箭头大于号的高度
     */
    refX?: number
    refY?: number
    verticalLength: number
  } & CommonTheme
  export type ArrowAttributesType = {
    d: string
  } & ArrowTheme

  export type AnchorLineTheme = EdgeTheme & EdgeAnimation

  export interface Theme {
    baseNode: CommonTheme // 所有节点的通用主题设置
    baseEdge: EdgeTheme // 所有边的通用主题设置

    /**
     * 基础图形节点相关主题
     */
    rect: RectTheme // 矩形样式
    circle: CircleTheme // 圆形样式
    diamond: PolygonTheme // 菱形样式
    ellipse: EllipseTheme // 椭圆样式
    polygon: PolygonTheme // 多边形样式
    /**
     * 基础图形线相关主题
     */
    line: EdgeTheme // 直线样式
    polyline: EdgePolylineTheme // 折现样式
    bezier: EdgeBezierTheme // 贝塞尔曲线样式
    anchorLine: AnchorLineTheme // 从锚点拉出的边的样式
    /**
     * 文本内容相关主题
     */
    text: TextNodeTheme // 文本节点样式
    nodeText: NodeTextTheme // 节点文本样式
    edgeText: EdgeTextTheme // 边文本样式
    /**
     * 其他元素相关主题
     */
    anchor: AnchorTheme // 锚点样式
    arrow: ArrowTheme // 边上箭头的样式
    allowRotation: CommonTheme // 旋转控制点样式
    snapline: EdgeTheme // 对齐线样式
    /**
     * REMIND: 当开启了跳转边的起点和终点(adjustEdgeStartAndEnd:true)后
     * 边的两端会出现调整按钮
     * 边连段的调整点样式
     */
    edgeAdjust: CircleTheme
    outline: OutlineTheme // 节点选择状态下外侧的选框样式
    edgeAnimation: EdgeAnimation // 边动画样式
  }
}

// Render or Functions
export namespace LogicFlow {
  export type FocusOnParams = {
    id?: string
    coordinate?: Point
  }

  export type GraphElement = BaseNodeModel | BaseEdgeModel
  export type GraphElements = {
    nodes: BaseNodeModel[]
    edges: BaseEdgeModel[]
  }

  export type RegisterConfig = {
    type: string
    view: any // TODO: 确认 view 的类型
    model: any // TODO: 确认 model 的类型
    isObserverView?: boolean
  }
  export type RegisterElement = {
    view: any
    model: any
  }
  export type RegisterParam = {
    h: typeof h
    // 当前项目中定义的节点 or 连线的 View 或 Model
    // ...
    [key: string]: unknown
  }
  export type RegisterElementFunc = (params: RegisterParam) => RegisterElement

  export type RenderFunc = (lf: LogicFlow, container: HTMLElement) => void
  export interface Extension {
    pluginName?: string // 插件名称，只用用于插件覆盖和细粒度控制加载哪些插件
    install: (lf: LogicFlow) => void
    render?: RenderFunc
    destroy?: () => void
    [props: string]: unknown
  }
}

export namespace LogicFlow {
  export const toStringTag = `LF.${LogicFlow.name}`
}

export default LogicFlow

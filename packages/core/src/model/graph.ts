import { filter, find, forEach, map, reduce } from 'lodash'
import { action, computed, observable } from 'mobx'
import {
  createEdgeGenerator,
  createUuid,
  formatRawData,
  getGridOffset,
  getMinZIndex,
  getZIndex,
  isElementInArea,
  pickNodeConfig,
  getNodeAnchorPosition,
  pointsList2Polyline,
  pointsStr2PointsList,
  setupAnimation,
  setupTheme,
  snapToGrid,
  updateTheme,
} from '../util'
import {
  ElementMaxZIndex,
  ElementState,
  ElementType,
  EventType,
  MORE_SPACE_SIZE,
  OverlapMode,
  ModelType,
} from '../constant'
import {
  BaseEdgeModel,
  BaseNodeModel,
  EditConfigModel,
  Model,
  TransformModel,
} from '.'
import { LogicFlow } from '../LogicFlow'
import { HistoryData } from '../common'
import EventEmitter from '../event/eventEmitter'
import { Options as LFOptions } from '../options'
import { closestPointOnPolyline } from '../algorithm'

export interface Constructable<T> {
  new (...args: any): T
}

export class GraphModel {
  /**
   * LogicFlow 画布挂载元素，
   * 也就是初始化 LogicFlow 实例时传入的 container
   */
  public readonly rootEl: HTMLElement
  @observable width: number // 画布宽度
  @observable height: number // 画布高度

  // 流程图主题配置
  theme: LogicFlow.Theme
  // 事件中心
  readonly eventCenter: EventEmitter
  // 维护所有节点和边类型对应的 model
  readonly modelMap: Map<string, BaseNodeModel | BaseEdgeModel> = new Map()
  /**
   * 位于当前画布顶部的元素
   * 此元素只在堆叠模式为默认模式下存在
   * 用于在默认模式下将之前的顶部元素回复初始高度
   */
  topElement?: BaseNodeModel | BaseEdgeModel
  // 自定义全局 id 生成器
  idGenerator?: (type?: string) => string | undefined
  // 节点间连线、连线变更时边的生成规则
  edgeGenerator: LFOptions.Definition['edgeGenerator']

  /**
   * 节点移动规则判断
   * 在节点移动的时候，会触发此数组中的所有规则判断
   */
  nodeMoveRules: Model.NodeMoveRule[] = []

  /**
   * 获取自定义连线轨迹
   */
  customTrajectory: LFOptions.Definition['customTrajectory']

  // 在图上操作创建边时，默认使用的边类型
  @observable edgeType: string
  // 当前图上所有节点的 model
  @observable nodes: BaseNodeModel[] = []
  // 当前图上所有边的 model
  @observable edges: BaseEdgeModel[] = []
  // 外部拖入节点进入画布的过程中，用 fakeNode 来和画布上正式的节点区分开
  @observable fakeNode?: BaseNodeModel | null

  /**
   * 元素重合时堆叠模式：
   * - DEFAULT（默认模式）：节点和边被选中，会被显示在最上面。当取消选中后，元素会恢复之前的层级
   * - INCREASE（递增模式）：节点和边被选中，会被显示在最上面。当取消选中后，元素会保持当前层级
   */
  @observable overlapMode = OverlapMode.DEFAULT
  // TODO: 背景配置
  @observable background?: false | LFOptions.BackgroundConfig
  // 网格大小
  @observable gridSize: number = 1
  // 控制是否局部渲染
  @observable partial: boolean = false
  // 控制是否开启动画效果
  animation?: boolean | LFOptions.AnimationConfig
  // TODO: 控制画布缩放、平移的 Model
  @observable transformModel: TransformModel
  // 控制流程图编辑相关配置项 Model
  @observable editConfigModel: EditConfigModel

  flowId: number | string

  constructor(options: LFOptions.Common) {
    const {
      container,
      partial,
      background = {},
      grid,
      animation,
      idGenerator,
      edgeGenerator,
      customTrajectory,
    } = options

    this.rootEl = container
    this.partial = !!partial
    this.background = background
    if (typeof grid === 'object') {
      this.gridSize = grid.size || 1 // 默认 gridSize 设置为 1
    }
    this.theme = setupTheme(options.style)
    this.edgeType = options.edgeType || 'polyline'
    this.animation = setupAnimation(animation)
    this.overlapMode = options.overlapMode || OverlapMode.DEFAULT

    this.width = options.width || this.rootEl.getBoundingClientRect().width
    this.height = options.height || this.rootEl.getBoundingClientRect().height

    this.eventCenter = new EventEmitter()
    this.editConfigModel = new EditConfigModel(options)
    this.transformModel = new TransformModel(this.eventCenter, options)

    this.flowId = createUuid()
    this.idGenerator = idGenerator
    this.edgeGenerator = createEdgeGenerator(this, edgeGenerator)
    this.customTrajectory = customTrajectory
  }

  @computed
  get nodesMap(): GraphModel.NodesMapType {
    // TODO: nodesMap 改做返回 Map Or WeakMap 是否更好些
    return this.nodes.reduce((nMap, model, index) => {
      if (model.id) {
        nMap[model.id] = { index, model }
      }
      return nMap
    }, {} as GraphModel.NodesMapType)
  }

  @computed
  get edgesMap(): GraphModel.EdgesMapType {
    return this.edges.reduce((eMap, model, index) => {
      if (model.id) {
        eMap[model.id] = { index, model }
      }
      return eMap
    }, {} as GraphModel.EdgesMapType)
  }

  @computed
  get modelsMap(): GraphModel.ModelsMapType {
    return [...this.nodes, ...this.edges].reduce((mMap, model) => {
      mMap[model.id] = model
      return mMap
    }, {} as GraphModel.ModelsMapType)
  }

  // Elements
  /**
   * 基于 zIndex 对元素进行排序
   * TODO: 性能优化，but how???
   */
  @computed
  get sortElements() {
    const elements = [...this.nodes, ...this.edges].sort(
      (a, b) => a.zIndex - b.zIndex,
    )

    // 只显示可见区域的节点和边
    const visibleElements = []
    // TODO: 缓存，优化计算效率 by xutao. So what to do?
    const visibleLt: LogicFlow.PointTuple = [-MORE_SPACE_SIZE, -MORE_SPACE_SIZE]
    const visibleRb: LogicFlow.PointTuple = [
      this.width + MORE_SPACE_SIZE,
      this.height + MORE_SPACE_SIZE,
    ]

    for (let i = 0; i < elements.length; i++) {
      const currElement = elements[i]
      // 如果节点不在可见区域，且不是全元素显示模式，则隐藏节点
      if (
        currElement.visible &&
        (!this.partial ||
          currElement.isSelected ||
          this.isElementInArea(currElement, visibleLt, visibleRb, false, false))
      ) {
        visibleElements.push(currElement)
      }
    }

    return visibleElements
  }

  @computed
  get textEditElement() {
    const textEditNode = find(
      this.nodes,
      (node) => node.state === ElementState.TEXT_EDIT,
    )
    const textEditEdge = find(
      this.edges,
      (edge) => edge.state === ElementState.TEXT_EDIT,
    )
    return textEditNode || textEditEdge
  }

  @computed
  get selectElements(): Map<string, BaseNodeModel | BaseEdgeModel> {
    const elements = new Map()
    forEach(this.nodes, (node) => {
      if (node.isSelected) {
        elements.set(node.id, node)
      }
    })

    forEach(this.edges, (edge) => {
      if (edge.isSelected) {
        elements.set(edge.id, edge)
      }
    })

    return elements
  }

  isElementInArea(
    element: LogicFlow.GraphElement,
    lt: LogicFlow.PointTuple,
    rb: LogicFlow.PointTuple,
    wholeEdge: boolean = true,
    wholeNode: boolean = true,
  ): boolean {
    return isElementInArea(
      element,
      lt,
      rb,
      wholeEdge,
      wholeNode,
      this.transformModel,
    )
  }

  /**
   * 获取指定区域内的所有元素
   * @param leftTopPoint
   * @param rightBottomPoint
   * @param wholeEdge
   * @param wholeNode
   * @param ignoreHideElement
   */
  getAreaElements(
    leftTopPoint: LogicFlow.PointTuple,
    rightBottomPoint: LogicFlow.PointTuple,
    wholeEdge = true,
    wholeNode = true,
    ignoreHideElement = false,
  ): LogicFlow.GraphElement[] {
    const areaElements: LogicFlow.GraphElement[] = []

    forEach([...this.nodes, ...this.edges], (element) => {
      const isElementInArea = this.isElementInArea(
        element,
        leftTopPoint,
        rightBottomPoint,
        wholeEdge,
        wholeNode,
      )
      if (!ignoreHideElement || (element.visible && isElementInArea)) {
        areaElements.push(element)
      }
    })
    return areaElements
  }

  getElement(id: string): BaseNodeModel | BaseEdgeModel | undefined {
    return this.modelsMap[id]
  }

  getSelectElements(isIgnoreCheck = true): LogicFlow.GraphConfigData {
    const elements = this.selectElements
    const graphData: LogicFlow.GraphConfigData = {
      nodes: [],
      edges: [],
    }

    elements.forEach((element) => {
      if (element.baseType === ElementType.NODE) {
        graphData.nodes.push((element as BaseNodeModel).getData())
      }
      if (element.baseType === ElementType.EDGE) {
        const edgeData = (element as BaseEdgeModel).getData()
        const { sourceNodeId, targetNodeId } = edgeData
        const isNodeSelected =
          elements.get(sourceNodeId) && elements.get(targetNodeId)

        if (isIgnoreCheck || isNodeSelected) {
          graphData.edges.push(edgeData)
        }
      }
    })

    return graphData
  }

  /**
   * 将图形选中
   * @param id 元素 id
   * @param multiple 是否允许多选，如果为 true，不会将上一个选中的元素重置
   */
  @action
  selectElementById(id: string, multiple = false) {
    if (!multiple) {
      this.clearSelectElements()
    }
    const selectElement = this.getElement(id)
    selectElement?.setSelected(true)
  }

  /**
   * 将所有选中的元素重置为「非选中」状态
   */
  @action
  clearSelectElements() {
    this.selectElements.forEach((element) => {
      element.setSelected(false)
    })
    this.selectElements.clear()

    /**
     * 如果堆叠模式为默认模式，则将置顶元素恢复为原有层级
     */
    if (this.overlapMode === OverlapMode.DEFAULT) {
      this.topElement?.setZIndex()
    }
  }

  /**
   * 设置元素的 zIndex
   * 注意：默认堆叠模式下，不建议使用此方法。
   * @param id 元素 id
   * @param zIndex zIndex 的值，可以传数字，也支持传入 'top' | 'bottom'
   */
  @action
  setElementZIndex(id: string, zIndex: number | 'top' | 'bottom') {
    const element: BaseNodeModel | BaseEdgeModel =
      this.nodesMap[id]?.model || this.edgesMap[id]?.model
    if (element) {
      let index
      if (typeof zIndex === 'number') {
        index = zIndex
      }
      if (zIndex === 'top') {
        index = getZIndex()
      }
      if (zIndex === 'bottom') {
        index = getMinZIndex()
      }
      element.setZIndex(index)
    }
  }

  /**
   * 设置元素的状态的状态，在需要保证整个画布上所有的元素只有一个元素拥有某状态时，可以调用此方法
   * 比如：文本编辑、菜单显示等
   * additionStateData: 传递的额外值，如菜单显示的时候，需要传递期望菜单显示的位置。
   * @param id
   * @param state
   * @param additionStateData
   */
  @action
  setElementStateById(
    id: string,
    state: ElementState,
    additionStateData?: Model.AdditionStateDataType,
  ) {
    forEach(this.nodes, (node) => {
      if (node.id === id) {
        node.setElementState(state, additionStateData)
      } else {
        node.setElementState(ElementState.DEFAULT)
      }
    })

    forEach(this.edges, (edge) => {
      if (edge.id === id) {
        edge.setElementState(state, additionStateData)
      } else {
        edge.setElementState(ElementState.DEFAULT)
      }
    })
  }

  /**
   * 显示节点、连线文本编辑框
   * @param {string} id
   */
  @action
  editText(id: string) {
    this.setElementStateById(id, ElementState.TEXT_EDIT)
  }

  /**
   * 更新节点或边的文案
   * TODO: 确认下如果加一个 type 参数，是否可以提升效率。type 是 node 或 edge，可以减少至少一半的执行量
   * @param id 节点或者边 id
   * @param value 文案内容
   */
  @action
  updateText(id: string, value: string) {
    forEach(this.nodes, (node) => {
      if (node.id === id) {
        node.updateText(value)
      }
    })
    forEach(this.edges, (edge) => {
      if (edge.id === id) {
        edge.updateText(value)
      }
    })
  }

  // Model
  /**
   * 设置指定类型的 model
   * REMIND: 请勿直接使用
   * @param type 类型名称
   * @param model model 实例
   */
  setModel(type: string, model: BaseNodeModel | BaseEdgeModel) {
    return this.modelMap.set(type, model)
  }
  /**
   * 获取指定类型元素对应的 model
   * @param type
   */
  getModel(type: string) {
    return this.modelMap.get(type)
  }

  /**
   * 基于 id 获取节点的 model
   * @param nodeId
   */
  getNodeModelById(nodeId: string): BaseNodeModel | undefined {
    if (this.fakeNode && nodeId === this.fakeNode.id) {
      return this.fakeNode
    }
    return this.nodesMap[nodeId]?.model
  }

  /**
   * 基于 id 获取边的 model
   * @param edgeId
   */
  getEdgeModelById(edgeId: string): BaseEdgeModel | undefined {
    return this.edgesMap[edgeId]?.model
  }

  /**
   * 使用新的数据重新设置整个画布的元素
   * 注意：将会清除画布上所有已有的节点和边
   * @param graphData 图数据
   */
  graphDataToModel(graphData: LogicFlow.GraphConfigData) {
    if (!this.width || !this.height) {
      this.resize()
    }

    if (!graphData) {
      this.nodes = []
      this.edges = []
      return
    }

    this.nodes = map(graphData.nodes, (node: LogicFlow.NodeConfig) => {
      const NodeModel = this.getModel(node.type)
      if (!NodeModel) {
        throw new Error(`找不到 ${node.type} 对应的节点。`)
      }
      if (NodeModel.baseType !== ElementType.NODE) {
        throw new Error(`graphData 中存在非 Node 类型的数据。`)
      }
      const { x, y } = node
      if (x && y) {
        node.x = snapToGrid(x, this.gridSize)
        node.y = snapToGrid(y, this.gridSize)
        if (typeof node.text === 'object') {
          node.text.x -= getGridOffset(x, this.gridSize)
          node.text.y -= getGridOffset(y, this.gridSize)
        }
      }

      // TODO: 确认下面类型该如何定义，解决无法 new Model 的报错
      // @ts-ignore
      return new NodeModel(node, this)
    })
    this.edges = map(graphData.edges, (edge: LogicFlow.EdgeConfig) => {
      const EdgeModel = this.getModel(edge.type)
      if (!EdgeModel) {
        throw new Error(`找不到 ${edge.type} 对应的边。`)
      }
      if (EdgeModel.baseType !== ElementType.EDGE) {
        throw new Error(`graphData 中存在非 EDGE 类型的数据`)
      }
      // @ts-ignore
      return new EdgeModel(edge, this)
    })
  }

  /**
   * 获取画布数据
   */
  modelToGraphData(): LogicFlow.GraphConfigData {
    const nodes: LogicFlow.NodeData[] = []
    const edges: LogicFlow.EdgeData[] = []

    forEach(this.nodes, (node) => {
      const data = node.getData()
      if (data && !node.virtual) {
        nodes.push(data)
      }
    })
    forEach(this.edges, (edge) => {
      const data = edge.getData()
      if (data && !edge.virtual) {
        edges.push(data)
      }
    })

    return {
      nodes,
      edges,
    }
  }

  /**
   * 用户 history 记录的数据，忽略拖拽过程中的数据变更
   */
  modelToHistoryData(): false | HistoryData {
    let isNodeDragging = false
    const nodes = []
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i]
      if (node.isDragging) {
        isNodeDragging = true
      } else {
        nodes.push(node.getHistoryData())
      }
    }
    if (isNodeDragging) {
      return false
    }

    let isEdgeDragging = false
    const edges = []
    for (let i = 0; i < this.edges.length; i++) {
      const edge = this.edges[i]
      if (edge.isDragging) {
        isEdgeDragging = true
        break
      } else {
        edges.push(edge.getHistoryData())
      }
    }
    if (isEdgeDragging) {
      return false
    }

    return {
      nodes,
      edges,
    }
  }

  // Edge
  /**
   * 修改边的 id，如果不传新的 id，会内部自动创建一个
   * @param edgeId 将要被修改的 edgeId
   * @param newId 可选，修改后的 id
   * @return 修改后的节点 id，如果传入的 edgeId 不存在，返回空字符串
   */
  changeEdgeId(edgeId: string, newId?: string): string {
    if (!newId) {
      newId = createUuid()
    }
    if (this.edgesMap[newId]) {
      console.warn(`当前流程图已存在 id 为 ${newId} 的边，修改失败`)
      return ''
    }
    const targetEdge = this.edgesMap[edgeId]
    if (!targetEdge) {
      console.warn(`当前流程图不存在 id 为 ${edgeId} 的边，修改失败`)
      return ''
    }
    forEach(this.edges, (edge) => {
      if (edge.id === edgeId) {
        edge.changeEdgeId(newId as string)
      }
    })
    return newId
  }

  /**
   * 移动边上的 Text
   * @param edge 边 model
   * @param x x 轴坐标值
   * @param y y 轴坐标值
   */
  handleEdgeTextMove(edge: BaseEdgeModel, x: number, y: number) {
    // TODO: 找到更好的边位置移动处理方式
    // 如果是自定义边文本位置，则移动节点的时候重新计算其位置
    if (edge.customTextPosition) {
      edge.resetTextPosition()
    } else if (edge.modelType === ModelType.POLYLINE_EDGE && edge.text?.value) {
      const textPosition = edge.text
      // TODO: CR 确认下面函数的方法是否合理（跟旧代码对比一下）
      const pointsList = pointsStr2PointsList(edge.points)
      const polyline = pointsList2Polyline(pointsList)
      const newPoint = closestPointOnPolyline(
        textPosition,
        polyline,
        this.gridSize,
      )
      edge.moveText(newPoint.x - textPosition.x, newPoint.y - textPosition.y)
    } else {
      const { x: x1, y: y1 } = edge.textPosition
      edge.moveText(x1 - x, y1 - y)
    }
  }

  /**
   * 根据节点 id 获取与之相关的所有边的 model
   * @param nodeId 目标节点 id
   * @param type sourceNodeId -> 源节点；targetNodeId -> 目标节点
   */
  getRelatedEdgesByType(
    nodeId: string,
    type: 'sourceNodeId' | 'targetNodeId',
  ): BaseEdgeModel[] {
    return filter(this.edges, (edge) => {
      if (edge[type] === nodeId) {
        const edgeData = edge.getData()

        this.eventCenter.emit(EventType.EDGE_DELETE, { data: edgeData })
        return false
      }
      return true
    })
  }

  /**
   * 添加节点移动限制规则，在节点移动的时候触发。
   * 如果方法返回false, 则会阻止节点移动。
   * @param fn function
   * @example
   *
   * graphModel.addNodeMoveRules((nodeModel, x, y) => {
   *   if (nodeModel.properties.disabled) {
   *     return false
   *   }
   *   return true
   * })
   *
   */
  addNodeMoveRules(fn: Model.NodeMoveRule) {
    if (!this.nodeMoveRules.includes(fn)) {
      this.nodeMoveRules.push(fn)
    }
  }

  /**
   * 设置默认的边类型
   * @param type LFOptions.EdgeType | string 默认自带类型或自定义边类型
   */
  @action
  setDefaultEdgeType(type: string | LFOptions.EdgeType) {
    this.edgeType = type
  }

  /**
   * 给两个节点添加一条边
   * @param edgeConfig 边的信息
   */
  @action
  addEdge(edgeConfig: LogicFlow.EdgeConfig): BaseEdgeModel {
    const originEdgeData = formatRawData(edgeConfig)
    // 边的类型优先级：自定义 > 全局 > 默认
    const { type = this.edgeType, id } = originEdgeData
    if (id && this.edgesMap[id]) {
      delete originEdgeData.id
    }

    const Model = this.getModel(type)
    if (!Model) {
      throw new Error(`找不到 ${type} 对应的边，请确认是否已注册此类型边。`)
    }

    // @ts-ignore
    const edgeModel = new Model({ ...originEdgeData, type }, this)
    const edgeData = edgeModel.getData()
    this.edges.push(edgeModel)
    this.eventCenter.emit(EventType.EDGE_ADD, { data: edgeData })

    return edgeModel
  }

  /**
   * 移动 nodeId 相关边，内部方法，请勿直接使用
   * @param nodeId 移动的节点 id
   * @param deltaX 移动 x 轴距离
   * @param deltaY 移动 y 轴距离
   * @private
   */
  @action
  private moveEdge(nodeId: string, deltaX: number, deltaY: number) {
    const relatedEdges = this.getNodeEdges(nodeId)
    forEach(relatedEdges, (edge) => {
      const { x, y } = edge.textPosition
      const isSourceNode = edge.sourceNodeId === nodeId
      const isTargetNode = edge.targetNodeId === nodeId
      if (isSourceNode) {
        edge.moveStartPoint(deltaX, deltaY)
      }
      if (isTargetNode) {
        edge.moveEndPoint(deltaX, deltaY)
      }

      // 如果有文案，当节点移动引起文案位置修改时，找出当前文案位置与最新边距离最短位置的点
      // 最大程度保持节点位置不变且在边上
      if (isSourceNode || isTargetNode) {
        this.handleEdgeTextMove(edge, x, y)
      }
    })
  }

  // TODO: 是否需要和 Node 保持一致，更名为 deleteNode
  /**
   * 通过 edgeId 删除边
   * @param edgeId 边 id
   */
  @action
  deleteEdgeById(edgeId: string) {
    const edge = this.edgesMap[edgeId]
    if (edge) {
      const idx = edge.index
      const edgeData = edge.model.getData()
      this.edges.splice(idx, 1)
      this.eventCenter.emit(EventType.EDGE_DELETE, { data: edgeData })
    }
  }

  /**
   * 删除 sourceNodeId 为 nodeId 的所有边
   * @param nodeId 节点 id
   */
  @action
  deleteEdgeBySource(nodeId: string) {
    this.edges = this.getRelatedEdgesByType(nodeId, 'sourceNodeId')
  }

  /**
   * 删除 targetNodeId 为 nodeId 的所有边
   * @param nodeId 节点 id
   */
  @action
  deleteEdgeByTarget(nodeId: string) {
    this.edges = this.getRelatedEdgesByType(nodeId, 'targetNodeId')
  }

  /**
   * 删除两节点之间的连线
   * @param sourceNodeId 开始节点 id
   * @param targetNodeId 结束节点 id
   */
  @action
  deleteEdgeBySourceAndTarget(sourceNodeId: string, targetNodeId: string) {
    this.edges = filter(this.edges, (edge) => {
      if (
        edge.sourceNodeId === sourceNodeId &&
        edge.targetNodeId === targetNodeId
      ) {
        const edgeData = edge.getData()
        this.eventCenter.emit(EventType.EDGE_DELETE, { data: edgeData })
        return false
      }
      return true
    })
  }

  /**
   * 根据 edgeId 选中边
   * @param edgeId 边 id
   * @param multiple 是否多选，如果非多选状态，则取消其余选中的元素
   */
  @action
  selectEdgeById(edgeId: string, multiple: boolean | string = false) {
    if (!multiple) {
      this.clearSelectElements()
    }
    const edge = this.edgesMap[edgeId]?.model
    edge?.setSelected()
  }

  /**
   * 更改边的类型
   * @param edgeId 边 id
   * @param type LFOptions.EventType | string
   */
  @action
  changeEdgeType(edgeId: string, type: string) {
    const edge = this.getEdgeModelById(edgeId)
    if (!edge) {
      console.warn(`当前不存在 id 为 ${edgeId} 的边`)
      return
    }
    if (edge.type === type) {
      // 若当前类型和目标类型一致，则不做处理
      return
    }
    const edgeData = edge.getData()
    edgeData.type = type
    const Model = this.getModel(type)
    if (!Model) {
      throw new Error(`当前不存在类型为 ${type} 的边，请确认是否已注册此类型边`)
    }
    delete edgeData.pointsList
    // @ts-ignore
    const newEdgeModel = new Model(edgeData, this)
    this.edges.splice(this.edgesMap[edgeId].index, 1, newEdgeModel)
  }

  // 开启边动画开关
  @action
  openEdgeAnimation(edgeId: string) {
    const edge = this.getEdgeModelById(edgeId)
    edge?.openEdgeAnimation()
  }

  // 关闭边动画开关
  @action
  closeEdgeAnimation(edgeId: string) {
    const edge = this.getEdgeModelById(edgeId)
    edge?.closeEdgeAnimation()
  }

  // Node
  @computed
  get selectNodes() {
    const nodes: BaseNodeModel[] = []
    forEach(this.nodes, (node) => {
      if (node.isSelected) {
        nodes.push(node)
      }
    })
    return nodes
  }

  /**
   * 修改节点的 id，如果不传新的 id，会内部自动创建一个。
   * @param nodeId 将要被修改的 id
   * @param newId 可选，修改后的 id
   * @returns 修改后的节点 id，如果传入的 oldId 不存在，则返回空字符串
   */
  changeNodeId(nodeId: string, newId?: string): string {
    if (!newId) {
      newId = createUuid()
    }
    if (this.nodesMap[newId]) {
      console.warn(`当前流程图已存在 id 为 ${newId} 的节点，修改失败`)
      return ''
    }
    const targetNode = this.nodesMap[nodeId]
    if (!targetNode) {
      console.warn(`当前流程图不存在 id 为 ${nodeId} 的节点，修改失败`)
      return ''
    }
    forEach(this.edges, (edge) => {
      if (edge.sourceNodeId === nodeId) {
        edge.sourceNodeId = newId as string
      }
      if (edge.targetNodeId === nodeId) {
        edge.targetNodeId = newId as string
      }
    })
    targetNode.model.id = newId
    this.nodesMap[newId] = targetNode
    return newId
  }

  /**
   * 获取某节点上所有边的 model
   * @param nodeId
   */
  getNodeEdges(nodeId: string): BaseEdgeModel[] {
    const edges: BaseEdgeModel[] = []
    for (let i = 0; i < this.edges.length; i++) {
      const edge = this.edges[i]
      const existAsSourceNode = this.edges[i].sourceNodeId === nodeId
      const existAsTargetNode = this.edges[i].targetNodeId === nodeId
      if (existAsSourceNode || existAsTargetNode) {
        edges.push(edge)
      }
    }
    return edges
  }

  // 内部保留方法，请勿直接使用
  @action
  setFakeNode(node: BaseNodeModel) {
    this.fakeNode = node
  }

  // 内部保留方法，请勿直接使用
  @action
  removeFakeNode() {
    this.fakeNode = null
  }

  @action
  addNode(
    nodeConfig: LogicFlow.NodeConfig,
    eventType: EventType = EventType.NODE_ADD,
    event?: MouseEvent,
  ) {
    const originNodeData = formatRawData(nodeConfig)
    // 添加节点的时候，如果这个节点 id 已经存在，则采用新 id
    const { id, type, x, y } = originNodeData
    if (id && this.nodesMap[id]) {
      delete originNodeData.id
    }
    const Model = this.getModel(type)
    if (!Model) {
      throw new Error(`找不到 ${type} 对应的节点，请确认是否已注册此类型节点`)
    }
    originNodeData.x = snapToGrid(x, this.gridSize)
    originNodeData.y = snapToGrid(y, this.gridSize)
    // @ts-ignore
    const nodeModel: BaseNodeModel = new Model(originNodeData, this)
    this.nodes.push(nodeModel)

    const nodeData = nodeModel.getData()
    const eventData: Record<string, unknown> = { data: nodeData }
    if (event) {
      eventData.e = event
    }
    this.eventCenter.emit(eventType, eventData)
    return nodeModel
  }

  // 删除节点
  @action
  deleteNode(nodeId: string) {
    const nodeData = this.nodesMap[nodeId]?.model.getData()

    this.deleteEdgeBySource(nodeId)
    this.deleteEdgeByTarget(nodeId)

    this.nodes.splice(this.nodesMap[nodeId].index, 1)
    this.eventCenter.emit(EventType.NODE_DELETE, { data: nodeData })
  }

  // 克隆节点
  @action
  cloneNode(nodeId: string) {
    const node = this.getNodeModelById(nodeId)
    const nodeData = node?.getData()
    if (nodeData) {
      const configData = pickNodeConfig(nodeData)
      configData.x += 30
      configData.y += 30
      configData.id = ''
      if (configData.text && typeof configData.text === 'object') {
        configData.text.x += 30
        configData.text.y += 30
      }
      const addedNodeModel = this.addNode(configData)
      addedNodeModel.setSelected(true)
      node?.setSelected(false)
      return addedNodeModel.getData()
    }
  }

  // 移动节点
  @action
  moveNode(
    nodeId: string,
    deltaX: number,
    deltaY: number,
    isIgnoreRule: boolean = false,
  ) {
    // 1) 移动节点
    const node = this.nodesMap[nodeId]
    if (!node) {
      console.warn(`不存在 id 为 ${nodeId} 的节点，无法移动`)
      return
    }
    const nodeModel = node.model
    const [dx, dy] = nodeModel.getMoveDistance(deltaX, deltaY, isIgnoreRule)
    // 2) 移动边
    this.moveEdge(nodeId, dx, dy)
  }

  /**
   * 移动节点 - 绝对位置
   * @param nodeId 节点 id
   * @param x x 轴目标位置
   * @param y y 轴目标位置
   * @param isIgnoreRule 是否忽略条件，默认为 false
   */
  @action
  moveNode2Coordinate(
    nodeId: string,
    x: number,
    y: number,
    isIgnoreRule: boolean = false,
  ) {
    const node = this.getNodeModelById(nodeId)
    if (!node) {
      console.warn(`当前不存在 id 为 ${nodeId} 的节点`)
      return
    }
    const { x: originX, y: originY } = node
    const deltaX = x - originX
    const deltaY = y - originY
    this.moveNode(nodeId, deltaX, deltaY, isIgnoreRule)
  }

  /**
   * 批量移动节点，节点移动时，会动态计算所有移动节点与未移动节点的边的位置
   * 移动节点之间的边会保持相对位置
   * @param nodeIds 要移动的节点 id
   * @param deltaX 沿 x 轴移动的距离
   * @param deltaY 沿 y 轴移动的距离
   * @param isIgnoreRule 是否忽略 Rule，默认为 false
   */
  @action
  moveNodes(
    nodeIds: string[],
    deltaX: number,
    deltaY: number,
    isIgnoreRule: boolean = false,
  ) {
    // Fix: https://github.com/didi/LogicFlow/issues/1015
    // 如果节点之间存在连线，则只移动连线一次
    const nodeIdMap = reduce(
      nodeIds,
      (acc: Record<string, Model.VectorType | undefined>, nodeId) => {
        const node = this.getNodeModelById(nodeId)
        acc[nodeId] = node?.getMoveDistance(deltaX, deltaY, isIgnoreRule)
        return acc
      },
      {},
    )

    for (let i = 0; i < this.edges.length; i++) {
      const edge = this.edges[i]
      const { x, y } = edge.textPosition
      const sourceMoveDistance = nodeIdMap[edge.sourceNodeId]
      const targetMoveDistance = nodeIdMap[edge.targetNodeId]

      if (sourceMoveDistance) {
        const [textDx, textDy] = sourceMoveDistance
        edge.moveStartPoint(textDx, textDy)
      }
      if (targetMoveDistance) {
        const [textDx, textDy] = targetMoveDistance
        edge.moveEndPoint(textDx, textDy)
      }
      if (sourceMoveDistance || targetMoveDistance) {
        //
        this.handleEdgeTextMove(edge, x, y)
      }
    }
  }

  /**
   * 通过 id 选中节点
   * @param nodeId 节点 id
   * @param multiple 是否多选，如果多选，则不去掉已选中节点的选中状态
   */
  @action
  selectNodeById(nodeId: string, multiple: boolean | string = false) {
    if (!multiple) {
      this.clearSelectElements()
    }
    const node = this.getNodeModelById(nodeId)
    node?.setSelected()
  }

  @action
  changeNodeType(nodeId: string, type: string) {
    const node = this.getNodeModelById(nodeId)
    if (!node) {
      console.warn(`当前不存在 id 为 ${nodeId} 的节点`)
      return
    }
    const data = node.getData()
    data.type = type
    const Model = this.getModel(type)
    if (!Model) {
      throw new Error(
        `当前不存在 ${type} 对应的节点，请确认是否已注册此类型节点`,
      )
    }
    // @ts-ignore
    const newNodeModel = new Model(data, this)
    this.nodes.splice(this.nodesMap[nodeId].index, 1, newNodeModel)

    // 微调边 - 微操大师
    const edges = this.getNodeEdges(nodeId)
    forEach(edges, (edge) => {
      if (edge.sourceNodeId === nodeId && edge.startPoint) {
        const point = getNodeAnchorPosition(newNodeModel, edge.startPoint)
        edge.updateStartPoint(point)
      }
      if (edge.targetNodeId === nodeId && edge.endPoint) {
        const point = getNodeAnchorPosition(newNodeModel, edge.endPoint)
        edge.updateEndPoint(point)
      }
    })
  }

  /**
   * 获取所有以此节点为「目标节点」的边
   * @param nodeId
   */
  @action
  getNodeIncomingEdge(nodeId: string): BaseEdgeModel[] {
    return filter(this.edges, (edge) => {
      return edge.targetNodeId === nodeId
    })
  }

  /**
   * 获取所有以此节点为「源节点」的边
   * @param nodeId
   */
  @action
  getNodeOutgoingEdge(nodeId: string): BaseEdgeModel[] {
    return filter(this.edges, (edge) => {
      return edge.sourceNodeId === nodeId
    })
  }

  /**
   * 获取连接到 id 为 nodeId 节点的所有「源节点」
   * @param nodeId
   */
  @action
  getNodeIncomingNode(nodeId: string): BaseNodeModel[] {
    const incomingEdges = this.getNodeIncomingEdge(nodeId)
    return map(incomingEdges, (edge) => {
      return this.nodesMap[edge.sourceNodeId].model
    })
  }

  /**
   * 获取连接到 id 为 nodeId 节点的所有「目标节点」
   * @param nodeId
   */
  @action
  getNodeOutgoingNode(nodeId: string): BaseNodeModel[] {
    const outgoingEdges = this.getNodeOutgoingEdge(nodeId)
    return map(outgoingEdges, (edge) => {
      return this.nodesMap[edge.targetNodeId].model
    })
  }

  // Point
  /**
   * 因为流程图所在的位置可以是页面任何地方
   * 当内部事件需要获取触发事件时，其相对于画布左上角的位置
   * 需要事件触发位置减去画布相对于 client 的位置
   */
  getPointByClient({
    x: px,
    y: py,
  }: LogicFlow.Position): LogicFlow.ClientPosition {
    const bBox = this.rootEl.getBoundingClientRect()
    const domOverlayPosition = {
      x: px - bBox.left,
      y: py - bBox.top,
    }
    const [x, y] = this.transformModel.hp2Cp([
      domOverlayPosition.x,
      domOverlayPosition.y,
    ])
    return {
      domOverlayPosition,
      canvasOverlayPosition: { x, y },
    }
  }

  // Graph Update
  /**
   * 修改对应元素 model 中的属性
   * REMIND: 请慎用此方法，除非您对 LogicFlow 内部有足够的了解
   * 大多数情况下，请使用  setProperties, updateText, changeNodeId 等方法
   * FBI WARNING：如果直接使用此方法修改节点的 id，会导致连接到此节点的边的 sourceNodeId 无对应节点的问题
   * @param id
   * @param attributes
   */
  updateAttributes(id: string, attributes: LogicFlow.AttributesType) {
    const element = this.getElement(id)
    element?.updateAttributes(attributes)
  }

  /**
   * 获取图形区域虚拟矩形的大小及其中心位置
   * TODO: 确认当前逻辑是否会包含连线在内，是否通过参数控制
   * TODO: 完成该方法
   */
  getVirtualRectSize(
    includeEdge: boolean = false,
  ): GraphModel.VirtualRectProps {
    const xAxisValues: number[] = []
    const yAxisValues: number[] = []

    forEach(this.nodes, (node) => {
      const { x, y, width, height } = node
      const { strokeWidth = 0 } = node.getNodeStyle()

      xAxisValues.push(x + width / 2 + strokeWidth)
      xAxisValues.push(x - width / 2 - strokeWidth)
      yAxisValues.push(y + height / 2 + strokeWidth)
      yAxisValues.push(y - height / 2 - strokeWidth)
    })

    // 获取边上所有的点，将边也考虑到其中，获取画布区域
    // TODO: 需要测试该代码块
    if (includeEdge) {
      forEach(this.edges, (edge) => {
        const { startPoint, endPoint } = edge
        const pointsList = pointsStr2PointsList(edge.points)
        if (startPoint && endPoint) {
          const allPoints = [startPoint, ...pointsList, endPoint]
          forEach(allPoints, (point) => {
            xAxisValues.push(point.x)
            yAxisValues.push(point.y)
          })
        }
      })
    }

    const minX = Math.min(...xAxisValues)
    const maxX = Math.max(...xAxisValues)
    const minY = Math.min(...yAxisValues)
    const maxY = Math.max(...yAxisValues)

    const width = maxX - minX || 0
    const height = maxY - minY || 0

    return {
      width,
      height,
      x: minX + width / 2,
      y: minY + height / 2,
    }
  }

  /**
   * 清空画布
   */
  @action
  clearData() {
    this.nodes = []
    this.edges = []
  }

  /**
   * 设置主题
   * @param style 新传入的主题样式
   */
  @action
  setTheme(style: Partial<LogicFlow.Theme>) {
    this.theme = updateTheme({ ...this.theme, ...style })
  }

  /**
   * 重设画布的宽高
   * @param width
   * @param height
   */
  @action
  resize(width?: number, height?: number): void {
    this.width = width || this.rootEl.getBoundingClientRect().width
    this.height = height || this.rootEl.getBoundingClientRect().height

    if (!this.width || !this.height) {
      throw new Error(
        `渲染画布时无法获取画布宽高信息，请确认 container 已挂载至 DOM。 @see https://github.com/didi/LogicFlow/issues/675'`,
      )
    }
  }

  /**
   * 将某个元素放置到顶部。
   * 如果堆叠模式为默认模式，则将原置顶元素重新恢复原有层级.
   * 如果堆叠模式为递增模式，则将指定元素 zIndex 设置为当前最大 zIndex + 1.
   * @see todo link 堆叠模式
   * @param id 元素 id
   */
  @action
  toFront(id: string) {
    const element = this.getElement(id)
    if (element) {
      if (this.overlapMode === OverlapMode.DEFAULT) {
        this.topElement?.setZIndex()
        element.setZIndex(ElementMaxZIndex)
        this.topElement = element
      }
      if (this.overlapMode === OverlapMode.INCREASE) {
        this.setElementZIndex(id, 'top')
      }
    }
  }

  /**
   * 将图像整体移动到画布中心
   */
  @action
  translateCenter() {
    const { nodes, width, height, rootEl, transformModel } = this
    if (nodes.length) {
      const containerWidth = width || rootEl.clientWidth
      const containerHeight = height || rootEl.clientHeight

      const { x: px, y: py } = this.getVirtualRectSize()
      transformModel.focusOn(px, py, containerWidth, containerHeight)
    }
  }

  /**
   * 画布图形适应屏幕大小
   * @param verticalOffset 距离盒子上下的距离， 默认为 20
   * @param horizontalOffset 距离盒子左右的距离，默认为 20
   */
  @action
  fitView(verticalOffset = 20, horizontalOffset = 20) {
    const { nodes, width, height, rootEl, transformModel } = this
    if (nodes.length) {
      const containerWidth = width || rootEl.clientWidth
      const containerHeight = height || rootEl.clientHeight

      const {
        width: vWidth,
        height: vHeight,
        x: px,
        y: py,
      } = this.getVirtualRectSize()

      const zoomRatioX = (vWidth + horizontalOffset) / containerWidth
      const zoomRatioY = (vHeight + verticalOffset) / containerHeight
      const zoomRatio = 1 / Math.max(zoomRatioX, zoomRatioY) || 1
      const point: LogicFlow.PointTuple = [
        containerWidth / 2,
        containerHeight / 2,
      ]

      transformModel.zoom(zoomRatio, point)
      transformModel.focusOn(px, py, containerWidth, containerHeight)
    }
  }
}

export namespace GraphModel {
  export type NodesMapType = Record<
    string,
    {
      index: number
      model: BaseNodeModel
    }
  >
  export type EdgesMapType = Record<
    string,
    {
      index: number
      model: BaseEdgeModel
    }
  >

  export type ModelsMapType = Record<string, BaseNodeModel | BaseEdgeModel>

  // 虚拟矩阵信息类型
  export type VirtualRectProps = {
    width: number
    height: number
    x: number
    y: number
  }
}

export default GraphModel

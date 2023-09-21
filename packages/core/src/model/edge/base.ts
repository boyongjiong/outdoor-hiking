import { assign, isUndefined } from 'lodash'
import { observable, computed, action, toJS } from 'mobx'
import { Model, GraphModel, BaseNodeModel } from '..'
import { LogicFlow } from '../..'
import {
  createUuid,
  getZIndex,
  pickEdgeConfig,
  formatRawData,
} from '../../util'
import { distanceBetweenPoints } from '../../algorithm'
import {
  ElementState,
  ElementType,
  OverlapMode,
  ModelType,
} from '../../constant'

export interface IBaseEdgeModel extends Model.BaseModel {
  /**
   * model 基础类型，固定为 edge
   */
  readonly baseType: ElementType
  sourceNodeId: string
  targetNodeId: string
  startPoint: LogicFlow.Point
  endPoint: LogicFlow.Point
  points: string
  pointsList: LogicFlow.Point[]

  isAnimation: boolean
  isDragging?: boolean
  isShowAdjustPoint: boolean // 是否显示边两端的调整点

  sourceAnchorId?: string
  targetAnchorId?: string
  arrowConfig?: {
    markerStart: string
    markerEnd: string
  }
}

export class BaseEdgeModel implements IBaseEdgeModel {
  readonly baseType = ElementType.EDGE
  static baseType: ElementType = ElementType.EDGE

  // 数据属性
  public id = ''
  @observable readonly type = ''
  @observable sourceNodeId = ''
  @observable targetNodeId = ''
  @observable startPoint: LogicFlow.Point
  @observable endPoint: LogicFlow.Point

  @observable text = {
    value: '',
    x: 0,
    y: 0,
    draggable: false,
    editable: true,
  }
  @observable properties: Record<string, unknown> = {}
  // TODO: 确认类型，edge 独有
  @observable points: string = ''
  @observable pointsList: LogicFlow.Point[] = []

  // 状态属性
  @observable isSelected = false
  @observable isHovered = false
  @observable isHittable = true // 细粒度控制边是否对用户操作进行反应
  @observable draggable = true
  @observable isDragging = false
  @observable visible = true
  readonly virtual = false

  @observable isAnimation = false
  @observable isShowAdjustPoint = false // 是否显示边两端的调整点
  // 引用属性
  graphModel: GraphModel
  @observable zIndex: number = 0
  @observable state = ElementState.DEFAULT

  modelType = ModelType.EDGE
  additionStateData?: Model.AdditionStateDataType

  sourceAnchorId: string | undefined = ''
  targetAnchorId: string | undefined = ''

  // TODO: 确认是否需要 menu
  // menu?: MenuConfig[];
  customTextPosition = false // 是否自定义边文本位置
  @observable style: LogicFlow.CommonTheme = {} // 每个节点自己的样式，动态修改
  @observable arrowConfig = {
    markerStart: `url(#marker-start-${this.id})`,
    markerEnd: `url(#marker-end-${this.id})`,
  };
  [propName: string]: unknown

  constructor(data: LogicFlow.EdgeConfig, graphModel: GraphModel) {
    const basePosition: LogicFlow.Position = { x: 0, y: 0 }
    this.startPoint = basePosition
    this.endPoint = basePosition

    this.graphModel = graphModel
    this.initEdgeData(data)
    this.setAttributes()
  }

  /**
   * @overridable 用户可自定义 - 自定义此类型节点 ID 默认生成方式
   * @returns string | null
   */
  public createId(): string | null {
    return null
  }

  private formatText(data: LogicFlow.EdgeConfig): void {
    const { x, y } = this.textPosition
    const { text } = data
    const defaultText = {
      value: '',
      x,
      y,
      draggable: false,
      editable: true,
    }
    if (!text) {
      data.text = { ...defaultText }
    } else {
      if (typeof text === 'string') {
        data.text = {
          ...defaultText,
          value: text,
        }
      } else if (Object.prototype.toString.call(text) === '[object Object]') {
        data.text = {
          ...defaultText,
          x: text.x || x,
          y: text.y || y,
          value: text.value || '',
        }
        if (!isUndefined(text.draggable)) {
          data.text.draggable = text.draggable
        }
        if (!isUndefined(text.editable)) {
          data.text.editable = text.editable
        }
      }
    }
  }

  initEdgeData(data: LogicFlow.EdgeConfig) {
    const {
      idGenerator,
      overlapMode,
      editConfigModel: { adjustEdgeStartAndEnd },
    } = this.graphModel
    if (!data.properties) {
      data.properties = {}
    }
    if (!data.id) {
      // 优先级：自定义边 id > 全局自定义边 id > 内置
      const globalId = idGenerator && idGenerator(data.type)
      const edgeId = this.createId()
      data.id = edgeId || globalId || createUuid()
    }

    this.arrowConfig.markerEnd = `url(#marker-end-${data.id})`
    this.arrowConfig.markerStart = `url(#marker-start-${data.id})`
    this.isShowAdjustPoint = adjustEdgeStartAndEnd

    // TODO: 更新
    // 文本位置依赖于边上的所有拐点
    assign(this, pickEdgeConfig(data))

    if (overlapMode) {
      this.zIndex = data.zIndex || getZIndex()
    }

    // 设置边的 Anchors，即边的两个端点
    // 端点依赖于 edgeData 的 sourceNode 和 targetNode
    this.setupAnchors()
    // 边的拐点依赖于两个端点
    this.initPoints()
    // 文本位置依赖于边上的所有拐点
    this.formatText(data)
  }

  getData(): LogicFlow.EdgeData {
    const { x, y, value } = this.text
    const data: LogicFlow.EdgeData = {
      id: this.id,
      type: this.type,
      sourceNodeId: this.sourceNode.id,
      targetNodeId: this.targetNode.id,
      startPoint: Object.assign({}, this.startPoint),
      endPoint: Object.assign({}, this.endPoint),
      properties: toJS(this.properties),
    }
    if (value) {
      data.text = { x, y, value }
    }
    if (this.graphModel.overlapMode === OverlapMode.INCREASE) {
      data.zIndex = this.zIndex
    }
    return data
  }

  getHistoryData(): LogicFlow.EdgeData {
    return this.getData()
  }

  /**
   * 设置 model 属性
   * @override 支持重写
   * 每次 properties 发生变化会触发
   */
  setAttributes() {}

  getTextPosition(): LogicFlow.Point {
    return {
      x: 0,
      y: 0,
    }
  }

  @computed get sourceNode() {
    return this.graphModel.nodesMap[this.sourceNodeId]?.model
  }
  @computed get targetNode() {
    return this.graphModel.nodesMap[this.targetNodeId]?.model
  }

  @computed get textPosition(): LogicFlow.Point {
    return this.getTextPosition()
  }

  // 重置文本位置
  @action resetTextPosition() {
    const { x, y } = this.textPosition
    this.text.x = x
    this.text.y = y
  }

  /**
   * 移动边上的文本
   * @param deltaX
   * @param deltaY
   */
  @action moveText(deltaX: number, deltaY: number): void {
    if (this.text) {
      const { x, y, value, draggable, editable } = this.text
      this.text = {
        value,
        editable,
        draggable,
        x: x + deltaX,
        y: y + deltaY,
      }
    }
  }
  /**
   * 设置文本的位置和值
   */
  @action setText(textConfig: LogicFlow.TextConfig): void {
    if (textConfig) {
      assign(this.text, textConfig)
    }
  }
  /**
   * 更新文本的值
   */
  @action updateText(value: string): void {
    this.text = {
      ...toJS(this.text),
      value,
    }
  }

  //Anchors 相关
  getAnchorPosition(
    sourceNode: BaseNodeModel,
    targetPosition: LogicFlow.Position,
  ): LogicFlow.Point {
    let minDistance: number
    const { anchors: sourceAnchors } = sourceNode
    let position: LogicFlow.Point = sourceAnchors[0]
    sourceAnchors.forEach((anchor) => {
      const distance = distanceBetweenPoints(anchor, targetPosition)
      if (minDistance === undefined) {
        minDistance = distance
        position = anchor
      } else if (distance < minDistance) {
        minDistance = distance
        position = anchor
      }
    })

    return position
  }
  // TODO: 下面这两个方法是否可优化，看着不太聪明的亚子
  getBeginAnchor(
    sourceNode: BaseNodeModel,
    targetNode: BaseNodeModel,
  ): LogicFlow.Point {
    const targetPosition: LogicFlow.Position = {
      x: targetNode.x,
      y: targetNode.y,
    }
    return this.getAnchorPosition(sourceNode, targetPosition)
  }
  getEndAnchor(targetNode: BaseNodeModel): LogicFlow.Point {
    return this.getAnchorPosition(
      targetNode,
      this.startPoint as LogicFlow.Position,
    )
  }
  @action setupAnchors() {
    // 先找离目标节点最近的开始节点的锚点
    if (!this.sourceAnchorId || !this.startPoint) {
      const anchor = this.getBeginAnchor(this.sourceNode, this.targetNode)
      if (!this.startPoint) {
        this.startPoint = {
          x: anchor.x,
          y: anchor.y,
        }
      }
      if (!this.sourceAnchorId) {
        this.sourceAnchorId = anchor.id
      }
    }

    // 再找离开始确定的开始节点锚点最近的目标节点的锚点
    if (!this.targetAnchorId || !this.endPoint) {
      const anchor = this.getEndAnchor(this.targetNode)
      if (!this.endPoint) {
        this.endPoint = {
          x: anchor.x,
          y: anchor.y,
        }
      }
      if (!this.targetAnchorId) {
        this.targetAnchorId = anchor.id
      }
    }
  }

  // 状态相关 Action
  @action setSelected(flag = true) {
    this.isSelected = flag
  }
  @action setHovered(flag = true) {
    this.isHovered = flag
  }
  @action setHittable(flag = true) {
    this.isHittable = flag
  }
  @action setEdgeAnimation(flag = true) {
    this.isAnimation = flag
  }
  // TODO: 待废弃下面 API
  @action openEdgeAnimation() {
    this.isAnimation = true
  }
  @action closeEdgeAnimation() {
    this.isHittable = false
  }

  // Point 相关
  @action initPoints() {}
  @action updateStartPoint(anchor: LogicFlow.Point) {
    this.startPoint = anchor
  }
  @action updateEndPoint(anchor: LogicFlow.Point) {
    this.endPoint = anchor
  }
  @action moveStartPoint(deltaX: number, deltaY: number) {
    if (this.startPoint) {
      this.startPoint.x += deltaX
      this.startPoint.y += deltaY
    }
  }
  @action moveEndPoint(deltaX: number, deltaY: number) {
    if (this.endPoint) {
      this.endPoint.x += deltaX
      this.endPoint.y += deltaY
    }
  }
  // 获取边调整的起点
  @action getAdjustStart() {
    return this.endPoint
  }
  // 获取边调整的终点
  @action getAdjustEnd() {
    return this.endPoint
  }
  @action updateAfterAdjustStartAndEnd({
    startPoint,
    endPoint,
  }: Model.AdjustEdgeStartAndEndParams) {
    this.updateStartPoint({ x: startPoint.x, y: startPoint.y })
    this.updateEndPoint({ x: endPoint.x, y: endPoint.y })
  }

  // State 相关方法更新
  @action changeEdgeId(id: string) {
    const { markerStart, markerEnd } = this.arrowConfig
    if (markerStart && markerStart === `url(#marker-start-${this.id})`) {
      this.arrowConfig.markerStart = `url(#marker-start-${id})`
    }
    if (markerEnd && markerEnd === `url(#marker-end-${this.id})`) {
      this.arrowConfig.markerEnd = `url(#marker-end-${id})`
    }
    this.id = id
  }
  @action setElementState(
    state: ElementState,
    additionStateData?: Model.AdditionStateDataType,
  ) {
    this.state = state
    this.additionStateData = additionStateData
  }
  // TODO: 确认是否需要，文档中没有提到。这个方法是否过于危险，设置后导致错误
  @action updateAttributes(attributes: LogicFlow.AttributesType) {
    assign(this, attributes)
  }
  @action setZIndex(zIndex: number = 0) {
    this.zIndex = zIndex
  }

  getProperties(): Model.PropertyType {
    return toJS(this.properties)
  }
  @action setProperty(key: string, value: unknown) {
    this.properties[key] = formatRawData(value)
    this.setAttributes()
  }
  @action deleteProperty(key: string) {
    delete this.properties[key]
    this.setAttributes()
  }
  @action setProperties(properties: Model.PropertyType) {
    this.properties = {
      ...toJS(this.properties),
      ...formatRawData(properties),
    }
    this.setAttributes()
  }

  // Style 相关方法
  /**
   * 自定义边样式
   * @overridable 支持重写
   * @returns 自定义边样式
   */
  getEdgeStyle(): LogicFlow.EdgeTheme {
    return {
      ...this.graphModel.theme.baseEdge,
      ...this.style,
    }
  }
  /**
   * 自定义边调整点样式
   * @overridable 支持重写
   * 在 isShowAdjustPoint 为 true 时会显示调整点
   */
  getAdjustPointStyle(): LogicFlow.CircleTheme {
    return {
      ...this.graphModel.theme.edgeAdjust,
    }
  }
  /**
   * 自定义边文本样式
   * @overridable 支持重写
   */
  getTextStyle(): LogicFlow.EdgeTextTheme {
    return {
      ...this.graphModel.theme.edgeText,
    }
  }
  /**
   * 自定义边动画样式
   * @overridable 支持重写
   * @example
   * getEdgeAnimationStyle() {
   *   const style = super.getEdgeAnimationStyle();
   *   style.stroke = 'blue';
   *   style.animationDuration = '30s';
   *   style.animationDirection = 'reverse';
   *   return style;
   * }
   */
  getEdgeAnimationStyle(): LogicFlow.EdgeAnimation {
    return {
      ...this.graphModel.theme.edgeAnimation,
    }
  }
  /**
   * 自定义边箭头样式
   * @overridable 支持重写
   * @example
   * getArrowStyle() {
   *   const style = super.getArrowStyle();
   *   style.stroke = 'green';
   *   return style;
   * }
   */
  getArrowStyle(): LogicFlow.ArrowTheme {
    const edgeStyle = this.getEdgeStyle()
    const edgeAnimationStyle = this.getEdgeAnimationStyle()
    const { arrow } = this.graphModel.theme
    const stroke = this.isAnimation
      ? edgeAnimationStyle.stroke
      : edgeStyle.stroke
    return {
      ...edgeStyle,
      fill: stroke,
      stroke,
      ...arrow,
    }
  }
  /**
   * 自定义边被选中时展示其范围的矩形框样式
   * @overridable 支持重写
   * @example - 隐藏 outline
   * getOutlineStyle() {
   *   const style = super.getOutlineStyle();
   *   style.stroke = 'none';
   *   style.hover.stroke = 'none';
   *   return style;
   * }
   */
  getOutlineStyle(): LogicFlow.OutlineTheme {
    return {
      ...this.graphModel.theme.outline,
    }
  }

  @action setStyle(key: string, value: LogicFlow.CommonThemePropTypes) {
    this.style = {
      ...this.style,
      [key]: formatRawData(value),
    }
  }
  @action setStyles(styles: LogicFlow.CommonTheme) {
    this.style = {
      ...this.style,
      ...formatRawData(styles),
    }
  }
  @action updateStyles(styles: LogicFlow.CommonTheme) {
    this.style = {
      ...formatRawData(styles),
    }
  }
}

export default BaseEdgeModel

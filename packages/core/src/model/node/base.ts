import { action, isObservable, observable, toJS } from 'mobx'
import { assign, cloneDeep, find, isArray, isNil, map } from 'lodash'
import { GraphModel, Model } from '..'
import { LogicFlow } from '../..'
import {
  createUuid,
  formatRawData,
  getClosestAnchor,
  getZIndex,
  pickNodeConfig,
} from '../../util'
import { Matrix, TranslateMatrix } from '../../common'
import {
  ElementState,
  ElementType,
  OverlapMode,
  ModelType,
} from '../../constant'

export interface IBaseNodeModel extends Model.BaseModel {
  /**
   * model 基础类型，固定为 node
   */
  readonly baseType: ElementType

  isDragging: boolean
  isShowAnchor: boolean
  getNodeStyle: () => LogicFlow.CommonTheme
  getTextStyle: () => LogicFlow.TextNodeTheme

  setIsShowAnchor: (isShowAnchor: boolean) => void
}

export class BaseNodeModel implements IBaseNodeModel {
  readonly baseType = ElementType.NODE
  static baseType: ElementType = ElementType.NODE

  // 数据属性
  public id = ''
  @observable readonly type = ''
  @observable x = 0
  @observable y = 0
  @observable text = {
    value: '',
    x: 0,
    y: 0,
    draggable: false,
    editable: true,
  }
  @observable properties: Record<string, unknown> = {}

  // 形状属性
  @observable _width = 100
  public get width() {
    return this._width
  }
  public set width(value) {
    this._width = value
  }

  @observable _height = 80
  public get height() {
    return this._height
  }
  public set height(value) {
    this._height = value
  }

  // 根据与(x, y)的偏移量计算 anchors 的坐标
  @observable anchorsOffset: BaseNodeModel.AnchorsOffsetItem[] = []

  // 状态属性
  readonly virtual = false
  @observable isSelected = false
  @observable isHovered = false
  @observable isShowAnchor = false
  @observable isDragging = false
  @observable isHittable = true
  @observable draggable = true
  @observable visible = true

  // 其它属性
  graphModel: GraphModel
  @observable zIndex = 1
  @observable state = ElementState.DEFAULT
  @observable autoToFront = true // 选中节点时是否自动置顶，默认为 true
  @observable style: LogicFlow.CommonTheme = {} // 每个节点自己的样式，动态修改
  @observable enableRotate = true
  @observable transform!: string // 节点的transform属性
  @observable private _rotate = 0
  set rotate(value: number) {
    this._rotate = value
    const { x = 0, y = 0 } = this
    this.transform = new TranslateMatrix(-x, -y)
      .rotate(value)
      .translate(x, y)
      .toString()
  }
  get rotate() {
    return this._rotate
  }

  modelType = ModelType.NODE
  additionStateData?: Model.AdditionStateDataType = {}

  // 节点连入、连出、移动等自定义规则
  targetRules: Model.ConnectRule[] = []
  sourceRules: Model.ConnectRule[] = []
  moveRules: Model.NodeMoveRule[] = []
  // 用来限制 Rules 的重复值
  hasSetTargetRules: boolean = false
  hasSetSourceRules: boolean = false;

  [propName: string]: unknown

  constructor(data: LogicFlow.NodeConfig, graphModel: GraphModel) {
    this.graphModel = graphModel
    this.initNodeData(data)
    this.setAttributes()
  }

  // Methods
  /**
   * @overridable 用户可自定义 - 初始化节点数据
   * @param data NodeConfig
   * initNodeData 和 setAttributes 的区别在于：
   * initNodeData 只在节点初始化的时候调用，用于初始化节点的所有属性
   * setAttributes 除了初始化调用外，还会在设置 properties 时主动调用
   */
  public initNodeData(data: LogicFlow.NodeConfig) {
    const { idGenerator, overlapMode } = this.graphModel
    if (!data.properties) {
      data.properties = {}
    }

    if (!data.id) {
      // 优先级：自定义节点 ID > 全局定义 ID > 内置
      const globalId = idGenerator?.(data.type)
      const nodeId = this.createId()
      data.id = nodeId || globalId || createUuid()
    }

    this.formatText(data)
    // 给当前 model this 赋值
    assign(this, pickNodeConfig(data))

    if (overlapMode === OverlapMode.INCREASE) {
      this.zIndex = data.zIndex || getZIndex()
    }
  }

  getData(): LogicFlow.NodeData {
    const { x, y, value } = this.text
    let { properties } = this
    if (isObservable(properties)) {
      properties = toJS(properties)
    }
    const data: LogicFlow.NodeData = {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      properties,
    }
    if (this.rotate) {
      data.rotate = this.rotate
    }
    if (this.graphModel.overlapMode === OverlapMode.INCREASE) {
      data.zIndex = this.zIndex
    }
    if (value) {
      data.text = { x, y, value }
    }
    return data
  }

  getHistoryData(): LogicFlow.NodeData {
    return this.getData()
  }
  /**
   * @overridable 用户可自定义 - 设置 model 的属性
   * 例如设置节点的宽度、高度
   * @example
   * setAttributes() {
   *   this.width = 300;
   *   this.height = 200;
   * }
   */
  public setAttributes() {}

  /**
   * @overridable 用户可自定义 - 自定义此类型节点 ID 默认生成方式
   * @returns string | null
   */
  public createId(): string | null {
    return null
  }

  /**
   * 初始化文本
   * @param data NodeConfig
   */
  private formatText(data: LogicFlow.NodeConfig): void {
    const defaultText = {
      value: '',
      x: data.x,
      y: data.y,
      draggable: false,
      editable: true,
    }
    if (!data.text) {
      data.text = { ...defaultText }
    } else {
      if (typeof data.text === 'string') {
        data.text = {
          ...defaultText,
          value: data.text,
        }
      } else if (data.text.editable === undefined) {
        data.text.editable = true
      }
    }
  }

  // Rule 相关
  isAllowMoveNode(deltaX: number, deltaY: number): boolean | Model.IsAllowMove {
    let isAllowMoveX = true
    let isAllowMoveY = true
    // TODO:
    const rules = this.moveRules.concat(this.graphModel.nodeMoveRules)
    for (const rule of rules) {
      // TODO: 确认下面这种写法是否有什么风险
      const r = rule(this, deltaX, deltaY)
      if (!r) return false
      if (typeof r === 'object') {
        const tempR = r as Model.IsAllowMove
        if (!tempR.x && !tempR.y) {
          return false
        }
        isAllowMoveX = isAllowMoveX && tempR.x
        isAllowMoveY = isAllowMoveY && tempR.y
      }
    }

    return {
      x: isAllowMoveX,
      y: isAllowMoveY,
    }
  }

  // 获取当前节点作为连接的起始点规则。
  getConnectedSourceRules(): LogicFlow.ConnectRule[] {
    return this.sourceRules
  }

  /**
   * @overridable 在连接边时，是否允许这个节点为 source 节点，边到 target 节点
   * @param target 目标节点
   * @param sourceAnchor 源锚点
   * @param targetAnchor 目标锚点
   * @param edgeId 调整后边的 id，在开启 adjustEdgeStartAndEnd 后调整边连接的节点时会传入
   * 详见：https://github.com/didi/LogicFlow/issues/926#issuecomment-1371823306
   */
  isAllowConnectedAsSource(
    target: BaseNodeModel,
    sourceAnchor: Model.AnchorConfig,
    targetAnchor: Model.AnchorConfig,
    edgeId?: string,
  ): LogicFlow.ConnectRuleResult {
    const rules = !this.hasSetSourceRules
      ? this.getConnectedSourceRules()
      : this.sourceRules
    this.hasSetSourceRules = true

    let isAllPass: boolean = true
    let msg: string = ''

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]
      if (
        !rule.validate.call(
          this,
          this,
          target,
          sourceAnchor,
          targetAnchor,
          edgeId,
        )
      ) {
        isAllPass = false
        msg = rule.message
        break
      }
    }
    return { isAllPass, msg }
  }

  // 获取作为连线终点时的所有规则
  getConnectedTargetRules(): LogicFlow.ConnectRule[] {
    return this.targetRules
  }

  /**
   * @overridable 在连线时，判断是否允许这个节点为 target 节点
   * @param source 源节点
   * @param sourceAnchor 源锚点
   * @param targetAnchor 目标锚点
   * @param edgeId 调整后边的 id，在开启 adjustEdgeStartAndEnd 后调整边连接的节点时会传入
   * 详见：https://github.com/didi/LogicFlow/issues/926#issuecomment-1371823306
   */
  isAllowConnectedAsTarget(
    source: BaseNodeModel,
    sourceAnchor: Model.AnchorConfig,
    targetAnchor: Model.AnchorConfig,
    edgeId?: string,
  ): LogicFlow.ConnectRuleResult {
    const rules = !this.hasSetTargetRules
      ? this.getConnectedTargetRules()
      : this.targetRules
    this.hasSetTargetRules = true

    let isAllPass: boolean = true
    let msg: string = ''
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]
      if (
        !rule.validate.call(
          this,
          source,
          this,
          sourceAnchor,
          targetAnchor,
          edgeId,
        )
      ) {
        isAllPass = false
        msg = rule.message
        break
      }
    }
    return { isAllPass, msg }
  }

  // Actions
  // TODO: 测试该方法是否 OK，this.text 是否可结构赋值
  @action
  moveText(deltaX: number, deltaY: number): void {
    const { x, y } = this.text

    this.text = {
      ...toJS(this.text),
      x: x + deltaX,
      y: y + deltaY,
    }
  }

  @action
  moveTo(x: number, y: number, isIgnoreRule: boolean = false): boolean {
    const deltaX = x - this.x
    const deltaY = y - this.y
    if (!isIgnoreRule && !this.isAllowMoveNode(deltaX, deltaY)) {
      return false
    }

    if (this.text) {
      this.text && this.moveText(deltaX, deltaY)
    }

    this.x = x
    this.y = y
    return true
  }

  private getRuleJudge(
    deltaX: number,
    deltaY: number,
    isIgnoreRule: boolean,
  ): {
    isAllowMoveX: boolean
    isAllowMoveY: boolean
  } {
    let isAllowMoveX
    let isAllowMoveY
    if (isIgnoreRule) {
      isAllowMoveX = true
      isAllowMoveY = true
    } else {
      const tempR = this.isAllowMoveNode(deltaX, deltaY)
      if (typeof tempR === 'boolean') {
        isAllowMoveX = tempR
        isAllowMoveY = tempR
      } else {
        isAllowMoveX = tempR.x
        isAllowMoveY = tempR.y
      }
    }

    return { isAllowMoveX, isAllowMoveY }
  }

  @action
  getMoveDistance(
    deltaX: number,
    deltaY: number,
    isIgnoreRule: boolean = false,
  ): Model.VectorType {
    let moveX = 0
    let moveY = 0
    const { isAllowMoveX, isAllowMoveY } = this.getRuleJudge(
      deltaX,
      deltaY,
      isIgnoreRule,
    )

    if (isAllowMoveX && deltaX) {
      this.x = this.x + deltaX
      this.text && this.moveText(deltaX, 0)
      moveX = deltaX
    }
    if (isAllowMoveY && deltaY) {
      this.y = this.y + deltaY
      this.text && this.moveText(0, deltaY)
      moveY = deltaY
    }
    return [moveX, moveY]
  }

  @action
  move(deltaX: number, deltaY: number, isIgnoreRule: boolean = false): boolean {
    const { isAllowMoveX, isAllowMoveY } = this.getRuleJudge(
      deltaX,
      deltaY,
      isIgnoreRule,
    )

    if (isAllowMoveX) {
      this.x = this.x + deltaX
      this.text && this.moveText(deltaX, 0)
    }
    if (isAllowMoveY) {
      this.y = this.y + deltaY
      this.text && this.moveText(0, deltaY)
    }
    return isAllowMoveX || isAllowMoveY
  }

  @action
  updateText(value: string): void {
    this.text = {
      ...toJS(this.text),
      value,
    }
  }

  // Node 状态更新相关 Actions
  @action
  setSelected(isSelected: boolean = true): void {
    this.isSelected = isSelected
  }

  @action
  setHovered(isHovered: boolean = true): void {
    this.isHovered = isHovered
    this.setIsShowAnchor(isHovered)
  }

  @action
  setHittable(isHittable: boolean): void {
    this.isHittable = isHittable
  }

  @action
  setIsShowAnchor(isShowAnchor: boolean = true): void {
    this.isShowAnchor = isShowAnchor
  }

  // Node 基础属性更新相关 Actions
  @action
  setZIndex(zIndex: number = 1): void {
    this.zIndex = zIndex
  }

  @action
  updateAttributes(attributes: LogicFlow.AttributesType): void {
    // ??? 这个在什么场景下使用
    assign(this, attributes)
  }

  @action
  setElementState(
    state: ElementState,
    additionStateData?: Model.AdditionStateDataType | undefined,
  ): void {
    this.state = state
    this.additionStateData = additionStateData
  }

  // Property 更新相关 Actions
  getProperties(): Record<string, unknown> {
    return toJS(this.properties)
  }
  @action
  setProperty(key: string, value: unknown): void {
    this.properties = {
      ...toJS(this.properties),
      [key]: formatRawData(value),
    }
    this.setAttributes()
  }

  @action
  setProperties(properties: Record<string, unknown>): void {
    this.properties = {
      ...toJS(this.properties),
      ...formatRawData(properties),
    }
    this.setAttributes()
  }

  @action
  deleteProperty(key: string): void {
    delete this.properties[key]
    this.setAttributes()
  }

  // Style 更新相关 Methods or Actions
  getNodeStyle(): LogicFlow.CommonTheme {
    return {
      ...this.graphModel.theme.baseNode,
      ...toJS(this.style),
    }
  }

  getTextStyle(): LogicFlow.TextNodeTheme {
    const { nodeText } = this.graphModel.theme
    return cloneDeep(nodeText)
  }

  /**
   * @overridable 支持重写
   * 获取当前节点旋转控制点的样式
   */
  getRotateControlStyle(): LogicFlow.CommonTheme {
    const { allowRotation } = this.graphModel.theme
    return cloneDeep(allowRotation)
  }

  // Anchor 相关功能点
  /**
   * @return Point[] 锚点坐标构成的数组
   */
  getAnchorsByOffset(): LogicFlow.Point[] {
    const { anchorsOffset, id, x, y } = this
    if (anchorsOffset && anchorsOffset.length > 0) {
      return map(anchorsOffset, (el, idx) => {
        if (isArray(el) && el.length) {
          const point = el as BaseNodeModel.PointTuple
          return {
            id: `${id}_${idx}`,
            x: x + point[0],
            y: y + point[1],
          }
        } else {
          const point = el as LogicFlow.Point
          return {
            ...point,
            x: x + point.x,
            y: y + point.y,
            id: point.id || `${id}_${idx}`,
          }
        }
      })
    }
    return this.getDefaultAnchor()
  }

  getDefaultAnchor(): LogicFlow.Point[] {
    return []
  }

  getTargetAnchor(
    position: LogicFlow.Point,
  ): BaseNodeModel.AnchorInfo | undefined {
    return getClosestAnchor(position, this)
  }

  get anchors(): LogicFlow.Point[] {
    const anchors = this.getAnchorsByOffset()
    const { x, y, rotate } = this
    anchors.forEach((anchor) => {
      const { x: anchorX, y: anchorY } = anchor
      const [e, f] = new Matrix([anchorX, anchorY, 1])
        .translate(-x, -y)
        .rotate(rotate)
        .translate(x, y)[0]
      anchor.x = e
      anchor.y = f
    })
    return anchors
  }

  getAnchorInfo(anchorId?: string) {
    if (isNil(anchorId)) return
    return find(this.anchors, (anchor) => anchor.id === anchorId)
  }

  getAnchorStyle(_anchorInfo?: LogicFlow.Point): LogicFlow.AnchorTheme {
    console.log('getAnchorStyle param -> _anchorInfo', _anchorInfo)
    const { anchor } = this.graphModel.theme
    return cloneDeep(anchor)
  }

  /**
   * 设置 Anchor Line Style
   * @param _anchorInfo
   */
  getAnchorLineStyle(_anchorInfo?: LogicFlow.Point): LogicFlow.AnchorLineTheme {
    console.log('getAnchorLineStyle param -> _anchorInfo', _anchorInfo)
    const { anchorLine } = this.graphModel.theme
    return cloneDeep(anchorLine)
  }

  getOutlineStyle(): LogicFlow.OutlineTheme {
    const { outline } = this.graphModel.theme
    return cloneDeep(outline)
  }

  @action
  setStyle(key: string, value: unknown): void {
    this.style = {
      ...toJS(this.style),
      [key]: formatRawData(value),
    }
  }

  @action
  setStyles(styles: LogicFlow.CommonTheme): void {
    this.style = {
      ...toJS(this.style),
      ...formatRawData(styles),
    }
  }

  @action
  updateStyles(styles: LogicFlow.CommonTheme): void {
    this.style = formatRawData(styles)
  }

  @action
  setEnableRotate(flag = true): void {
    this.enableRotate = flag
  }
}

export namespace BaseNodeModel {
  export type PointTuple = [number, number]
  export type AnchorsOffsetItem = PointTuple | LogicFlow.Point

  export interface AnchorInfo {
    index: number
    anchor: LogicFlow.Point
  }

  export interface NodeBBox {
    x: number
    y: number
    width: number
    height: number
    minX: number
    minY: number
    maxX: number
    maxY: number
    centerX: number
    centerY: number
  }
}

export default BaseNodeModel

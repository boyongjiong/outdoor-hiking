import { map } from 'lodash'
import { Component, h } from 'preact'
import { Anchor, BaseText } from '..'
import { LogicFlow } from '../../LogicFlow'
import { ElementState, EventType, OverlapMode } from '../../constant'
import { BaseNodeModel, GraphModel, Model } from '../../model'
import {
  createRaf,
  isIe,
  isMultipleSelect,
  RafInstance,
  snapToGrid,
} from '../../util'
import { IDragParams, StepperDrag, TranslateMatrix } from '../../common'
import RotateControlPoint from '../Rotate'

export type IBaseNodeProps = {
  model: BaseNodeModel
  graphModel: GraphModel
}
export type IBaseNodeState = {
  isDragging?: boolean
}

export abstract class BaseNode<P extends IBaseNodeProps> extends Component<
  P,
  IBaseNodeState
> {
  moveOffset?: LogicFlow.OffsetData
  // requestAnimationFrame 方法实例
  rafIns?: RafInstance
  // 拖拽辅助函数
  stepperDrag: StepperDrag
  startTime?: number

  protected constructor(props: IBaseNodeProps) {
    super()
    const {
      graphModel: { gridSize, eventCenter },
      model,
    } = props

    this.stepperDrag = new StepperDrag({
      model,
      eventCenter,
      step: gridSize,
      eventType: 'NODE',
      isStopPropagation: false,
      onDragStart: this.onDragStart,
      onDragging: this.onDragging,
      onDragEnd: this.onDragEnd,
    })
  }
  abstract getShape(): h.JSX.Element
  getAnchorShape(_anchorData?: Model.AnchorConfig): h.JSX.Element | null {
    console.log(_anchorData)
    return null
  }
  getAnchors() {
    const { model, graphModel } = this.props
    const { isSelected, isHittable, isDragging, isShowAnchor } = model
    // 特定状态下显示锚点 Anchors
    if (isHittable && (isSelected || isShowAnchor) && !isDragging) {
      return map(model.anchors, (anchor, index) => {
        const edgeStyle = model.getAnchorLineStyle(anchor)
        const style = model.getAnchorStyle(anchor)
        return (
          <Anchor
            anchorData={anchor}
            node={this}
            style={style}
            edgeStyle={edgeStyle}
            anchorIndex={index}
            nodeModel={model}
            graphModel={graphModel}
            // TODO：确认该功能干什么的，使用场景？？？
            setHoverOff={this.setHoverOff}
          />
        )
      })
    }
    return []
  }
  getRotateControl() {
    const { model, graphModel } = this.props
    const { isSelected, isHittable, enableRotate, isHovered } = model
    const style = model.getRotateControlStyle()
    if (isHittable && (isSelected || isHovered) && enableRotate) {
      return (
        <RotateControlPoint
          graphModel={graphModel}
          nodeModel={model}
          eventCenter={graphModel.eventCenter}
          style={style}
        />
      )
    }
  }
  getText() {
    const { model, graphModel } = this.props
    // 文本编辑状态下，显示编辑框，不显示文本。
    if (model.state === ElementState.TEXT_EDIT) {
      return null
    }
    if (model.text) {
      const { editConfigModel } = graphModel
      let draggable = false
      if (model.text.draggable || editConfigModel.nodeTextDraggable) {
        draggable = true
      }
      const editable = editConfigModel.nodeTextEdit && model.text.editable

      return (
        <BaseText
          model={model}
          graphModel={graphModel}
          draggable={draggable}
          editable={editable}
        />
      )
    }
  }
  getStateClassName() {
    const {
      model: { state, isDragging, isSelected },
    } = this.props
    let className = 'lf-node'
    switch (state) {
      case ElementState.ALLOW_CONNECT:
        className += ' lf-node-allow'
        break
      case ElementState.NOT_ALLOW_CONNECT:
        className += ' lf-node-not-allow'
        break
      default:
        className += ' lf-node-default'
        break
    }
    if (isDragging) {
      className += ' lf-dragging'
    }
    if (isSelected) {
      className += ' lf-node-selected'
    }

    return className
  }

  onDragStart = ({ event }: Partial<IDragParams>) => {
    const { model, graphModel } = this.props
    if (event) {
      const {
        canvasOverlayPosition: { x, y },
      } = graphModel.getPointByClient({
        x: event.clientX,
        y: event.clientY,
      })
      this.moveOffset = {
        dx: model.x - x,
        dy: model.y - y,
      }
    }
  }
  onDragging = ({ event }: IDragParams) => {
    const { model, graphModel } = this.props
    const {
      editConfigModel: { stopMoveGraph, autoExpand },
      transformModel,
      selectNodes,
      width,
      height,
      gridSize,
    } = graphModel

    model.isDragging = true
    if (event) {
      let {
        canvasOverlayPosition: { x, y },
      } = graphModel.getPointByClient({
        x: event.clientX,
        y: event.clientY,
      })
      const [x1, y1] = transformModel.cp2Hp([x, y])

      // 1. 考虑画布被缩放
      // 2. 考虑鼠标位置不在节点中心
      x += this.moveOffset?.dx || 0
      y += this.moveOffset?.dy || 0

      // 将 x, y 移动到 grid 上
      x = snapToGrid(x, gridSize)
      y = snapToGrid(y, gridSize)
      if (!width || !height) {
        graphModel.moveNode2Coordinate(model.id, x, y)
        return
      }

      // 鼠标超出画布后的拖动，不处理，而是让上一次 setInterval 持续滚动画布
      const isOffCanvas = x1 < 0 || y1 < 0 || x1 > width || y1 > height
      if (autoExpand && !stopMoveGraph && isOffCanvas) {
        return
      }
      if (this.rafIns) this.rafIns.stop()

      // 取节点左上角(LeftTop -> lt)和右下角(rightBottom -> rb)，计算节点移动是否超出范围
      const [ltX, ltY] = transformModel.cp2Hp([
        x - model.width / 2,
        y - model.height / 2,
      ])
      const [rbX, rbY] = transformModel.cp2Hp([
        x + model.width / 2,
        y + model.height / 2,
      ])
      const size = Math.max(gridSize, 20)
      let nearBoundary: number[] = []
      if (ltX < 0) {
        nearBoundary = [size, 0]
      } else if (rbX > width) {
        nearBoundary = [-size, 0]
      } else if (ltY < 0) {
        nearBoundary = [0, size]
      } else if (rbY > height) {
        nearBoundary = [0, -size]
      }
      model.transform = new TranslateMatrix(-x, -y)
        .rotate(model.rotate)
        .translate(x, y)
        .toString()
      let moveNodes = map(selectNodes, (node) => node.id)
      // 未选中的节点也可以拖动
      if (moveNodes.indexOf(model.id) === -1) {
        moveNodes = [model.id]
      }
      if (nearBoundary.length > 0 && !stopMoveGraph && autoExpand) {
        this.rafIns = createRaf(() => {
          const [translateX, translateY] = nearBoundary
          transformModel.translate(translateX, translateY)
          const deltaX = -translateX / transformModel.SCALE_X
          // TODO: 确认 deltaY 的计算是除以 SCALE_X 还是 SCALE_Y ???
          const deltaY = -translateY / transformModel.SCALE_X
          graphModel.moveNodes(moveNodes, deltaX, deltaY)
        })
        this.rafIns.start()
      } else {
        graphModel.moveNodes(moveNodes, x - model.x, y - model.y)
      }
    }
  }
  onDragEnd = () => {
    if (this.rafIns) {
      this.rafIns.stop()
    }
    const { model } = this.props
    model.isDragging = false
  }

  onMouseOut = (e: MouseEvent) => {
    if (isIe) this.setHoverOff(e)
  }

  handleClick = (e: MouseEvent) => {
    // 节点拖拽进画布之后，不触发 click 相关的 emit
    // 节点拖拽进画布没有触发 mousedown 事件，没有 startTime，用这个值做区分
    if (!this.startTime) return
    const timeInterval = new Date().getTime() - this.startTime
    if (timeInterval > 200) return // 事件间隔大于 200ms，认为是拖拽，不触发 click 事件

    const { model, graphModel } = this.props
    const nodeData = model.getData()
    const position = graphModel.getPointByClient({
      x: e.clientX,
      y: e.clientY,
    })
    const eventOptions: LogicFlow.EventArgsType = {
      data: nodeData,
      e,
      position,
      isSelected: false,
      isMultiple: false,
    }
    const isRightClick = e.button === 2
    // 判断是否右键点击，如果有右键点击则取消点击事件触发
    if (isRightClick) return

    // REMIND：这里 IE11 无法正确执行
    const isDoubleClick = e.detail === 2
    const { editConfigModel } = graphModel
    // 在 multipleSelect tool 禁用的情况下，允许取消选中的节点
    const isMultipleMode = isMultipleSelect(e, editConfigModel)
    eventOptions.isMultiple = isMultipleMode

    if (model.isSelected && !isDoubleClick && isMultipleMode) {
      eventOptions.isSelected = false
      model.setSelected(false)
    } else {
      graphModel.selectNodeById(model.id, isMultipleMode)
      eventOptions.isSelected = true
      this.toFront()
    }

    // 不是双击的，默认都是单击
    if (isDoubleClick) {
      if (editConfigModel.nodeTextEdit && model.text.editable) {
        model.setSelected(false)
        graphModel.setElementStateById(model.id, ElementState.TEXT_EDIT)
      }
      graphModel.eventCenter.emit(EventType.NODE_DBCLICK, eventOptions)
    } else {
      graphModel.eventCenter.emit(EventType.ELEMENT_CLICK, eventOptions)
      graphModel.eventCenter.emit(EventType.NODE_CLICK, eventOptions)
    }
  }
  handleMouseDown = (e: MouseEvent) => {
    const {
      model: { draggable },
      graphModel: {
        editConfigModel: { adjustNodePosition },
      },
    } = this.props
    this.startTime = new Date().getTime()
    if (adjustNodePosition && draggable) {
      this.stepperDrag.handleMouseDown(e)
    }
  }
  handleContextMenu = (e: MouseEvent) => {
    // TODO: e.preventDefault()
    e.stopPropagation()
    const { model, graphModel } = this.props
    const nodeData = model.getData()
    const position = graphModel.getPointByClient({
      x: e.clientX,
      y: e.clientY,
    })
    graphModel.setElementStateById(
      model.id,
      ElementState.SHOW_MENU,
      position.domOverlayPosition,
    )

    if (!model.isSelected) {
      graphModel.selectEdgeById(model.id)
    }
    graphModel.eventCenter.emit(EventType.NODE_CONTEXTMENU, {
      data: nodeData,
      e,
      position,
    })
    this.toFront()
  }

  /**
   * REMIND：为什么将 hover 状态放到 model 中？
   * 因为自定义节点时，可能会基于 hover 状态自定义不同的样式
   */
  setHoverOn = (event: MouseEvent) => {
    const { model, graphModel } = this.props
    const nodeData = model.getData()
    // TODO: 确认下面 model.setHovered 方法提示为 undefined 的 bug
    // !important
    model.setHovered(true)
    graphModel.eventCenter.emit(EventType.NODE_MOUSEENTER, {
      data: nodeData,
      e: event,
    })
  }
  setHoverOff = (event: MouseEvent) => {
    const { model, graphModel } = this.props
    const nodeData = model.getData()
    if (!model.isHovered) return
    model.setHovered(false)
    graphModel.eventCenter.emit(EventType.NODE_MOUSELEAVE, {
      data: nodeData,
      e: event,
    })
  }

  // 节点置顶，可以被某些不需要置顶的节点重写，比如 group 节点
  toFront() {
    const { model, graphModel } = this.props
    const { overlapMode } = graphModel
    if (overlapMode !== OverlapMode.INCREASE && model.autoToFront) {
      graphModel.toFront(model.id)
    }
  }

  render(): h.JSX.Element {
    const {
      model: { isHittable, draggable, transform },
      graphModel: {
        gridSize,
        transformModel: { SCALE_X },
        editConfigModel: { hideAnchors, adjustNodePosition, allowRotation },
      },
    } = this.props
    const nodeShapeInner = (
      <g className="lf-node-content">
        <g transform={transform}>
          {this.getShape()}
          {this.getText()}
          {allowRotation && this.getRotateControl()}
        </g>
        {!hideAnchors && this.getAnchors()}
      </g>
    )

    if (!isHittable) {
      return <g className={this.getStateClassName()}>{nodeShapeInner}</g>
    } else {
      if (adjustNodePosition && draggable) {
        this.stepperDrag.setStep(gridSize * SCALE_X)
      }
      return (
        <g
          className={this.getStateClassName()}
          onMouseDown={this.handleMouseDown}
          onClick={this.handleClick}
          onMouseEnter={this.setHoverOn}
          onMouseOver={this.setHoverOn}
          onMouseLeave={this.setHoverOff}
          onMouseOut={this.onMouseOut}
          onContextMenu={this.handleContextMenu}
        >
          {nodeShapeInner}
        </g>
      )
    }
  }
}

export default BaseNode

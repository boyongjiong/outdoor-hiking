import classNames from 'classnames'
import { Component, createRef, createElement as h } from 'preact/compat'
import { AdjustPoint, AdjustType, Circle, LineText } from '..'
import {
  degrees,
  getThetaOfVector,
  isMultipleSelect,
  pointsList2Polyline,
  pointsStr2PointsList,
} from '../../util'
import { BaseEdgeModel, GraphModel } from '../../model'
import { closestPointOnPolyline } from '../../algorithm'
import { ElementState, EventType, OverlapMode, ModelType } from '../../constant'

export type IBaseEdgeProps = {
  model: BaseEdgeModel
  graphModel: GraphModel
}

export type IBaseEdgeState = {
  hover: boolean
}

export class BaseEdge<P extends IBaseEdgeProps> extends Component<
  P,
  IBaseEdgeState
> {
  startTime?: number
  contextMenuTime?: number
  clickTimer?: number
  textRef = createRef()

  // 不支持重写，请使用 getEdge 方法
  readonly getShape = () => {
    return <g>{this.getEdge()}</g>
  }

  /**
   * @overridable 支持重写，此方法为获取边的形状，如果需要自定义的形状，请重写此方法。
   * @example https://docs.logic-flow.cn/docs/#/zh/guide/basic/edge?id=基于-react-组件自定义边
   */
  getEdge(): h.JSX.Element | null {
    return null
  }

  getAppendWidth() {
    return <g />
  }
  // 此方法为扩大边选取，方便用户点击选中边。
  // 如果需要自定义边选区，请使用 getAppendWidth 方法。
  readonly getAppend = () => {
    return <g className="lf-edge-append">{this.getAppendWidth()}</g>
  }

  getText(): h.JSX.Element | null {
    const { model, graphModel } = this.props
    // 文本被编辑的时候，显示编辑框，不显示文本。
    if (model.state === ElementState.TEXT_EDIT) {
      return null
    }
    const { editConfigModel } = graphModel
    // TODO: 确认下这里的规则，什么情况下用 &&，什么情况下用 ||
    const draggable = model.text.draggable || editConfigModel.edgeTextDraggable
    const editable = editConfigModel.edgeTextEdit && model.text.editable
    return (
      <LineText
        ref={this.textRef}
        draggable={draggable}
        editable={editable}
        model={model}
        graphModel={graphModel}
      />
    )
  }

  getLastTwoPoints() {
    const {
      model: { startPoint, endPoint },
    } = this.props
    return [startPoint, endPoint]
  }

  /**
   * @overridable 可重写，自定义边起点箭头形状
   * @example
   * getStartArrow() {
   *   const { model } = this.props;
   *   const { stroke, strokeWidth, offset, verticalLength } = model.getArrowStyle();
   *   return h('path', { d: '' });
   * }
   */
  getStartArrow(): h.JSX.Element | null {
    return <path />
  }
  /**
   * @overridable 可重写，自定义边终点箭头形状
   * @example 参考 getStartArrow 方法
   */
  getEndArrow(): h.JSX.Element | null {
    const { model } = this.props
    const { stroke, strokeWidth, offset, verticalLength } =
      model.getArrowStyle()
    return (
      <path
        fill={stroke}
        stroke={stroke}
        strokeWidth={strokeWidth}
        transform="rotate(180)"
        d={`M 0 0 L ${offset} -${verticalLength} L ${offset} ${verticalLength} Z`}
      />
    )
  }

  /**
   * 定义边的箭头，不支持重写。
   * 如需自定义，请使用 getStartArrow 和 getEndArrow
   */
  readonly getArrow = (): h.JSX.Element | null => {
    const { model } = this.props
    const { id } = model
    const { refX = 2, refY = 0 } = model.getArrowStyle()
    const [start, end] = this.getLastTwoPoints()
    let theta: string | number = 'auto'
    if (start && end) {
      theta = degrees(
        getThetaOfVector({
          x: end.x - start.x,
          y: end.y - start.y,
          z: 0,
        }),
      )
    }
    return (
      <g>
        <defs>
          <marker
            id={`marker-start-${id}`}
            refX={-refX}
            refY={refY}
            overflow="visible"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            {this.getStartArrow()}
          </marker>
          <marker
            id={`marker-end-${id}`}
            refX={refX}
            refY={refY}
            overflow="visible"
            orient={theta}
            markerUnits="userSpaceOnUse"
          >
            {this.getEndArrow()}
          </marker>
        </defs>
      </g>
    )
  }

  /**
   * @overridable 支持重写
   * 此方法为便在被选中时将其置顶，如果不需要此功能，可以重写此方法
   */
  toFront() {
    const { model, graphModel } = this.props
    const { overlapMode } = graphModel
    if (overlapMode !== OverlapMode.INCREASE) {
      graphModel.toFront(model.id)
    }
  }

  // 事件方法
  readonly handleMouseDown = (e: MouseEvent) => {
    e.stopPropagation()
    this.startTime = new Date().getTime()
  }
  /**
   *
   * @param e MouseEvent
   */
  readonly handleMouseUp = (e: MouseEvent) => {
    if (!this.startTime) return

    const timeInterval = new Date().getTime() - this.startTime
    if (timeInterval > 200) return // 事件间隔大于 200ms，认为是拖拽，不触发 click 事件
    const isRightClick = e.button === 2
    if (isRightClick) return

    const { model, graphModel } = this.props
    const { editConfigModel, textEditElement, gridSize } = graphModel
    const edgeData = model.getData()
    const position = graphModel.getPointByClient({
      x: e.clientX,
      y: e.clientY,
    })
    // REMIND: 这里 IE11 无法正确执行
    const isDoubleClick = e.detail === 2
    if (isDoubleClick) {
      // 当前正在编辑，需要先重置状态才能变更文本框位置
      if (textEditElement?.id === model.id) {
        graphModel.setElementStateById(model.id, ElementState.DEFAULT)
      }
      // 边文案可编辑状态，才能进行文案编辑
      if (editConfigModel.edgeTextEdit && model.text.editable) {
        graphModel.setElementStateById(model.id, ElementState.TEXT_EDIT)
      }

      // 当边的类型为折线时
      if (model.modelType === ModelType.POLYLINE_EDGE) {
        // TODO: 确认下面逻辑是否 OK go go go
        const {
          canvasOverlayPosition: { x, y },
        } = position
        const points = model.points
        const pointsList = pointsStr2PointsList(points)
        const polyline = pointsList2Polyline(pointsList)

        model.dbClickPosition = closestPointOnPolyline(
          { x, y },
          polyline,
          gridSize,
        )
      }
      graphModel.eventCenter.emit(EventType.EDGE_DBCLICK, {
        data: edgeData,
        e,
        position,
      })
    } else {
      graphModel.eventCenter.emit(EventType.ELEMENT_CLICK, {
        data: edgeData,
        e,
        position,
      })
      graphModel.eventCenter.emit(EventType.EDGE_CLICK, {
        data: edgeData,
        e,
        position,
      })
    }

    graphModel.selectEdgeById(model.id, isMultipleSelect(e, editConfigModel))
    this.toFront()
  }
  /**
   * 不支持重写，如果想要基于 contextMenu 事件做处理，请监听 edge:contextmenu 事件
   */
  readonly handleContextMenu = (e: MouseEvent) => {
    e.stopPropagation()
    // 节点鼠标右键也会触发事件，区分右键点击和左键点击（mouseup）
    this.contextMenuTime = new Date().getTime()
    if (this.clickTimer) {
      clearTimeout(this.clickTimer)
    }

    const { model, graphModel } = this.props
    const position = graphModel.getPointByClient({
      x: e.clientX,
      y: e.clientY,
    })
    graphModel.setElementStateById(
      model.id,
      ElementState.SHOW_MENU,
      position.domOverlayPosition,
    )
    this.toFront()

    if (!model.isSelected) {
      graphModel.selectEdgeById(model.id)
    }
    const edgeData = model.getData()
    graphModel.eventCenter.emit(EventType.EDGE_CONTEXTMENU, {
      data: edgeData,
      e,
      position,
    })
  }

  handleUpdateHoverState(hovered: boolean, e: MouseEvent) {
    const { model, graphModel } = this.props
    model.setHovered(hovered)
    const eventType = hovered
      ? EventType.EDGE_MOUSEENTER
      : EventType.EDGE_MOUSELEAVE
    const nodeData = model.getData()
    graphModel.eventCenter.emit(eventType, {
      data: nodeData,
      e,
    })
  }
  readonly setHoverOn = (e: MouseEvent) => {
    // ! hover 多次触发，onMouseOver + onMouseEnter
    const {
      model: { isHovered },
    } = this.props
    if (isHovered) return

    this.textRef?.current?.setHoverOn()
    this.handleUpdateHoverState(true, e)
  }
  readonly setHoverOff = (e: MouseEvent) => {
    const {
      model: { isHovered },
    } = this.props
    if (!isHovered) return
    this.textRef?.current?.setHoverOff()
    this.handleUpdateHoverState(false, e)
  }

  // 工具方法
  getAdjustPointShape(
    x: number,
    y: number,
    model: BaseEdgeModel,
  ): h.JSX.Element | null {
    const style = model.getAdjustPointStyle()
    return <Circle className="lf-edge-adjust-point" {...style} {...{ x, y }} />
  }
  readonly getAdjustPoints = () => {
    const { model, graphModel } = this.props
    const start = model.getAdjustStart()
    const end = model.getAdjustEnd()

    return (
      <g>
        <AdjustPoint
          type={AdjustType.SOURCE}
          {...start}
          edgeModel={model}
          graphModel={graphModel}
          getAdjustPointShape={this.getAdjustPointShape}
        />
        <AdjustPoint
          type={AdjustType.TARGET}
          {...end}
          edgeModel={model}
          graphModel={graphModel}
          getAdjustPointShape={this.getAdjustPointShape}
        />
      </g>
    )
  }

  render(): h.JSX.Element {
    const {
      model: { isSelected, isHittable, isShowAdjustPoint },
    } = this.props

    return (
      <g>
        <g
          className={classNames('lf-edge', {
            'pointer-none': !isHittable,
            'lf-edge-selected': isSelected,
          })}
          onMouseDown={this.handleMouseDown}
          onMouseUp={this.handleMouseUp}
          onContextMenu={this.handleContextMenu}
          onMouseOver={this.setHoverOn}
          onMouseEnter={this.setHoverOn}
          onMouseLeave={this.setHoverOff}
        >
          {this.getShape()}
          {this.getAppend()}
          {this.getText()}
          {this.getArrow()}
        </g>
        {isShowAdjustPoint && isSelected ? this.getAdjustPoints() : ''}
      </g>
    )
  }
}

export default BaseEdge

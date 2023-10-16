import { createElement as h } from 'preact/compat'
import { map } from 'lodash'
import classNames from 'classnames'
import { BaseEdge, IBaseEdgeProps } from '.'
import {
  getAppendAttributes,
  pointsList2Polyline,
  pointsStr2PointsList,
} from '../../util'
import { Path, Polyline } from '../shape'
import { PolylineEdgeModel } from '../../model'
import { IDragParams, StepperDrag } from '../../common'
import { EventType } from '../../constant'
import { LogicFlow } from '../../LogicFlow'
import AppendConfig = LogicFlow.AppendConfig
import ArrowConfig = LogicFlow.ArrowConfig

export interface IPolylineEdgeProps extends IBaseEdgeProps {
  model: PolylineEdgeModel
}

export class PolylineEdge extends BaseEdge<IPolylineEdgeProps> {
  readonly stepperDrag: StepperDrag
  isDragging: boolean = false
  isShowAdjustPointTemp: boolean = false
  appendInfo?: AppendConfig
  constructor() {
    super()
    this.stepperDrag = new StepperDrag({
      isStopPropagation: false,
      onDragStart: this.onDragStart,
      onDragging: this.onDragging,
      onDragEnd: this.onDragEnd,
    })
  }

  private onDragStart = () => {
    const { model } = this.props
    model.dragAppendStart()
    this.isShowAdjustPointTemp = model.isShowAdjustPoint
    model.isShowAdjustPoint = false
  }
  private onDragging = ({ deltaX, deltaY }: IDragParams) => {
    const {
      model,
      graphModel: {
        transformModel,
        editConfigModel: { adjustEdgeMiddle },
      },
    } = this.props
    this.isDragging = true
    if (deltaX && deltaY) {
      const [curDeltaX, curDeltaY] = transformModel.fixDeltaXY(deltaX, deltaY)

      // 更新当前拖拽的线段信息
      // 1. 如果只允许调整中间线段调用 dragAppendSimple
      // 2. 如果允许调整所有线段调用 dragAppend
      if (this.appendInfo) {
        if (adjustEdgeMiddle) {
          this.appendInfo = model.dragAppendSimple(this.appendInfo, {
            dx: curDeltaX,
            dy: curDeltaY,
          })
        } else {
          this.appendInfo = model.dragAppend(this.appendInfo, {
            dx: curDeltaX,
            dy: curDeltaY,
          })
        }
      }
    }
  }
  private onDragEnd = () => {
    const {
      model,
      graphModel: { eventCenter },
    } = this.props
    model.dragAppendEnd()
    this.isDragging = false
    model.isShowAdjustPoint = this.isShowAdjustPointTemp
    // 清空当前拖拽的线段信息
    this.appendInfo = undefined
    // 向外抛出事件
    eventCenter.emit(EventType.EDGE_ADJUST, { data: model.getData() })
  }

  beforeDragStart = (e: MouseEvent, appendInfo: AppendConfig) => {
    // 如果允许拖拽调整，则触发事件处理
    if (appendInfo.draggable) {
      this.stepperDrag.handleMouseDown(e)
    }
    // 记录当前拖拽的线段信息
    this.appendInfo = appendInfo
  }

  getEdge(): h.JSX.Element | null {
    const { model } = this.props
    const { points, isAnimation, arrowConfig } = model
    const style = model.getEdgeStyle()
    const { stroke, strokeDasharray, ...restStyle } =
      model.getEdgeAnimationStyle()

    return (
      <Polyline
        points={points}
        {...style}
        {...arrowConfig}
        {...(isAnimation
          ? {
              stroke,
              strokeDasharray,
              style: restStyle,
            }
          : {})}
      />
    )
  }

  /**
   * @deprecated 功能待废弃
   */
  getArrowInfo = (): ArrowConfig => {
    const {
      model: { isSelected },
    } = this.props
    const { hover } = this.state
    const [startPoint, endPoint] = this.getLastTwoPoints()

    return {
      start: startPoint,
      end: endPoint,
      hover,
      isSelected,
    }
  }

  getLastTwoPoints(): LogicFlow.Point[] {
    const {
      model: { points },
    } = this.props
    const pointsList = pointsStr2PointsList(points)
    let startPoint: LogicFlow.Point = pointsList[0]
    let endPoint: LogicFlow.Point = pointsList[0]

    if (pointsList.length >= 2) {
      startPoint = pointsList[pointsList.length - 2]
      endPoint = pointsList[pointsList.length - 1]
    }

    return [startPoint, endPoint]
  }

  getLineSegmentAppend(lineSegment: LogicFlow.LineSegment): h.JSX.Element {
    const appendAttributes = getAppendAttributes(lineSegment)
    return <Path {...appendAttributes} />
  }

  getAppendWidth(): h.JSX.Element {
    const {
      model: { pointsList, draggable },
      graphModel: {
        editConfigModel: { adjustEdge, adjustEdgeMiddle },
      },
    } = this.props

    const lineSegments = pointsList2Polyline(pointsList)
    const lineSegmentsLength = lineSegments.length
    return (
      <g>
        {map(lineSegments, (lineSegment, i) => {
          const appendInfo: AppendConfig = {
            ...lineSegment,
            startIndex: i,
            endIndex: i + 1,
            direction: 'horizontal',
            draggable: true,
          }
          if (adjustEdge && draggable) {
            // 如果不允许调整起点和终点相连的线段，设置该线段 appendInfo 的 draggable 为 false
            const { start, end, startIndex, endIndex } = appendInfo
            appendInfo.draggable = !(
              adjustEdgeMiddle &&
              (startIndex === 0 || endIndex === lineSegmentsLength)
            )

            if (start.x === end.x) {
              appendInfo.direction = 'vertical'
            } else if (start.y === end.y) {
              appendInfo.direction = 'horizontal'
            }
            return (
              <g
                className={classNames({
                  'lf-dragging': this.isDragging,
                  'lf-draggable': !this.isDragging,
                })}
                onMouseDown={(e: MouseEvent) =>
                  this.beforeDragStart(e, appendInfo)
                }
              >
                <g
                  className={classNames('lf-polyline-append', {
                    'lf-polyline-append-ew-resize':
                      start.x === end.x && appendInfo.draggable,
                    'lf-polyline-append-ns-resize':
                      start.y === end.y && appendInfo.draggable,
                  })}
                >
                  {this.getLineSegmentAppend(lineSegment)}
                </g>
              </g>
            )
          }
          return (
            <g className="lf-polyline-append">
              {this.getLineSegmentAppend(lineSegment)}
            </g>
          )
        })}
      </g>
    )
  }
}

export default PolylineEdge

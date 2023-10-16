import { observer } from 'mobx-preact'
import { createElement as h, Component } from 'preact/compat'
import { Dnd } from '../behavior'
import { GraphModel } from '../../model'
import { EventType } from '../../constant'
import { IDragParams, StepperDrag } from '../../common'

export type ICanvasProps = {
  graphModel: GraphModel
  dnd: Dnd
}
export type ICanvasState = {
  isDragging: boolean
}

export const Canvas = observer(
  class CanvasOverlay extends Component<ICanvasProps, ICanvasState> {
    readonly stepperDrag: StepperDrag
    stepScrollX: number = 0
    stepScrollY: number = 0
    constructor(props: ICanvasProps) {
      super()
      const {
        graphModel: { gridSize, eventCenter },
      } = props
      this.stepperDrag = new StepperDrag({
        onDragging: this.onDragging,
        onDragEnd: this.onDragEnd,
        step: gridSize,
        eventType: 'BLANK',
        isStopPropagation: false,
        eventCenter,
      })

      this.state = {
        isDragging: false,
      }
    }

    onDragging = ({ deltaX, deltaY }: IDragParams) => {
      this.setState({
        isDragging: true,
      })
      const {
        graphModel: { transformModel, editConfigModel },
      } = this.props
      if (editConfigModel.stopMoveGraph === true) {
        return
      }
      if (deltaX && deltaY) {
        transformModel.translate(deltaX, deltaY)
      }
    }

    onDragEnd = () => {
      this.setState({
        isDragging: false,
      })
    }

    zoomHandler = (e: WheelEvent) => {
      const { graphModel } = this.props
      const {
        editConfigModel: { stopMoveGraph, stopZoomGraph },
        transformModel,
        gridSize,
      } = graphModel
      const { deltaX, deltaY } = e
      // REMIND: 如果没有禁止滚动移动画布，并且当前触发的时候没有按住 ctrl 键，那么移动画布
      if (!stopMoveGraph && !e.ctrlKey) {
        e.preventDefault()
        this.stepScrollX += deltaX
        this.stepScrollY += deltaY

        if (Math.abs(this.stepScrollX) >= gridSize) {
          const remainderX = this.stepScrollX % gridSize
          const moveDistance = this.stepScrollX - remainderX
          transformModel.translate(-moveDistance * transformModel.SCALE_X, 0)
          this.stepScrollX = remainderX
        }

        if (Math.abs(this.stepScrollY) >= gridSize) {
          const remainderY = this.stepScrollY % gridSize
          const moveDistanceY = this.stepScrollY - remainderY
          transformModel.translate(0, -moveDistanceY * transformModel.SCALE_Y)
          this.stepScrollY = remainderY
        }
        return
      }

      // REMIND：如果没有禁止缩放画布，那么进行缩放。在禁止缩放画布后，按住 ctrl 键也不能缩放
      if (!stopZoomGraph) {
        e.preventDefault()
        const position = graphModel.getPointByClient({
          x: e.clientX,
          y: e.clientY,
        })
        const { x, y } = position.canvasOverlayPosition
        transformModel.zoom(e.deltaY < 0, [x, y])
      }
    }

    clickHandler = (e: MouseEvent) => {
      // 点击空白处取消节点选中状态，不包括冒泡过来的事件
      const target = e.target as HTMLElement
      if (target.getAttribute('name') === 'canvas-overlay') {
        const { graphModel } = this.props
        const { selectElements } = graphModel
        if (selectElements.size > 0) {
          graphModel.clearSelectElements()
        }
        graphModel.eventCenter.emit(EventType.BLANK_CLICK, { e })
      }
    }

    contextMenuHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.getAttribute('name') === 'canvas-overlay') {
        e.preventDefault()
        const { graphModel } = this.props
        const position = graphModel.getPointByClient({
          x: e.clientX,
          y: e.clientY,
        })
        graphModel.eventCenter.emit(EventType.BLANK_CONTEXTMENU, {
          e,
          position,
        })
      }
    }

    mouseDownHandler = (e: MouseEvent) => {
      const { graphModel } = this.props
      const {
        transformModel: { SCALE_X },
        editConfigModel: { adjustEdge, adjustNodePosition, stopMoveGraph },
        eventCenter,
        gridSize,
      } = graphModel
      const target = e.target as HTMLElement
      const isFrozen = !adjustEdge && !adjustNodePosition
      if (target.getAttribute('name') === 'canvas-overlay' || isFrozen) {
        if (stopMoveGraph !== true) {
          this.stepperDrag.setStep(gridSize * SCALE_X)
          this.stepperDrag.handleMouseDown(e)
        } else {
          eventCenter.emit(EventType.BLANK_MOUSEDOWN, { e })
        }
        this.clickHandler(e)
      }
    }

    render(): h.JSX.Element {
      const {
        graphModel: { transformModel },
        children,
        dnd,
      } = this.props
      const { isDragging } = this.state
      const { transform } = transformModel.getTransformStyle()

      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
          name="canvas-overlay"
          onWheel={this.zoomHandler}
          onMouseDown={this.mouseDownHandler}
          onContextMenu={this.contextMenuHandler}
          className={
            isDragging
              ? 'lf-canvas-overlay lf-dragging'
              : 'lf-canvas-overlay lf-draggable'
          }
          {...dnd.eventMap()}
        >
          <g transform={transform}>{children}</g>
        </svg>
      )
    }
  },
)

export default Canvas

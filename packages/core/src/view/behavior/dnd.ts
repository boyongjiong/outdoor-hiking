import { get } from 'lodash'
import { LogicFlow } from '../../LogicFlow'
import { BaseNodeModel } from '../../model'
import FakeNodeConfig = LogicFlow.FakeNodeConfig
import Point = LogicFlow.Point
import { snapToGrid } from '../../util'
import { EventType } from '../../constant'

export type IDndProps = {
  lf: LogicFlow
}

export class Dnd {
  readonly lf: LogicFlow
  fakeNode?: BaseNodeModel
  nodeConfig?: FakeNodeConfig

  constructor(props: IDndProps) {
    const { lf } = props
    this.lf = lf
  }

  clientToLocalPoint({ x, y }: Point) {
    const { options, graphModel } = this.lf
    // TODO: 是否可以在此处直接去 this.lf.graphModel 中的 gridSize
    const gridSize = get(options, ['grid', 'size'])
    // 处理 container 的 offset 等
    const position = graphModel.getPointByClient({ x, y })
    // 处理缩放和偏移
    const { x: x1, y: y1 } = position.canvasOverlayPosition
    // x, y 对齐到网格的 size
    return {
      x: snapToGrid(x1, gridSize),
      y: snapToGrid(y1, gridSize),
    }
  }

  startDrag(nodeConfig: FakeNodeConfig) {
    if (!this.lf.options.isSilentMode) {
      this.nodeConfig = nodeConfig
      window.document.addEventListener('mouseup', this.stopDrag)
    }
  }
  stopDrag() {
    this.nodeConfig = undefined
    window?.document.removeEventListener('mouseup', this.stopDrag)
  }

  dragEnterHandler = (e: MouseEvent) => {
    if (!this.nodeConfig || this.fakeNode) return
    const { createFakeNode } = this.lf
    this.fakeNode = createFakeNode({
      ...this.nodeConfig,
      ...this.clientToLocalPoint({
        x: e.clientX,
        y: e.clientY,
      }),
    })
  }
  dragOverHandler = (e: MouseEvent) => {
    // TODO: 确认系统中 e.preventDefault 和 e.stopPropagation 的区别以及应该使用哪个
    // 目前保留的都使用 e.stopPropagation
    e.stopPropagation()
    if (this.fakeNode) {
      const { setNodeSnapline, graphModel } = this.lf
      const { x, y } = this.clientToLocalPoint({
        x: e.clientX,
        y: e.clientY,
      })
      this.fakeNode.moveTo(x, y)
      const nodeData = this.fakeNode.getData()

      // TODO: 对齐线工作
      setNodeSnapline(nodeData)
      graphModel.eventCenter.emit(EventType.NODE_DND_DRAG, { data: nodeData })
    }
  }

  dragLeaveHandler = () => {
    const { removeNodeSnapline, graphModel } = this.lf
    if (this.fakeNode) {
      removeNodeSnapline()
      graphModel.removeFakeNode()
      this.fakeNode = undefined
    }
  }

  dropHandler = (e: MouseEvent) => {
    if (!this.lf.graphModel || !e || !this.nodeConfig) return

    this.lf.addNode(
      {
        ...this.nodeConfig,
        ...this.clientToLocalPoint({
          x: e.clientX,
          y: e.clientY,
        }),
      },
      EventType.NODE_DND_ADD,
      e,
    )

    e.stopPropagation()
    this.nodeConfig = undefined
    this.lf.removeNodeSnapline()
    this.lf.graphModel.removeFakeNode()
    this.fakeNode = undefined
  }

  eventMap() {
    return {
      onMouseEnter: this.dragEnterHandler,
      onMouseOver: this.dragEnterHandler, // IE11
      onMouseMove: this.dragOverHandler,
      onMouseLeave: this.dragLeaveHandler,
      // onMouseOut: this.dragLeaveHandler, // IE11
      onMouseUp: this.dropHandler,
    }
  }
}

export default Dnd

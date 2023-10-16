import { Component } from 'preact'
import Circle from './shape/Circle'
import { GraphModel, BaseNodeModel, Model } from '../model'
import { Point, StepperDrag, Vector } from '../util'
import EventEmitter from '../event/eventEmitter'
import LogicFlow from 'src'
import { map, reduce } from 'lodash'

interface IProps {
  graphModel: GraphModel
  nodeModel: BaseNodeModel
  eventCenter: EventEmitter
  style: LogicFlow.CommonTheme
}

class RotateControlPoint extends Component<IProps> {
  private style = {}
  private defaultAngle!: number
  normal!: Vector
  stepperDrag: any

  constructor(props: IProps) {
    super(props)
    this.style = props.style
    this.stepperDrag = new StepperDrag({
      onDragging: this.onDragging,
    })
  }

  onDragging = ({ event }: any) => {
    const { graphModel, nodeModel } = this.props
    const { selectNodes } = graphModel
    const { x, y } = nodeModel
    const { clientX, clientY } = event
    const {
      canvasOverlayPosition: { x: cx, y: cy },
    } = graphModel.getPointByClient({
      x: clientX,
      y: clientY,
    })
    const v = new Vector(cx - x, cy - y)
    const angle = this.normal?.angle(v) - this.defaultAngle
    nodeModel.rotate = angle

    let nodeIds = map(selectNodes, (node) => node.id)
    if (nodeIds.indexOf(nodeModel.id) === -1) {
      nodeIds = [nodeModel.id]
    }
    const nodeIdMap = reduce(
      nodeIds,
      (acc: Record<string, Model.VectorType | undefined>, nodeId) => {
        const node = graphModel.getNodeModelById(nodeId)
        acc[nodeId] = node?.getMoveDistance(0, 0, false)
        return acc
      },
      {},
    )
    nodeIds.forEach((nodeId) => {
      const edges = graphModel.getNodeEdges(nodeId)
      edges.forEach((edge) => {
        if (nodeIdMap[edge.sourceNodeId as string]) {
          const model = graphModel.getNodeModelById(edge.sourceNodeId)
          const anchor = (model as BaseNodeModel).anchors.find(
            (anchor) => anchor.id === edge.sourceAnchorId,
          )
          edge.updateStartPoint(anchor as Point)
        }
        if (nodeIdMap[edge.targetNodeId as string]) {
          const model = graphModel.getNodeModelById(edge.targetNodeId)
          const anchor = (model as BaseNodeModel).anchors.find(
            (anchor) => anchor.id === edge.targetAnchorId,
          )
          edge.updateEndPoint(anchor as Point)
        }
      })
    })
  }
  render() {
    const { nodeModel } = this.props
    const { x, y, width, height } = nodeModel
    const cx = x + width / 2 + 20
    const cy = y - height / 2 - 20
    this.normal = new Vector(1, 0)
    this.defaultAngle = this.normal.angle(new Vector(cx - x, cy - y))
    nodeModel.defaultAngle = this.defaultAngle
    return (
      <g className="lf-rotate">
        <g
          onMouseDown={(ev) => {
            this.stepperDrag.handleMouseDown(ev)
          }}
        >
          <Circle {...this.style} cx={cx} cy={cy} />
        </g>
      </g>
    )
  }
}

export default RotateControlPoint

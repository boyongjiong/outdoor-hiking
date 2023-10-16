import { createElement as h, Component } from 'preact/compat'
import { observer } from 'mobx-preact'
import { forEach } from 'lodash'
import { GraphModel, LineEdgeModel, PolylineEdgeModel } from '../../model'
import { Rect } from '../shape'
import { getBBoxOfPoints, pointsStr2PointsList } from '../../util'
import { ModelType } from '../../constant'

export type IOutlineProps = {
  graphModel: GraphModel
}

export const Outline = observer(
  class OutlineOverlay extends Component<IOutlineProps> {
    // 节点 outline
    getNodesOutline() {
      const {
        graphModel: {
          nodes,
          editConfigModel: { hoverOutline, nodeSelectedOutline },
        },
      } = this.props
      const nodeOutline: h.JSX.Element[] = []
      forEach(nodes, (node) => {
        if (node.isHovered || node.isSelected) {
          const { isHovered, isSelected, x, y, width, height, transform } = node
          if (
            (nodeSelectedOutline && isSelected) ||
            (hoverOutline && isHovered)
          ) {
            const style = node.getOutlineStyle()
            let attributes: Record<string, unknown> = {}
            forEach(Object.keys(style), (key) => {
              if (key !== 'hover') {
                attributes[key] = style[key]
              }
            })
            if (isHovered) {
              const hoverStyle = style.hover
              attributes = {
                ...attributes,
                ...hoverStyle,
              }
            }

            console.log('width', width)
            console.log('height', height)
            nodeOutline.push(
              <Rect
                className="lf-outline-node"
                transform={transform}
                x={x}
                y={y}
                width={width + 10}
                height={height + 10}
                {...attributes}
              />,
            )
          }
        }
      })
      return nodeOutline
    }

    // 直线边 outline
    getLineOutline(line: LineEdgeModel): h.JSX.Element {
      const {
        startPoint: { x: sx, y: sy },
        endPoint: { x: ex, y: ey },
      } = line
      const x = (sx + ex) / 2
      const y = (sy + ey) / 2
      const width = Math.abs(sx - ex) + 10
      const height = Math.abs(sy - ey) + 10
      const style = line.getOutlineStyle()

      return (
        <Rect
          className="lf-outline-edge"
          x={x}
          y={y}
          width={width}
          height={height}
          {...style}
        />
      )
    }

    // 折线边 outline
    getPolylineOutline(polyline: PolylineEdgeModel): h.JSX.Element {
      const { points } = polyline
      const pointsList = pointsStr2PointsList(points)
      const { x, y, width, height } = getBBoxOfPoints(pointsList)
      const style = polyline.getOutlineStyle()

      return (
        <Rect
          className="lf-outline"
          x={x}
          y={y}
          width={width}
          height={height}
          {...style}
        />
      )
    }

    // 贝塞尔曲线边 outline
    getBezierOutline(bezier: any): h.JSX.Element {
      console.log('bezier', bezier)
      return <g />
    }

    // 边的 outline
    getEdgeOutline() {
      const {
        graphModel: {
          edges,
          editConfigModel: { edgeSelectedOutline, hoverOutline },
        },
      } = this.props
      const edgeOutline: h.JSX.Element[] = []
      forEach(edges, (edge) => {
        if (
          (edgeSelectedOutline && edge.isSelected) ||
          (hoverOutline && edge.isHovered)
        ) {
          if (edge.modelType === ModelType.LINE_EDGE) {
            edgeOutline.push(this.getLineOutline(edge as LineEdgeModel))
          } else if (edge.modelType === ModelType.POLYLINE_EDGE) {
            edgeOutline.push(this.getPolylineOutline(edge as PolylineEdgeModel))
          } else if (edge.modelType === ModelType.BEZIER_EDGE) {
            edgeOutline.push(this.getBezierOutline(edge))
          }
        }
      })

      return edgeOutline
    }

    render(): h.JSX.Element {
      return (
        <g class="lf-outline">
          {this.getNodesOutline()}
          {this.getEdgeOutline()}
        </g>
      )
    }
  },
)

export default Outline

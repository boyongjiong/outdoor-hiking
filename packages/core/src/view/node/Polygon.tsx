import { createElement as h } from 'preact/compat'
import BaseNode from './Base'
import { Polygon } from '../shape'
import { PolygonNodeModel, GraphModel } from '../../model'

export type IPolygonNodeProps = {
  model: PolygonNodeModel
  graphModel: GraphModel
}

export class PolygonNode extends BaseNode<IPolygonNodeProps> {
  getShape = (): h.JSX.Element => {
    const { model } = this.props
    const { x, y, width, height, points } = model
    const style = model.getNodeStyle()
    const attrs = {
      transform: `matrix(1 0 0 1 ${x - width / 2} ${y - height / 2})`,
    }

    return (
      <g {...attrs}>
        <Polygon {...style} points={points} x={x} y={y} />
      </g>
    )
  }
}

export default PolygonNode

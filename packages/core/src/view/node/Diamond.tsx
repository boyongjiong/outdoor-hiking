import { createElement as h } from 'preact/compat'
import BaseNode from './Base'
import { Polygon } from '../shape'
import { DiamondNodeModel, GraphModel } from '../../model'

export type IDiamondNodeProps = {
  model: DiamondNodeModel
  graphModel: GraphModel
}

export class DiamondNode extends BaseNode<IDiamondNodeProps> {
  getShape = (): h.JSX.Element => {
    const { model } = this.props
    const style = model.getNodeStyle()

    return (
      <g>
        <Polygon {...style} points={model.points} x={model.x} y={model.y} />
      </g>
    )
  }
}

export default DiamondNode

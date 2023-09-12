import { createElement as h } from 'preact/compat'
import BaseNode from './Base'
import { Circle } from '../shape'
import { CircleNodeModel, GraphModel } from '../../model'

export type ICircleNodeProps = {
  model: CircleNodeModel
  graphModel: GraphModel
}

export class CircleNode extends BaseNode<ICircleNodeProps> {
  getShape = (): h.JSX.Element => {
    const { model } = this.props
    const style = model.getNodeStyle()

    return <Circle {...style} x={model.x} y={model.y} r={model.r} />
  }
}

export default CircleNode

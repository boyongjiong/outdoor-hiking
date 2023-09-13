import { createElement as h } from 'preact/compat'
import BaseNode from './Base'
import { Ellipse } from '../shape'
import { EllipseNodeModel, GraphModel } from '../../model'

export type IEllipseNodeProps = {
  model: EllipseNodeModel
  graphModel: GraphModel
}

export class EllipseNode extends BaseNode<IEllipseNodeProps> {
  getShape = (): h.JSX.Element => {
    const { model } = this.props
    const style = model.getNodeStyle()

    return (
      <Ellipse {...style} x={model.x} y={model.y} rx={model.rx} ry={model.ry} />
    )
  }
}

export default EllipseNode

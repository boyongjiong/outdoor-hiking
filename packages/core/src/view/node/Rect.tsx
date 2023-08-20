import { h } from 'preact';
import BaseNode from './Base';
import { Rect } from '../shape';
import { GraphModel, RectNodeModel } from '../../model'

export type IRectNodeProps = {
  model: RectNodeModel;
  graphModel: GraphModel;
};

export class RectNode extends BaseNode<IRectNodeProps> {
  getShape(): h.JSX.Element {
    const { model } = this.props;
    const style = model.getNodeStyle();
    return (
      <Rect
        {...style}
        x={model.x}
        y={model.y}
        width={model.width}
        height={model.height}
        radius={model.radius}
      />
    )
  }
}

export default RectNode;

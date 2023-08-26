import { createElement as h } from "preact/compat";
import BaseNode from './Base';
import { Rect } from '../shape';
import { RectNodeModel, GraphModel } from '../../model'

export type IRectNodeProps = {
  model: RectNodeModel;
  graphModel: GraphModel;
};

export class RectNode extends BaseNode<IRectNodeProps> {
  getShape = (): h.JSX.Element => {
    const { model } = this.props;''
    const style = model.getNodeStyle();
    const { width, height, ...restStyle } = style;

    return (
      <Rect
        {...restStyle}
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

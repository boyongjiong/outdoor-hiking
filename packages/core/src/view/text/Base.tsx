import { Component, h } from 'preact';
import { ElementState } from '../../constant';
import { GraphModel, BaseNodeModel } from '../../model';
import { Text } from '../shape';

export type IBaseTextProps = {
  model: BaseNodeModel;
  graphModel: GraphModel;
  draggable: boolean;
  editable: boolean;
};

export type IBaseTextState = {
  isHovered: boolean;
};

class BaseText extends Component<IBaseTextProps, IBaseTextState> {
  constructor() {
    super();
  }

  getShape(): h.JSX.Element {
    const { model, graphModel } = this.props;
    const { editConfigModel } = graphModel;
    const { text: {
      value, x, y, editable, draggable,
    }} = model;
    const attr = {
      x, y, className: '', value,
    };
    // TODO: 代码优化，看是否可以引入 classnames
    if (editable) {
      attr.className = 'lf-element-text';
    } else if (draggable || editConfigModel.nodeTextDraggable) {
      attr.className = 'lf-text-draggable';
    } else {
      attr.className = 'lf-text-disabled';
    }
    const style = model.getTextStyle();

    return (
      <Text {...attr} {...style} model={model} />
    )
  }

  dbClickHandler() {
    // 静默模式下，双击不更改状态，不可编辑
    const { editable } = this.props;
    if (editable) {
      const { model } = this.props;
      model.setElementState(ElementState.TEXT_EDIT);
    }
  }

  render() {
    const { model: { text } } = this.props;
    if (text) {
      return (
        <g onDblClick={this.dbClickHandler}>
          {this.getShape()}
        </g>
      )
    }
  }
}

export default BaseText;

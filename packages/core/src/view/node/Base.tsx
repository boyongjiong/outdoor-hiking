import { map } from 'lodash-es';
import { Component, h } from 'preact';
import { BaseText, Anchor } from '..';
import { ElementState } from '../../constant';
import { GraphModel, BaseNodeModel } from '../../model';

export type IBaseNodeProps = {
  model: BaseNodeModel,
  graphModel: GraphModel
};
export type IBaseNodeState = {
  isDragging?: boolean;
};

abstract class BaseNode extends Component<IBaseNodeProps, IBaseNodeState> {
  constructor(props: IBaseNodeProps) {
    super();
    const {
      graphModel: { gridSize, eventCenter },
      model,
    } = props;

    console.log('gridSize ===>>>', gridSize);
    console.log('eventCenter ===>>>', eventCenter.getEvents());
    console.log('BaseNodeModel --->>>', model);
  }
  abstract getShape(): h.JSX.Element;
  getAnchorShape(anchorData: any): h.JSX.Element {
    return null;
  }
  getAnchors() {
    const { model, graphModel } = this.props;
    const {
      isSelected, isHittable, isDragging, isShowAnchor,
    } = model;

    if (isHittable && (isSelected || isShowAnchor) && !isDragging) {
      return map(model.anchors, (anchor, index) => {
        const edgeStyle = model.getAnchorLineStyle();
        const style = model.getAnchorStyle();
        return (
          <Anchor
            anchorData={anchor}
            node={this}
            style={style}
            edgeStyle={edgeStyle}
            anchorIndex={index}
            nodeModel={model}
            graphMode={graphModel}
            // TODO：确认该功能干什么的
            // setHoverOff={this.setHoverOff}
          />
        )
      });
    }
    return [];
  }
  getText() {
    const { model, graphModel } = this.props;
    // 文本编辑状态下，显示编辑框，不显示文本。
    if (model.state === ElementState.TEXT_EDIT) {
      return '';
    }
    if (model.text) {
      const { editConfigModel } = graphModel;
      let draggable = false;
      if (model.text.draggable || editConfigModel.nodeTextDraggable) {
        draggable = true;
      }
      const editable = model.text.editable || editConfigModel.nodeTextEdit;

      return (
        <BaseText
          model={model}
          graphModel={graphModel}
          draggable={draggable}
          editable={editable}
        />
      )
    }
  }
  getStateClassName() {
    const {
      model: { state, isDragging, isSelected },
    } = this.props;
    let className = 'lf-node';
    switch (state) {
      case ElementState.ALLOW_CONNECT:
        className += ' lf-node-allow';
        break;
      case ElementState.NOT_ALLOW_CONNECT:
        className += ' lf-node-not-allow';
        break;
      default:
        className += ' lf-node-default';
        break;
    }
    if (isDragging) {
      className += ' lf-isDragging';
    }
    if (isSelected) {
      className += ' lf-node-selected';
    }

    return className;
  }

  render() {
    const {
      model: { isHittable, draggable },
      graphModel: {
        gridSize,
        // transformModel: { SCALE_X },
        editConfigModel: { hideAnchors },
      },
    } = this.props;

    const nodeShapeInner = (
      <g className="lf-node-content">
        {this.getShape()}
        {this.getText()}
        {
          hideAnchors ? null : this.getAnchors()
        }
      </g>
    );

    if (isHittable) {
      return (
        <g className={this.getStateClassName()}>
          {nodeShapeInner}
        </g>
      )
    } else {
      return (
        <g
          className={this.getStateClassName()}
        >
          {nodeShapeInner}
        </g>
      )
    }
  }
}

export default BaseNode;

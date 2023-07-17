import { Component } from 'preact';
import { LogicFlow } from '..';
import { BaseNode, Line, Circle } from '.';
import { distance } from '../util';
import { BaseNodeModel, GraphModel } from '../model';

export interface AnchorOptions {
  id?: string;
  x: number;
  y: number;
  [key: string]: unknown;
}

export interface IAnchorProps {
  anchorData: AnchorOptions;
  anchorIndex: number;
  graphMode: GraphModel
  node: BaseNode;
  nodeModel: BaseNodeModel;
  style?: LogicFlow.AnchorTheme;
  edgeStyle?: LogicFlow.AnchorLineTheme;
  hoverStyle?: LogicFlow.AnchorTheme;
}

export interface IAnchorState {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  dragging: boolean;
}

export class Anchor extends Component<IAnchorProps, IAnchorState> {
  // TODO: 后续待补充 连接规则 相关能力
  constructor() {
    super();

    this.state = {
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      dragging: false,
    };
  }

  getAnchorShape() {
    const { anchorData, style, node } = this.props;
    const anchorShape = node.getAnchorShape(anchorData);
    if (anchorShape) return anchorShape;

    const { x, y } = anchorData;
    const hoverStyle = {
      ...style,
      ...style.hover,
    };
    return (
      <g>
        <Circle
          className="lf-node-anchor-hover"
          {...hoverStyle}
          {...{ x, y }}
        />
        <Circle
          className="lf-node-anchor"
          {...style}
          {...{ x, y }}
        />
      </g>
    );
  }

  isShowLine() {
    const {
      startX,
      startY,
      endX,
      endY,
    } = this.state;
    const v = distance(startX, startY, endX, endY);
    return v > 10;
  }

  render() {
    const {
      startX, startY, endX, endY,
    } = this.state;
    const {
      anchorData: { edgeAddable }, edgeStyle,
    } = this.props

    return (
      // className="lf-anchor" 作为下载时，需要将锚点删除的依据，不要修改类名
      <g className="lf-anchor">
        <g onMouseDown={(ev) => { console.log('ev===>>>', ev) }}>
          {this.getAnchorShape()}
        </g>
        {this.isShowLine() && (
          <Line
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            {...edgeStyle}
            pointer-events="none"
          />
        )}
      </g>
    );
  }
}

export default Anchor;

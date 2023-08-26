import { createElement as h, Component } from 'preact/compat';
import { LogicFlow } from '../../LogicFlow';
import { BaseEdgeModel, BaseNodeModel, GraphModel } from '../../model';
import { StepperDrag, RafInstance } from '../../util';

export enum AdjustType {
  SOURCE = 'SOURCE',
  TARGET = 'TARGET',
}

export type IAdjustPointProps = {
  x: number;
  y: number;
  type: AdjustType;
  id?: string;
  getAdjustPointShape: (x: number, y: number, model: BaseEdgeModel) => h.JSX.Element | null;
  model: BaseEdgeModel;
  graphModel: GraphModel;
};
export type IAdjustPointState = {
  dragging: boolean;
  endX: number;
  endY: number;
};

export class AdjustPoint extends Component<IAdjustPointProps, IAdjustPointState> {
  readonly adjustPointData?: Record<string, unknown>;
  readonly preTargetNode?: BaseNodeModel;
  // requestAnimationFrame 方法实例
  rafIns?: RafInstance;
  stepperDrag?: StepperDrag;

  // 连线规则数据
  sourceRuleResults: Map<string, LogicFlow.ConnectRuleResult>;
  targetRuleResults: Map<string, LogicFlow.ConnectRuleResult>;

  constructor(props: IAdjustPointProps) {
    super();
    const { graphModel: { eventCenter }, model, type } = props;
    this.sourceRuleResults = new Map();
    this.targetRuleResults = new Map();

    this.state = {
      dragging: false,
      endX: 0,
      endY: 0,
    };
    const edgeData = model.getData();
    this.adjustPointData = { type, edgeData };

    this.stepperDrag = new StepperDrag({
      eventCenter,
      onDragStart: this.onDragStart,
      onDragging: this.onDragging,
      onDragEnd: this.onDragEnd,
      eventType: 'ADJUST_POINT',
      isStopPropagation: false,
      data: this.adjustPointData,
    });

  }

  mouseDownHandler = () => {}
  onDragStart = () => {}
  onDragging = () => {}
  onDragEnd = () => {}

  // 还原上次边的样式
  restoreEdge() {

  }

  getAdjustPointStyle() {

  }

  isAllowToAdjust() {}

  render(): h.JSX.Element {
    const { x, y , getAdjustPointShape, model } = this.props;
    const { dragging } = this.state;
    return (
      <g
        pointerEvents={dragging ? 'none' : ''}
        onMouseDown={this.mouseDownHandler}
      >
        {!dragging ? getAdjustPointShape(x, y, model) : ''}
      </g>
    );
  }
}

export default AdjustPoint;

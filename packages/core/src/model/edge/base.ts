import { assign, isUndefined } from 'lodash';
import { Model, GraphModel } from '..';
import { LogicFlow } from '../..';
import { createUuid, getZIndex, observable, computed, pickEdgeConfig, action } from '../../util';
import { ElementState, ElementType } from '../../constant';

export interface IBaseEdgeModel extends Model.BaseModel {
  /**
   * model 基础类型，固定为 node
   */
  readonly baseType: ElementType.EDGE;

  isAnimation: boolean;
  isShowAdjustPoint: boolean; // 是否显示边两端的调整点

  sourceAnchorId: string;
  targetAnchorId: string;
  arrowConfig?: {
    markerStart: string;
    markerEnd: string;
  };
}

export class BaseEdgeModel implements IBaseEdgeModel {
  // 数据属性
  readonly id = '';

  @observable readonly type = '';
  @observable sourceNodeId = '';
  @observable targetNodeId = '';
  @observable startPoint = null;
  @observable endPoint = null;

  @observable text = {
    value: '',
    x: 0,
    y: 0,
    draggable: false,
    editable: true,
  };
  @observable properties: Record<string, unknown> = {};
  // TODO: 确认类型，edge 独有
  @observable points = '';
  @observable pointsList = [];

  // 状态属性
  @observable isSelected = false;
  @observable isHovered = false;
  @observable isHittable = false;
  @observable draggable = true;
  @observable visible = true;
  readonly virtual = false;

  // 引用属性
  graphModel: GraphModel;
  @observable zIndex: number = 0;
  @observable state = ElementState.DEFAULT;

  readonly baseType = ElementType.EDGE;
  modelType = Model.ModelType.EDGE;
  additionStateData?: Model.AdditionStateDataType;

  sourceAnchorId: string = '';
  targetAnchorId: string = '';

  // TODO: 确认是否需要 menu
  // menu?: MenuConfig[];
  customTextPosition = false; // 是否自定义边文本位置
  @observable style: LogicFlow.CommonTheme = {}; // 每个节点自己的样式，动态修改
  @observable arrowConfig = {
    markerStart: `url(#marker-start-${this.id})`,
    markerEnd: `url(#marker-end-${this.id})`,
  };

  [propName: string]: unknown;

  constructor(data: LogicFlow.EdgeConfig, graphModel: GraphModel) {
    this.graphModel = graphModel;
    this.initEdgeData(data);
    this.setAttributes();
  }

  initEdgeData(data: LogicFlow.EdgeConfig) {
    const { idGenerator, overlapMode } = this.graphModel;
    if (!data.properties) {
      data.properties = {};
    }
    if (!data.id) {
      // 优先级：自定义边 id > 全局自定义边 id > 内置
      const globalId = idGenerator && idGenerator(data.type);
      const edgeId = this.createId();
      data.id = edgeId || globalId || createUuid();
    }

    this.arrowConfig.markerEnd = `url(#marker-end-${this.id})`;
    this.arrowConfig.markerStart = `url(#marker-start-${this.id})`;

    // 文本位置依赖于边上的所有拐点
    this.formatText(data);
    assign(this, pickEdgeConfig);

    if (overlapMode) {
      this.zIndex = data.zIndex || getZIndex();
    }

    // 设置边的 Anchors，即边的两个端点
    // 端点依赖于 edgeData 的 sourceNode 和 targetNode
    this.setupAnchors();

    // 边的拐点依赖于两个端点
    this.initPoints();
  }

  setAttributes() { }

  /**
  * @overridable 用户可自定义 - 自定义此类型节点 ID 默认生成方式
  * @returns string | null
  */
  public createId(): string | null { return null }

  private formatText(data: LogicFlow.EdgeConfig): void {
    const { x, y } = this.textPosition;
    const { text } = data;
    const defaultText = {
      value: '',
      x,
      y,
      draggable: false,
      editable: true,
    };
    if (!text) {
      data.text = { ...defaultText };
    } else {
      if (typeof text === 'string') {
        data.text = {
          ...defaultText,
          value: text,
        };
      } else if (Object.prototype.toString.call(text) === "[object Object]") {
        data.text = {
          ...defaultText,
          x: text.x || x,
          y: text.y || y,
          value: text.value || '',
        };
        if (!isUndefined(text.draggable)) {
          data.text.draggable = text.draggable;
        }
        if (!isUndefined(text.editable)) {
          data.text.editable = text.editable;
        }
      }
    }

  }

  getTextPosition(): LogicFlow.Point {
    return {
      x: 0,
      y: 0,
    };
  }

  @computed get sourceNode() {
    return this.graphModel.nodesMap[this.sourceNodeId]?.model;
  }
  @computed get targetNode() {
    return this.graphModel.nodesMap[this.targetNodeId]?.model;
  }

  @computed get textPosition(): LogicFlow.Point {
    return this.getTextPosition();
  }

  @action resetTextPosition() {
    const { x, y } = this.textPosition;
    this.text.x = x;
    this.text.y = y;
  }

  setupAnchors() {}
  initPoints() {}

}

export { BaseEdgeModel };
export default BaseEdgeModel;
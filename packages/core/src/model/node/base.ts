import { GraphModel, Model } from '..';
import { LogicFlow } from '../../LogicFlow';
import { createUuid, observable } from '../../util';
import { ElementType } from '../../constant';

export interface IBaseNodeModel extends Model.BaseModel {
  /**
   * model 基础类型，固定为 node
   */
  readonly baseType: ElementType.NODE,
}

export class BaseNodeModel implements IBaseNodeModel {
  // 数据属性
  readonly id = '';
  @observable readonly type = '';
  @observable x = 0;
  @observable y = 0;
  @observable text = {
    value: '',
    x: 0,
    y: 0,
    draggable: false,
    editable: true,
  };
  @observable properties: Record<string, unknown> = {};

  // 形状属性
  @observable private _width = 100;
  public get width() {
    return this._width;
  }
  public set width(value) {
    this._width = value;
  }
  @observable private _height = 80;
  public get height() {
    return this._height;
  }
  public set height(value) {
    this._height = value;
  }

  // 根据与(x, y)的偏移量计算 anchors 的坐标
  @observable anchorsOffset: BaseNodeModel.AnchorsOffsetItem[] = [];

  // 状态属性
  @observable isSelected = false;
  @observable isHovered = false;
  @observable isShowAnchor = false;
  @observable isDragging = false;
  @observable isHitable = false;
  @observable draggable = true;
  @observable visible = true;
  readonly virtual = false;

  // 其它属性
  graphModel: GraphModel;
  @observable zIndex = 1;
  @observable state = 1;
  @observable autoToFront = true; // 选中节点时是否自动置顶，默认为 true

  readonly baseType = ElementType.NODE;
  modelType = Model.ModelType.NODE;

  constructor(data: LogicFlow.NodeConfig, graphModel: GraphModel) {
    this.graphModel = graphModel;
    this.initNodeData(data);
    this.setAttributes();
  }

  public createId(): string | undefined { return undefined }

  initNodeData(data: LogicFlow.NodeConfig) {
    if (!data.properties) {
      data.properties = {};
    }

    if (!data.id) {
      // 优先级：自定义节点 ID > 全局定义 ID > 内置
      const { idGenerator } = this.graphModel;
      const globalId = idGenerator?.(data.type);
      const nodeId = this.createId();
      data.id = nodeId || globalId || createUuid()
    }

    this.formatText(data)
  }

  setAttributes() { }

  private formatText(data: LogicFlow.NodeConfig): void {
    const defaultText = {
      value: '',
      x: data.x,
      y: data.y,
      draggable: false,
      editable: true,
    };
    if (!data.text) {
      data.text = { ...defaultText };
    } else if (typeof data.text === 'string') {
      data.text = {
        ...defaultText,
        value: data.text,
      };
    } else if (data.text.editable === undefined) {
      data.text.editable = true;
    }
  }
}

export namespace BaseNodeModel {
  export type PointTuple = [number, number];

  export interface PointAnchor {
    x: number; // 锚点 x 轴相对于中心点的偏移量
    y: number; // 锚点 y 轴 相对于中心点的偏移量
    id?: string; // 锚点 id
    [key: string]: unknown;
  }

  export type AnchorsOffsetItem = PointAnchor | PointAnchor;

  export interface AnchorInfo {
    index: number;
    anchor: LogicFlow.Point
  }
}

export default BaseNodeModel;

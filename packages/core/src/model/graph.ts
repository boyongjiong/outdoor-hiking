import { createUuid, setupTheme } from '../util';
import { action, observable, computed } from '../util/mobx';
import { Options as LogicFlowOptions } from '../options';
import { Model, BaseNodeModel, BaseEdgeModel, EditConfigModel } from '.';
import LogicFlow from '../LogicFlow';
import { OverlapMode } from '../constant';
import EventEmitter from '../event/eventEmitter';

export class GraphModel {
  public readonly rootEl: HTMLElement;
  @observable width: number;
  @observable height: number;

  readonly theme: LogicFlow.Theme; // 流程图主题
  readonly eventCenter: EventEmitter; // 事件中心

  public readonly modelMap = new Map();
  idGenerator?: (type?: string) => string | undefined;
  edgeGenerator: LogicFlowOptions.Definition['edgeGenerator'];

  /**
   * 节点移动规则判断
   * 在节点移动的时候，会触发此数组中的所有规则判断
   */
  nodeMoveRules: Model.NodeMoveRule[] = [];

  @observable edgeType: string;
  @observable nodes: BaseNodeModel[] = [];
  @observable edges: BaseEdgeModel[] = [];

  /**
   * 元素重合时堆叠模式：
   * - DEFAULT（默认模式）：节点和边被选中，会被显示在最上面。当取消选中后，元素会恢复之前的层级
   * - INCREASE（递增模式）：节点和边被选中，会被显示在最上面。当取消选中后，元素会保持当前层级
   */
  @observable overlapMode = OverlapMode.DEFAULT;

  @observable gridSize: number = 1;

  // 图编辑配置项 Model
  @observable editConfigModel: EditConfigModel;

  flowId: number | string;
  constructor(options: LogicFlowOptions.Common) {
    const { container, idGenerator } = options;

    this.rootEl = container;
    this.width = options.width || this.rootEl.getBoundingClientRect().width;
    this.height = options.height || this.rootEl.getBoundingClientRect().height;
    this.edgeType = options.edgeType || 'polyline';

    this.theme = setupTheme(options.style);
    this.eventCenter = new EventEmitter();
    this.editConfigModel = new EditConfigModel(options);

    this.flowId = createUuid();
    this.idGenerator = idGenerator;
  }

  @computed get nodesMap(): GraphModel.NodesMapType {
    // TODO: nodesMap 改做返回 Map Or WeakMap 是否可行
    return this.nodes.reduce((nMap, model, index) => {
      if (model.id) {
        nMap[model.id] = { index, model };
      }
      return nMap;
    }, {} as GraphModel.NodesMapType);
  }
  @computed get edgesMap(): GraphModel.EdgesMapType {
    return this.edges.reduce((eMap, model, index) => {
      if (model.id) {
        eMap[model.id] = { index, model };
      }
      return eMap;
    }, {} as GraphModel.EdgesMapType);
  }
  @computed get modelsMap(): GraphModel.ModelsMapType {
    return [...this.nodes, ...this.edges].reduce((mMap, model) => {
      if (model.id) {
        mMap[model.id] = model;
      }
      return mMap;
    }, {} as GraphModel.ModelsMapType);
  }

  // Model
  getModel(type: string) {
    return this.modelMap.get(type);
  }

  graphDataToModel(graphData: LogicFlow.GraphConfigData) {
    if (!this.width || !this.height) {
      this.resize();
    }

    if (!graphData) {
      this.nodes = [];
      this.edges = [];
      return;
    }
  }

  modelToGraphData(): LogicFlow.GraphConfigData {
    const nodes: LogicFlow.NodeConfig[] = [];
    const edges: LogicFlow.EdgeConfig[] = [];

    return {
      nodes,
      edges,
    };
  }

  @action setModel(type: string, model: any) {
    return this.modelMap.set(type, model);
  }

  // Edge


  // Node


  // Graph Update
  @action resize(width?: number, height?: number): void {
    this.width = width || this.rootEl.getBoundingClientRect().width;
    this.height = height || this.rootEl.getBoundingClientRect().height;

    if (!this.width || !this.height) {
      throw new Error(`渲染画布时无法获取画布宽高信息，请确认 container 已挂载至 DOM。 @see https://github.com/didi/LogicFlow/issues/675'`)
    }
  }
}

export namespace GraphModel {
  export type NodesMapType = Record<string, {
    index: number;
    model: BaseNodeModel;
  }>;
  export type EdgesMapType = Record<string, {
    index: number;
    model: BaseEdgeModel;
  }>;

  export type ModelsMapType = Record<string, BaseNodeModel | BaseEdgeModel>;
}

export default GraphModel;

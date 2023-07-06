import { action, observable, computed, createUuid } from '../util';
import { Options as LogicFlowOptions } from '../options';
import LogicFlow from '../LogicFlow';

export class GraphModel {
  public readonly rootEl: HTMLElement;
  @observable width: number;
  @observable height: number;

  public readonly modelMap = new Map();
  idGenerator?: (type?: string) => string | undefined;
  edgeGenerator: LogicFlowOptions.Definition['edgeGenerator'];

  @observable edgeType: string;
  @observable nodes: any;

  constructor(options: LogicFlowOptions.Common) {
    const { container, idGenerator } = options;

    this.rootEl = container;
    this.width = options.width || this.rootEl.getBoundingClientRect().width;
    this.height = options.height || this.rootEl.getBoundingClientRect().height;
    this.flowId = createUuid();
    this.idGenerator = idGenerator;
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

export default GraphModel;

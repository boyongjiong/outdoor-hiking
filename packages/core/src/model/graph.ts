import { action, observable, computed } from '../util';
import { Options as LogicFlowOptions } from '../options';

export class GraphModel {
  public readonly rootEl: HTMLElement;
  @observable width: number;
  @observable height: number;

  public readonly modelMap = new Map();
  idGenerator: (type?: string) => string;
  edgeGenerator: LogicFlowOptions.Definition['edgeGenerator'];

  constructor(options: LogicFlowOptions.Common) {
    const { container } = options;

    this.rootEl = container;
    
  }
}

export default GraphModel;

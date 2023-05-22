import { render, h } from 'preact';
import { observer } from 'mobx-react';
import { Options as LogicFlowOptions } from './options';
import { GraphModel } from './model';
import { formatRawData } from './util';

export class LogicFlow {
  public graphModel: GraphModel;
  public viewMap: Set<any> = new Set();

  public readonly options: LogicFlowOptions.Definition;
  public readonly components: ComponentRender[] = [];

  public get container() {
    // TODO: 确认是否需要，后续是否只要返回 container 即可（下面方法是为了解决事件绑定问题的）
    const lfContainer = document.createElement('div');
    lfContainer.style.position = 'relative';
    lfContainer.style.width = '100%';
    lfContainer.style.height = '100%';
    this.container.innerHTML = '';
    this.container.appendChild(lfContainer);
    return lfContainer;
  }

  protected get [Symbol.toStringTag]() {
    return LogicFlow.toStringTag;
  }

  constructor(options: LogicFlowOptions.Common) {
    this.options = LogicFlowOptions.get(options);
    this.graphModel = new GraphModel({
      ...this.options,
    });
  }

  public register() {

  }

  public renderRawData(graphRawData: any) {
    this.graphModel.graphDataToModel(formatRawData(graphRawData));

  }

  public render(graphData: any) {

  }
}

export namespace LogicFlow {
  export interface Options extends LogicFlowOptions.Common {}

  export interface Node {

  }

  export interface Edge {

  }
}

export namespace LogicFlow {
  export const toStringTag = `LF.${LogicFLow.name}`
}

export default LogicFlow

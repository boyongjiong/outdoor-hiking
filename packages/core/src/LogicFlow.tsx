import { render, h } from 'preact';
import { observer } from 'mobx-react';
import { Options as LogicFlowOptions } from './options';
import { GraphModel } from './model';
import { formatRawData } from './util';
import { cloneDeep } from 'lodash-es';

export class LogicFlow {
  public graphModel: GraphModel;
  public viewMap: Set<any> = new Set();

  public readonly options: LogicFlowOptions.Definition;
  public readonly components: ComponentRender[] = [];

  private adapterIn?: (data: unknown) => LogicFlow.GraphConfigData;
  private adapterOut?: (data: LogicFlow.GraphConfigData, ...rest: any) => unknown;

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

  getGraphData(...args: any): LogicFlow.GraphConfigData | unknown {
    const data = this.graphModel.modelToGraphData();
    if (this.adapterOut) {
      return this.adapterOut(data, ...args)
    }
    return data;
  }

  public renderRawData(graphRawData: any) {
    this.graphModel.graphDataToModel(formatRawData(graphRawData));

  }

  public render(data: any) {
    let graphData = cloneDeep(data)
    if (this.adapterIn) {
      graphData = this.adapterIn(data)
    }
    this.renderRawData(graphData);
  }
}

export namespace LogicFlow {
  export interface Options extends LogicFlowOptions.Common {}

  export interface GraphConfigData  {
    nodes: NodeConfig[];
    edges: EdgeConfig[];
  }

  export type Point = {
    id?: string;
    x: number;
    y: number;
    [key: string]: unknown;
  }

  export type TextConfig = {
    value: string;
  } & Point;

  export interface NodeConfig {
    id?: string;
    type: string;
    x: number;
    y: number;
    text?: TextConfig | string;
    zIndex?: number;
    properties?: Record<string, unknown>;
  }

  export interface NodeData extends NodeConfig {
    id: string;
    [key: string]: unknown;
  }

  export interface NodeAttribute extends Partial<NodeConfig> {
    id: string;
  }

  export interface EdgeConfig {
    id?: string;
    type?: string; // TODO: 将所有类型选项列出来；LogicFlow 内部默认为 polyline

    sourceNodeId: string;
    sourceAnchorId?: string;
    targetNodeId: string;
    targetAnchorId?: string;

    startPoint?: Point;
    endPoint?: Point;
    text?: TextConfig | string;
    pointsList?: Point[];
    zIndex?: number;
    properties?: Record<string, unknown>;
  }

  // TODO: 确认这种类型该如何定义（必需和非必需动态调整，优雅的处理方式）
  export interface EdgeData extends EdgeConfig {
    id: string;
    type: string;
    [key: string]: unknown;
  }

  export interface EdgeAttribute extends Partial<EdgeConfig> {
    id: string;
  }

  export interface MenuConfig {
    text?: string;
    className?: string;
    icon?: boolean;
    callback: (id: string | number) => void;
  }
}

export namespace LogicFlow {
  export const toStringTag = `LF.${LogicFlow.name}`
}

export default LogicFlow

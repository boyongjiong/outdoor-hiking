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
  public readonly components: LogicFlow.ComponentRender[] = [];

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

// Option
export namespace LogicFlow {
  export interface Options extends LogicFlowOptions.Common { }

  export interface GraphConfigData {
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
    editable?: boolean;
    draggable?: boolean;
  } & Point;

  export interface NodeConfig {
    id?: string;
    type: string;
    x: number;
    y: number;
    text?: TextConfig | string;
    zIndex?: number;
    properties?: Record<string, unknown>;
    virtual?: boolean; // 是否虚拟节点
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

// Theme
export namespace LogicFlow {
  type NumberOrPercent = `${number}%` | number
  /**
   * 颜色 - CSS 属性用颜色
   * 如：#000000, rgba(0, 0, 0, 0), 如果是透明的，可以传 'none'
   */
  export type Color = string | 'none';
  /**
   * svg虚线
   * 格式为逗号分割字符串，如
   * @see https://developer.mozilla.org/zh-CN/docs/Web/SVG/Attribute/stroke-dasharray
   */
  export type DashArray = string;
  export type CommonTheme = {
    fill?: string; // 填充颜色
    stroke?: Color; // 边框颜色
    strokeWidth?: NumberOrPercent; // 边框宽度
    /**
     * 其他属性 - 我们会把你自定义的所有属性最终传递到 DOM 上
     * 详情请参考 svg 属性规范：
     * https://developer.mozilla.org/zh-CN/docs/Web/SVG/Attribute
     * 注意: 请不要在主题中设置“形状属性”，例如：x、y、width、height、radius、r、rx、ry
     * @see https://docs.logic-flow.cn/docs/#/zh/api/themeApi?id=%e5%bd%a2%e7%8a%b6%e5%b1%9e%e6%80%a7）
     */
    [key: string]: unknown;
  };

  // 节点 Shape 类型
  /**
   * rect 节点主题
   * svg基础图形-矩形
   * https://developer.mozilla.org/zh-CN/docs/Web/SVG/Element/rect
   */
  export type RectTheme = CommonTheme;
  /**
   * circle 节点主题
   * svg基础图形-圆形
   * https://developer.mozilla.org/zh-CN/docs/Web/SVG/Element/circle
   */
  export type CircleTheme = CommonTheme;
  /**
   * polygon 节点主题
   * svg基础图形-多边形
   * https://developer.mozilla.org/zh-CN/docs/Web/SVG/Element/polygon
   */
  export type PolygonTheme = CommonTheme;
  /**
   * ellipse 节点主题
   * svg基础图形-椭圆
   * https://developer.mozilla.org/zh-CN/docs/Web/SVG/Element/ellipse
   */
  export type EllipseTheme = CommonTheme;
  // 锚点样式（svg 基础图形 - 圆）
  export type AnchorTheme = {
    r?: number;
    hover?: {
      r: number;
    } & CommonTheme;
  } & CommonTheme;

  // 文本样式
  export type TextTheme = {
    color?: Color;
    fontSize?: number;
  } & CommonTheme;

  // 文本节点样式
  export type TextNodeTheme = {
    background?: RectTheme;
  } & TextTheme;

  // 节点上文本样式
  export type NodeTextTheme = {
    /**
     * 文本超出指定宽度处理方式
     * default: 不特殊处理，允许超出
     * autoWrap: 超出自动换行
     * ellipsis: 超出省略
     */
    overflowMode?: 'default' | 'autoWrap' | 'ellipsis';
    background?: RectTheme;
  } & TextTheme;
  // 边上文本样式
  export type EdgeTextTheme = {
    textWidth?: number;
    background?: {
      /**
       * 背景区域 padding
       * wrapPadding: '5px,10px'
       */
      wrapPadding?: string;
    } & RectTheme;
    // hover状态下文本样式
    hover?: EdgeTextTheme;
  } & NodeTextTheme & TextTheme;

  // 边 Edge 主题
  export type EdgeTheme = CommonTheme;
  export type EdgeBezierTheme = {
    // 贝塞尔调整线主题
    adjustLine?: EdgeTheme;
    // 贝塞尔调整锚点主题
    adjustAnchor?: CircleTheme;
  } & EdgeTheme;
  export type EdgePolylineTheme = EdgeTheme;
  export type EdgeAnimation = {
    stroke?: Color;
    strokeDasharray?: string;
    strokeDashoffset?: NumberOrPercent;
    animationName?: string;
    animationDuration?: `${number}s` | `${number}ms`;
    animationIterationCount?: 'infinite' | number;
    animationTimingFunction?: string;
    animationDirection?: string;
  };

  export type OutlineTheme = {
    hover?: CommonTheme;
  } & CommonTheme & EdgeAnimation;

  export type ArrowTheme = {
    /**
     * 箭头长度.
     * 以符号"->"为例, offset表示箭头大于号的宽度。
     */
    offset?: number,
    /**
     * 箭头垂直于边的距离
     * 以符号"->"为例, verticalLength表示箭头大于号的高度
     */
    verticalLength?: number,
  } & CommonTheme;

  export type AnchorLineTheme = EdgeTheme & EdgeAnimation;

  export interface Theme {
    baseNode: CommonTheme; // 所有节点的通用主题设置
    baseEdge: EdgeTheme; // 所有边的通用主题设置

    /**
     * 基础图形节点相关主题
     */
    rect: RectTheme; // 矩形样式
    circle: CircleTheme; // 圆形样式
    diamond: PolygonTheme; // 菱形样式
    ellipse: EllipseTheme; // 椭圆样式
    polygon: PolygonTheme; // 多边形样式
    /**
     * 基础图形线相关主题
     */
    line: EdgeTheme; // 直线样式
    polyline: EdgePolylineTheme; // 折现样式
    bezier: EdgeBezierTheme; // 贝塞尔曲线样式
    anchorLine: AnchorLineTheme; // 从锚点拉出的边的样式
    /**
     * 文本内容相关主题
     */
    text: TextTheme; // 文本节点样式
    nodeText: NodeTextTheme; // 节点文本样式
    edgeText: EdgeTextTheme; // 边文本样式
    /**
     * 其他元素相关主题
     */
    anchor: AnchorTheme; // 锚点样式
    arrow: ArrowTheme; // 边上箭头的样式
    snapline: EdgeTheme; // 对齐线样式
    /**
     * REMIND: 当开启了跳转边的起点和终点(adjustEdgeStartAndEnd:true)后
     * 边的两端会出现调整按钮
     * 边连段的调整点样式
     */
    edgeAdjust: CircleTheme;
    outline: OutlineTheme; // 节点选择状态下外侧的选框样式
    edgeAnimation: EdgeAnimation; // 边动画样式
  }
}

// Render or Functions
export namespace LogicFlow {
  export type ComponentRender = (lf: LogicFlow, container: HTMLElement) => void;
}

export namespace LogicFlow {
  export const toStringTag = `LF.${LogicFlow.name}`
}

export default LogicFlow

import { ElementState } from '../constant';
import { BaseNodeModel } from './node';
import { LogicFlow } from '../LogicFlow';

export namespace Model {
  export enum ModelType {
    NODE = 'node',
    CIRCLE_NODE = 'circle-node',
    POLYGON_NODE = 'polygon-node',
    RECT_NODE = 'rect-node',
    TEXT_NODE = 'text-node',
    ELLIPSE_NODE = 'ellipse-node',
    DIAMOND_NODE = 'diamond-node',
    HTML_NODE = 'html-node',
    EDGE = 'edge',
    LINE_EDGE = 'line-edge',
    POLYLINE_EDGE = 'polyline-edge',
    BEZIER_EDGE = 'bezier-edge',
    GRAPH = 'graph',
  }

  export type AdditionStateDataType = Record<string, unknown>
  export type PropertyType = Record<string, unknown>
  export type VectorType = [number, number]
  export type IsAllowMove = {
    x: boolean;
    y: boolean;
  }

  export type AnchorConfig = {
    id?: string;
    x: number;
    y: number;
    [key: string]: unknown;
  }

  export type ConnectRule = {
    message: string;
    validate: (
      source?: BaseNodeModel,
      target?: BaseNodeModel,
      sourceAnchor?: AnchorConfig,
      targetAnchor?: AnchorConfig,
      /**
       * REMIND: 调整的边的 id
       * 在开启 adjustEdgeStartAndEnd 后调整边连接的节点时会传入
       * 详见：https://github.com/didi/LogicFlow/issues/926#issuecomment-1371823306
       */
      edgeID?: string,
    ) => boolean
  }

  /**
   * 限制节点移动规则
   * model: 移动节点的 model
   * deltaX: 移动的 X 轴距离
   * deltaY: 移动的 Y 轴距离
   */
  export type NodeMoveRule = (
    model: BaseNodeModel,
    deltaX: number,
    deltaY: number,
  ) => Boolean | IsAllowMove;

  export interface BaseModel {
    /**
     * 节点或边对应的 ID.
     *
     * 默认情况下，使用 uuidV4 生成。如需自定义，可通过传入 createId 方法覆盖。
     */
    id: string;

    /**
     * model 对应的图形外观类型 (eg: 圆形、矩形、多边形等)
     *
     * 不可自定义，用于 LogicFlow 内部计算使用
     */
    readonly modelType: string;

    /**
     * 请勿直接修改属性，如果想要将一个节点类型修改为另一个类型。（直接禁止修改不就可以了 public readonly）
     * `lf.graphModel.changeEdgeType` or `lf.graphModel.changeNodeType`
     *
     * 流程图元素类型，自定义元素时对应的标识
     * 在 logicflow/core 中对应着 rect/circle/polyline 这种
     * 在实际项目中，我们会基于业务类型进行自定义 type.
     * 例如 BPMN 场景中，我们会定义开始节点的类型为 bpmn:start-event
     *
     * 与 modelType 的区别是，type 更多的是业务上的类型，而 modelType 则是外观上的类型。
     * 例如 bpmn.js 的开始节点和结束节点 type 分别为 'bpmn:start-event' 和 'bpmn:end-event'。
     * 但是他们的 modelType 都是 circle-node，因为他们的外观都是基于圆形自定义而来。
     */
    readonly type: string;

    /**
     * 元素状态
     *
     * 不同状态不应不同元素的显示效果（无法直接修改）
     */
    readonly state: ElementState;

    /**
     * 状态附加数据，例如显示菜单，菜单的位置信息
     * @deprecated: 请勿使用，即将废弃
     */
    additionStateData?: AdditionStateDataType;

    /**
     * Rule 相关配置，包括连入、连出、移动等
     */
    targetRules?: ConnectRule[];
    sourceRules?: ConnectRule[];
    moveRules?: NodeMoveRule[];
    hasSetTargetRules?: boolean;
    hasSetSourceRules?: boolean;

    /**
     * 元素上的文本
     *
     * LogicFlow 中存在梁总文本：1. 脱离边和节点单独存在的问题；2. 必须和边、节点关联的文本
     * 此属性控制的是第二种。节点和边在删除、调整的同时，其关联的文本也会对应删除、调整。
     */
    text: LogicFlow.TextConfig;

    isSelected: boolean; // 元素是否被选中
    isHovered: boolean; // 鼠标是否悬停在元素上
    // TODO: 确认拼写 fix typo（兼容拼写错误的情况）
    isHittable: boolean; // 细粒度控制节点是否对用户操作进行反应
    draggable: boolean; //
    visible: boolean; // 元素是否显示
    virtual: boolean; // 元素是否可以通过 getGraphData 获取到

    /**
     * 元素堆叠的层级，默认情况下节点 zIndex 值为 1，边 zIndex 为 0
     */
    zIndex: number;

    /**
     * 创建节点 ID
     *
     * 默认情况下，LogicFlow 内部使用 uuidV4 生成 id。在自定义节点的时候，可以重写此方法，
     * 基于自己的规则生成 id。
     * 注意 📢：此方法必须是同步方法，如果想要异步修改 ID，建议删除此节点后在同一位置创建一个新的节点
     * @overridable 可被重写
     * @returns string
     */
    createId: () => string | null;

    // Actions
    isAllowMoveNode?: (deltaX: number, deltaY: number) => boolean | IsAllowMove;
    moveText: (deltaX: number, deltaY: number) => void;
    moveTo?: (x: number, y: number, isIgnoreRule: boolean) => boolean;
    getMoveDistance?: (deltaX: number, deltaY: number, isIgnoreRule: boolean) => VectorType;
    move?: (x: number, y: number, isIgnoreRule: boolean) => boolean;
    updateText: (text: string) => void;

    setSelected: (isSelected: boolean) => void;
    setHovered: (isHovered: boolean) => void;
    setHittable: (isHittable: boolean) => void;

    setZIndex: (zIndex?: number) => void;
    updateAttributes: (attributes: LogicFlow.AttributesType) => void;
    /**
     * 设置 Node | Edge 等 model 的状态
     * @param state 状态
     * @param additionStateData 额外的参数
     */
    setElementState: (state: ElementState, additionStateData?: AdditionStateDataType) => void;

    getData: () => Record<string, unknown>;
    getProperties: () => PropertyType;
    setProperty: (key: string, val: unknown) => void;
    setProperties: (properties: PropertyType) => void;
    deleteProperty: (key: string) => void;

    getNodeStyle?: () => LogicFlow.CommonTheme;
    getTextStyle: () => LogicFlow.TextNodeTheme;
    getAnchorStyle?: () => LogicFlow.AnchorTheme;
    getAnchorLineStyle?: () => LogicFlow.AnchorLineTheme;
    getOutlineStyle: () => LogicFlow.OutlineTheme;
    setStyle: (key: string, val: LogicFlow.CommonThemePropTypes) => void;
    setStyles: (styles: LogicFlow.CommonTheme) => void;
    updateStyles: (styles: LogicFlow.CommonTheme) => void;
  }
}

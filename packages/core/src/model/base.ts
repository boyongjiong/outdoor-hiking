import { ElementState } from '../constant';
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
    POLYGON_EDGE = 'polyline-edge',
    BEZIER_EDGE = 'bezier-edge',
    GRAPH = 'graph',
  }

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
     * 请勿使用，即将废弃
     */
    additionStateData: Record<string, unknown>;
  
    /**
     * 元素上的文本
     * 
     * LogicFlow 中存在梁总文本：1. 脱离边和节点单独存在的问题；2. 必须和边、节点关联的文本
     * 此属性控制的是第二种。节点和边在删除、调整的同时，其关联的文本也会对应删除、调整。
     */
    text: LogicFlow.TextConfig;
  
    isSelected: boolean; // 元素是否被选中
    isHovered: boolean; // 鼠标是否悬停在元素上
    // TODO: 确认拼写 fix typo
    isHitable: boolean; // 细粒度控制节点是否对用户操作进行反应
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
    createId: () => string | undefined;
    moveText: (deltaX: number, deltaY: number) => void;
    updateText: (text: string) => void;
    setZIndex: (zIndex?: number) => void;
    setSelected: (selected: boolean) => void;
  
    /**
     * 设置 Node | Edge 等 model 的状态
     * @param state 状态
     * @param additionStateData 额外的参数
     */
    setElementState: (state: ElementState, additionStateData?: Record<string, unknown>) => void;
    getProperties: () => Record<string, unknown>; // TODO: 确认
    setProperties: (properties: Record<string, unknown>) => void;
    updateAttributes: (attributes: Record<string, unknown>) => void;
    getTextStyle: () => Record<string, unknown>;
  }
}

import { h } from 'preact';
import { forEach, pick } from 'lodash';
import { LogicFlow } from '../LogicFlow';
import { BaseNodeModel, GraphModel, Model } from '../model';

/*********************************************************
 * Node 节点工具函数
 ********************************************************/
// 从用户传入的数据中，获取规范的节点初始化数据
export const pickNodeConfig = (data: LogicFlow.NodeConfig | LogicFlow.NodeData): LogicFlow.NodeConfig => {
  return pick(data, [
    'id',
    'type',
    'x',
    'y',
    'text',
    'properties',
    'virtual',
  ]);
}

// 获取节点的 BBox
export const getNodeBBox = (node: BaseNodeModel): BaseNodeModel.NodeBBox => {
  const { x, y, width, height } = node;
  return {
    x,
    y,
    width,
    height,
    minX: x - width / 2,
    minY: y - height / 2,
    maxX: x + width / 2,
    maxY: y + height/ 2,
    centerX: x,
    centerY: y,
  };
};

export const isInNodeBBox = (
  position: LogicFlow.Point,
  targetNode: BaseNodeModel,
  offset: number = 0,
): boolean => {
  const bBox = getNodeBBox(targetNode);
  return (
    position.x >= bBox.minX - offset
    && position.x <= bBox.maxX + offset
    && position.y >= bBox.minY - offset
    && position.y <= bBox.maxY + offset
  );
};

// 对比两个节点的层级
const isNodeHigher = (
  node1: BaseNodeModel,
  node2: BaseNodeModel,
  graphModel: GraphModel,
): boolean => {
  const { id: id1, zIndex: zIndex1 } = node1;
  const { id: id2, zIndex: zIndex2 } = node2;

  if (zIndex1 > zIndex2) {
    return true;
  }
  return graphModel.nodesMap[id1].index > graphModel.nodesMap[id2].index;
}

// 手动连接边时，获取目标节点的信息：目标节点、目标节点的锚点 index 以及坐标
export type TargetNodeInfo = {
  node: BaseNodeModel;
  anchorIndex: number;
  anchor: Model.AnchorConfig;
}
export const getTargetNodeInfo = (
  position: LogicFlow.Point,
  graphModel: GraphModel,
): TargetNodeInfo => {
  const { nodes } = graphModel;
  let nodeInfo: TargetNodeInfo | undefined;
  for (let i = 0; i < nodes.length; i++) {
    const targetNode = nodes[i];
    const isInNode = isInNodeBBox(position, targetNode, 5);

    if (isInNode) {
      const anchorInfo = targetNode.getTargetAnchor(position);
      if (anchorInfo) {
        const currentNodeInfo: TargetNodeInfo = {
          node: targetNode,
          anchorIndex: anchorInfo.index,
          anchor: anchorInfo.anchor,
        };
        if (!nodeInfo || isNodeHigher(targetNode, nodeInfo.node, graphModel)) {
          nodeInfo = currentNodeInfo;
        }
      }
    }
  }
  return nodeInfo as TargetNodeInfo;
};

/*********************************************************
 * Anchor 节点锚点相关工具函数
 ********************************************************/
export const distance = (
  x1: number, y1: number, x2: number, y2: number
): number => Math.hypot(x1 - x2, y1 - y2);

// 获取所有锚点
export const getAnchors = (node: BaseNodeModel): LogicFlow.Point[] => {
  const { anchors } = node;
  return anchors;
};

/**
 * 基于节点的边，重新获取新的节点
 * TODO: 这个计算方法是否可优化？？？
 * @param node 新的节点
 * @param point 原锚点位置
 */
export const getNodeAnchorPosition = (
  node: BaseNodeModel,
  point: LogicFlow.Point,
): LogicFlow.Point => {
  let { x, y, width, height } = node;
  const { x: px, y: py } = point;
  if (px > x) {
    x = x + width / 2;
  } else if (px < x) {
    x = x - width / 2;
  }

  if (py > y) {
    y = y + height / 2;
  } else if (py < y) {
    y = y - height / 2;
  }

  return { x, y };
};

export const getClosestAnchor = (
  position: LogicFlow.Point,
  node: BaseNodeModel
): BaseNodeModel.AnchorInfo | undefined => {
  const anchors = getAnchors(node);
  if (anchors?.length > 0) {
    let closest = {
      index: 0,
      anchor: anchors[0]
    };
    let minDistance = Number.MAX_SAFE_INTEGER;
    forEach(anchors, (anchor, idx) => {
      const len = distance(position.x, position.y, anchor.x, anchor.y);
      if (len < minDistance) {
        minDistance = len;
        closest = {
          index: idx,
          anchor: {
            ...anchor,
            x: anchor.x,
            y: anchor.y,
            id: anchor.id,
          },
        };
      }
    });

    return closest;
  }
  return undefined;
};

export const formatAnchorConnectValidateResult = (result: LogicFlow.ConnectRuleResult): LogicFlow.ConnectRuleResult => {
  if (typeof result !== 'object') {
    return {
      isAllPass: result,
      msg: result ? '' : '不允许连接',
    };
  }
  return result;
}

/*********************************************************
 * Text 节点文本相关工具函数
 ********************************************************/
// Text 相关节点工具函数
// TODO: 获取文案高度，设置自动换行，利用 dom 计算高度
// function getTextHeight(text: string, font: string): number {
//   const span = document.createElement('span');
//   span.textContent = text;
//   span.style.font = font;

//   const range = document.createRange();
//   range.selectNodeContents(span);

//   const rect = range.getBoundingClientRect();
//   const height = rect.height;

//   return height;
// }

// 获取文案高度，自动换行，利用 dom 计算高度
export const getHtmlTextHeight = ({ rows, style, rowsLength, className }: {
  rows: string[];
  style: h.JSX.CSSProperties;
  rowsLength: number;
  className: string;
}) => {
  const dom = document.createElement('div');
  dom.style.fontSize = `${style.fontSize}`;
  dom.style.width = `${style.width}`;
  dom.className = className;
  dom.style.lineHeight = `${style.lineHeight}`;
  dom.style.padding = `${style.padding}`;
  if (style.fontFamily) {
    dom.style.fontFamily = `${style.fontFamily}`;
  }
  if (rowsLength > 1) {
    rows.forEach(row => {
      const rowDom = document.createElement('div');
      rowDom.textContent = row;
      dom.appendChild(rowDom);
    });
  } else {
    dom.textContent = `${rows}`;
  }
  document.body.appendChild(dom);
  const height = dom.clientHeight;
  document.body.removeChild(dom);
  return height;
};

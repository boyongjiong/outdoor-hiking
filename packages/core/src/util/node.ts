import { h } from 'preact';
import { forEach, pick } from 'lodash';
import LogicFlow from '../LogicFlow';
import { BaseNodeModel } from '../model';

// Node 节点工具函数
// 从用户传入的数据中，获取规范的节点初始化数据
export const pickNodeConfig = (data: LogicFlow.NodeConfig) => {
  const nodeData = pick(data, [
    'id',
    'type',
    'x',
    'y',
    'text',
    'properties',
    'virtual',
  ]);
  return nodeData;
}

// Anchor 节点相关工具函数
export const distance = (
  x1: number, y1: number, x2: number, y2: number
): number => Math.hypot(x1 - x2, y1 - y2);

// 获取所有锚点
export const getAnchors = (node: BaseNodeModel): LogicFlow.Point[] => {
  const { anchors } = node;
  return anchors;
};

export const getClosestAnchor = (position: LogicFlow.Point, node: BaseNodeModel): BaseNodeModel.AnchorInfo => {
  const anchors = getAnchors(node);
  let closest
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
};

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

import { createElement as h } from 'preact/compat'
import { forEach, pick } from 'lodash'
import { LogicFlow } from '../LogicFlow'
import { SegmentDirection } from '../constant'
import {
  BaseNodeModel,
  CircleNodeModel,
  GraphModel,
  Model,
  RectNodeModel,
} from '../model'
import Point = LogicFlow.Point
import Direction = LogicFlow.Direction
import NodeBBox = BaseNodeModel.NodeBBox
import RadiusCircleInfo = LogicFlow.RadiusCircleInfo
import ConnectRuleResult = LogicFlow.ConnectRuleResult

/*********************************************************
 * Node 节点工具函数
 ********************************************************/
// 从用户传入的数据中，获取规范的节点初始化数据
export const pickNodeConfig = (
  data: LogicFlow.NodeConfig | LogicFlow.NodeData,
): LogicFlow.NodeConfig => {
  // @ts-ignore
  return pick(data, [
    'id',
    'type',
    'x',
    'y',
    'text',
    'properties',
    'virtual',
    'rotate',
  ])
}

// 判断点与 BBox 中心点连线的方向：返回水平 or 垂直
export const getPointDirection = (point: Point, bBox: NodeBBox): Direction => {
  const dx = Math.abs(point.x - bBox.centerX)
  const dy = Math.abs(point.y - bBox.centerY)
  return dx / bBox.width > dy / bBox.height
    ? SegmentDirection.HORIZONTAL
    : SegmentDirection.VERTICAL
}

// 根据 offset 获取节点的 BBox
export const getNodeBBox = (
  node: BaseNodeModel,
  offset: number = 0,
): BaseNodeModel.NodeBBox => {
  const { x, y, width, height } = node
  return {
    x,
    y,
    minX: x - width / 2 - offset,
    minY: y - height / 2 - offset,
    maxX: x + width / 2 + offset,
    maxY: y + height / 2 + offset,
    centerX: x,
    centerY: y,
    width: width + 2 * offset,
    height: height + 2 * offset,
  }
}

/**
 * 计算节点 originBBox 上与锚点与边垂直的直线与外层 expandBBox 的交点
 * @param expandBBox 节点原 BBox
 * @param originBBox 节点 offset 后的 BBox
 * @param point 节点的锚点坐标
 */
export const getPointOnExpandBBox = (
  expandBBox: BaseNodeModel.NodeBBox,
  originBBox: BaseNodeModel.NodeBBox,
  point: LogicFlow.Point,
): LogicFlow.Point => {
  // https://github.com/didi/LogicFlow/issues/817
  // 没有修复前传入的参数bbox实际是expendBBox
  // 由于pointDirection使用的是 dx / bbox.width > dy / bbox.height 判定方向
  // 此时的 bbox.width 是增加了 offset 后的宽度，bbox.height 同理
  // 这导致了部分极端情况(宽度很大或者高度很小)，计算出来的方向错误
  const direction = getPointDirection(point, originBBox)
  if (direction === SegmentDirection.HORIZONTAL) {
    return {
      x: point.x > expandBBox.centerX ? expandBBox.maxX : expandBBox.minX,
      y: point.y,
    }
  }
  return {
    x: point.x,
    y: point.y > expandBBox.centerY ? expandBBox.maxY : expandBBox.minY,
  }
}

const calcNodeBBox = (
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
): NodeBBox => {
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const width = maxX - minX
  const height = maxY - minY

  return {
    x: centerX,
    y: centerY,
    width,
    height,
    minX,
    minY,
    maxX,
    maxY,
    centerX,
    centerY,
  }
}

/**
 * 计算多个节点且 offset 为某个值的 BBox 信息，该函数用处
 * 1. 获取起始终点相邻点的 BBox
 * 2. polylineEdge, bezierEdge, 获取 outline 边框，这种情况下传入 offset
 * @param points 节点数组
 * @param offset 边距
 */
export const getBBoxOfPoints = (
  points: Point[],
  offset: number = 0,
): NodeBBox => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const point of points) {
    minX = Math.min(minX, point.x) - offset
    maxX = Math.max(maxX, point.x) + offset
    minY = Math.min(minY, point.y) - offset
    maxY = Math.max(maxY, point.y) + offset
  }

  return calcNodeBBox(minX, maxX, minY, maxY)
}

/**
 * 计算 BBox 的顶点坐标数组
 * @param bBox
 */
export const getVerticesOfBBox = (bBox: NodeBBox): Point[] => {
  const { minX, maxX, minY, maxY } = bBox
  return [
    {
      x: minX,
      y: minY,
    },
    {
      x: maxX,
      y: minY,
    },
    {
      x: maxX,
      y: maxY,
    },
    {
      x: minX,
      y: maxY,
    },
  ]
}

/**
 * 获取包围 2 个 BBox的最外层 BBox
 * @param b1 NodeBBox
 * @param b2 NodeBBox
 */
export const mergeBBox = (b1: NodeBBox, b2: NodeBBox): NodeBBox => {
  const minX = Math.min(b1.minX, b2.minX)
  const maxX = Math.max(b1.maxX, b2.maxX)
  const minY = Math.min(b1.minY, b2.minY)
  const maxY = Math.max(b1.maxY, b2.maxY)

  return calcNodeBBox(minX, maxX, minY, maxY)
}

/**
 * 判断一个坐标是否在某个 BBox 范围内
 * @param point 节点坐标
 * @param bBox BoundingBox
 * @param offset
 */
export const isWithinBBox = (
  point: Point,
  bBox: NodeBBox,
  offset: number = 0,
): boolean => {
  return (
    point.x >= bBox.minX - offset &&
    point.x <= bBox.maxX + offset &&
    point.y >= bBox.minY - offset &&
    point.y <= bBox.maxY + offset
  )
}

// 判断节点是否在节点范围内
export const isInNodeBBox = (
  position: LogicFlow.Point,
  targetNode: BaseNodeModel,
  offset: number = 0,
): boolean => {
  const bBox = getNodeBBox(targetNode, offset)
  return isWithinBBox(position, bBox, offset)
}

// 判断一个线段是否在节点包围框内
export const isSegmentInNodeBBox = (
  line: LogicFlow.LineSegment,
  node: BaseNodeModel,
  offset: number = 0,
): boolean => {
  const { start, end } = line
  const bBox = getNodeBBox(node, offset)
  return isWithinBBox(start, bBox, offset) && isWithinBBox(end, bBox, offset)
}

// 判断线段是否与节点相交
export const isSegmentCrossNode = (
  line: LogicFlow.LineSegment,
  node: BaseNodeModel,
): boolean => {
  const { start, end } = line
  // 线段在节点内部
  const bothInNodeBBox = isSegmentInNodeBBox(line, node)
  // 判断线段的两个点，各自是否在节点内部
  const isStartInNodeBBox = isInNodeBBox(start, node)
  const isEndInNodeBBox = isInNodeBBox(end, node)

  // 有且只有一个点在节点内部时，线段与节点相交
  return !bothInNodeBBox && (isStartInNodeBBox || isEndInNodeBBox)
}

// 判断两条线段是否相交
export const areSegmentsIntersected = (
  line1: LogicFlow.LineSegment,
  line2: LogicFlow.LineSegment,
): boolean => {
  const { start: p1, end: q1 } = line1
  const { start: p2, end: q2 } = line2

  // 通过叉积法判断线段是否相交
  function crossProduct(p: Point, q: Point): number {
    return p.x * q.y - p.y * q.x
  }

  const d1 = crossProduct(
    { x: q1.x - p1.x, y: q1.y - p1.y },
    { x: p2.x - p1.x, y: p2.y - p1.y },
  )
  const d2 = crossProduct(
    { x: q1.x - p1.x, y: q1.y - p1.y },
    { x: q2.x - p1.x, y: q2.y - p1.y },
  )
  const d3 = crossProduct(
    { x: q2.x - p2.x, y: q2.y - p2.y },
    { x: p1.x - p2.x, y: p1.y - p2.y },
  )
  const d4 = crossProduct(
    { x: q2.x - p2.x, y: q2.y - p2.y },
    { x: q1.x - p2.x, y: q1.y - p2.y },
  )

  return d1 * d2 < 0 && d3 * d4 < 0
}

export const calcIntersectionOfLine = (
  line1: LogicFlow.LineSegment,
  line2: LogicFlow.LineSegment,
): Point | null => {
  const { start: p1, end: q1 } = line1
  const { start: p2, end: q2 } = line2

  const determinant =
    (q2.y - p2.y) * (q1.x - p1.x) - (q2.x - p2.x) * (q1.y - p1.y)

  if (determinant === 0) {
    return null // 线段平行，无交点
  }

  const ua =
    ((q2.x - p2.x) * (p1.y - p2.y) - (q2.y - p2.y) * (p1.x - p2.x)) /
    determinant
  const ub =
    ((q1.x - p1.x) * (p1.y - p2.y) - (q1.y - p1.y) * (p1.x - p2.x)) /
    determinant

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    const intersectionX = p1.x + ua * (q1.x - p1.x)
    const intersectionY = p1.y + ua * (q1.y - p1.y)
    return { x: intersectionX, y: intersectionY }
  }

  return null // 线段未相交
}

// 计算线段与矩形相交点的坐标
export const getSegmentCrossPointOfRect = (
  line: LogicFlow.LineSegment,
  node: BaseNodeModel,
): Point | null => {
  const bBox = getNodeBBox(node)
  const points = getVerticesOfBBox(bBox)

  const pointsCount = points.length
  let crossSegment

  for (let i = 0; i < pointsCount; i++) {
    const currSegment = {
      start: points[i],
      end: points[(i + 1) % pointsCount],
    }
    const isCross = areSegmentsIntersected(line, currSegment)
    if (isCross) {
      crossSegment = currSegment
    }
  }

  if (crossSegment) {
    return calcIntersectionOfLine(line, crossSegment)
  }

  return null
}

// 计算 BBox 内一个点与 BBox 水平、垂直方向上相交的四个点坐标
export const getCrossPointsOfBBox = (point: Point, bBox: NodeBBox): Point[] => {
  if (!isWithinBBox(point, bBox)) {
    return []
  }
  const { x, y } = point
  return [
    {
      x,
      y: bBox.minY,
    },
    {
      x,
      y: bBox.maxY,
    },
    {
      x: bBox.minX,
      y,
    },
    {
      x: bBox.maxX,
      y,
    },
  ]
}

/**
 * 判断两个 BBox 是否重叠
 * @param bBox1
 * @param bBox2
 */
export const isBBoxOverlapping = (
  bBox1: NodeBBox,
  bBox2: NodeBBox,
): boolean => {
  return (
    Math.abs(bBox1.centerX - bBox2.centerX) * 2 < bBox1.width + bBox2.width &&
    Math.abs(bBox1.centerY - bBox2.centerY) * 2 < bBox1.height + bBox2.height
  )
}

// 对比两个节点的层级
const isNodeHigher = (
  node1: BaseNodeModel,
  node2: BaseNodeModel,
  graphModel: GraphModel,
): boolean => {
  const { id: id1, zIndex: zIndex1 } = node1
  const { id: id2, zIndex: zIndex2 } = node2

  if (zIndex1 > zIndex2) {
    return true
  }
  return graphModel.nodesMap[id1].index > graphModel.nodesMap[id2].index
}

// 手动连接边时，获取目标节点的信息：目标节点、目标节点的锚点 index 以及坐标
export type TargetNodeInfo = {
  node: BaseNodeModel
  anchorIndex: number
  anchor: Model.AnchorConfig
}
// 获取目标节点信息
export const getTargetNodeInfo = (
  position: LogicFlow.Point,
  graphModel: GraphModel,
): TargetNodeInfo | undefined => {
  const { nodes } = graphModel
  let nodeInfo: TargetNodeInfo | undefined
  for (let i = 0; i < nodes.length; i++) {
    const targetNode = nodes[i]
    const isInNode = isInNodeBBox(position, targetNode, 5)

    if (isInNode) {
      const anchorInfo = targetNode.getTargetAnchor(position)
      if (anchorInfo) {
        const currentNodeInfo: TargetNodeInfo = {
          node: targetNode,
          anchorIndex: anchorInfo.index,
          anchor: anchorInfo.anchor,
        }
        if (!nodeInfo || isNodeHigher(targetNode, nodeInfo.node, graphModel)) {
          nodeInfo = currentNodeInfo
        }
      }
    }
  }
  return nodeInfo
}

/*********************************************************
 * Anchor 节点锚点相关工具函数
 ********************************************************/
export const distance = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number => Math.hypot(x1 - x2, y1 - y2)

// 获取所有锚点
export const getAnchors = (node: BaseNodeModel): LogicFlow.Point[] => {
  const { anchors } = node
  return anchors
}

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
  let { x, y } = node
  const { width, height } = node
  const { x: px, y: py } = point
  if (px > x) {
    x = x + width / 2
  } else if (px < x) {
    x = x - width / 2
  }

  if (py > y) {
    y = y + height / 2
  } else if (py < y) {
    y = y - height / 2
  }

  return { x, y }
}

/**
 * 获取节点离某个坐标最近的锚点
 * @param position
 * @param node
 */
export const getClosestAnchor = (
  position: LogicFlow.Point,
  node: BaseNodeModel,
): BaseNodeModel.AnchorInfo | undefined => {
  const anchors = getAnchors(node)
  if (anchors?.length > 0) {
    let closest = {
      index: 0,
      anchor: anchors[0],
    }
    let minDistance = Number.MAX_SAFE_INTEGER
    forEach(anchors, (anchor, idx) => {
      const len = distance(position.x, position.y, anchor.x, anchor.y)
      if (len < minDistance) {
        minDistance = len
        closest = {
          index: idx,
          anchor: {
            ...anchor,
            x: anchor.x,
            y: anchor.y,
            id: anchor.id,
          },
        }
      }
    })

    return closest
  }
  return undefined
}

// 格式化边校验信息
export const formatConnectValidateResult = (
  result: ConnectRuleResult | boolean,
): ConnectRuleResult => {
  if (typeof result !== 'object') {
    return {
      isAllPass: result,
      msg: result ? '' : '不允许连接',
    }
  }
  return result
}

/*********************************************************
 * 各种类型节点 getCrossPoint 方法，
 * 目的：更新相交点「起点、终点」，更加贴近图形
 ********************************************************/
// 判断一个点是否在矩形边直线上
export const isInStraightLineOfRect = (
  point: Point,
  node: RectNodeModel,
): boolean => {
  let isInStraightLine = false
  const rectBBox = getNodeBBox(node)
  const { radius = 0 } = node

  if (point.y === rectBBox.minY || point.y === rectBBox.maxY) {
    isInStraightLine =
      point.x >= rectBBox.minX + radius && point.x <= rectBBox.maxX - radius
  } else if (point.x === rectBBox.minX || point.x === rectBBox.maxX) {
    isInStraightLine =
      point.y >= rectBBox.minY + radius && point.y <= rectBBox.maxY - radius
  }
  return isInStraightLine
}

// 计算 Rect 节点角
export const getRectRadiusCircle = (
  node: RectNodeModel,
): RadiusCircleInfo[] => {
  const { x, y, width, height, radius } = node
  return [
    {
      x: x - width / 2 + radius,
      y: y - height / 2 + radius,
      r: radius,
    },
    {
      x: x + width / 2 - radius,
      y: y - height / 2 + radius,
      r: radius,
    },
    {
      x: x - width / 2 + radius,
      y: y + height / 2 - radius,
      r: radius,
    },
    {
      x: x + width / 2 - radius,
      y: y + height / 2 - radius,
      r: radius,
    },
  ]
}

// 计算点正在垂直或者水平方向上与圆形的交点
export const getCrossPointWithCircle = (
  point: Point,
  direction: Direction,
  circle?: CircleNodeModel | RadiusCircleInfo,
): Point | undefined => {
  if (!circle) return
  const { x, y, r } = circle
  if (direction === SegmentDirection.HORIZONTAL) {
    // 水平，x 轴
    const crossLeft = x - Math.sqrt(r ** 2 - (point.y - y) ** 2)
    const crossRight = x + Math.sqrt(r ** 2 - (point.y - y) ** 2)
    const crossX =
      Math.abs(crossLeft - point.x) < Math.abs(crossRight - point.x)
        ? crossLeft
        : crossRight

    return {
      x: crossX,
      y: point.y,
    }
  } else if (direction === SegmentDirection.VERTICAL) {
    // 垂直，y 轴
    const crossTop = y - Math.sqrt(r ** 2 - (point.x - x) ** 2)
    const crossBottom = y + Math.sqrt(r ** 2 - (point.x - x) ** 2)
    const crossY =
      Math.abs(crossTop - point.y) < Math.abs(crossBottom - point.y)
        ? crossTop
        : crossBottom

    return {
      x: point.x,
      y: crossY,
    }
  }
}

export const getClosestRadiusCenterPoint = (
  point: Point,
  direction: Direction,
  node: RectNodeModel,
): Point | undefined => {
  const radiusCenter = getRectRadiusCircle(node)
  let closestRadius
  let minDistance = Number.MAX_SAFE_INTEGER

  forEach(radiusCenter, (radius) => {
    const radiusDistance = distance(point.x, point.y, radius.x, radius.y)
    if (radiusDistance < minDistance) {
      minDistance = radiusDistance
      closestRadius = radius
    }
  })

  return getCrossPointWithCircle(point, direction, closestRadius)
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
export const getHtmlTextHeight = ({
  rows,
  style,
  rowsLength,
  className,
}: {
  rows: string[]
  style: h.JSX.CSSProperties
  rowsLength: number
  className: string
}) => {
  const dom = document.createElement('div')
  dom.style.fontSize = `${style.fontSize}`
  dom.style.width = `${style.width}`
  dom.className = className
  dom.style.lineHeight = `${style.lineHeight}`
  dom.style.padding = `${style.padding}`
  if (style.fontFamily) {
    dom.style.fontFamily = `${style.fontFamily}`
  }
  if (rowsLength > 1) {
    rows.forEach((row) => {
      const rowDom = document.createElement('div')
      rowDom.textContent = row
      dom.appendChild(rowDom)
    })
  } else {
    dom.textContent = `${rows}`
  }
  document.body.appendChild(dom)
  const height = dom.clientHeight
  document.body.removeChild(dom)
  return height
}

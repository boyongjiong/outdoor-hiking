import { filter, forEach, map, pick, sortBy, uniqWith } from 'lodash'
import { LogicFlow } from '../LogicFlow'
import { BaseNodeModel, BezierEdgeModel, GraphModel } from '../model'
import {
  getPointOnExpandBBox,
  getNodeBBox,
  isBBoxOverlapping,
  getBBoxOfPoints,
  mergeBBox,
  getVerticesOfBBox,
  getCrossPointsOfBBox,
  isWithinBBox,
} from './node'
import { Options } from '../options'
import { SegmentDirection } from '../constant'
import { arePointsEqual, aStarSearch } from '../algorithm'

import Point = LogicFlow.Point
import NodeData = LogicFlow.NodeData
import EdgeConfig = LogicFlow.EdgeConfig
import Direction = LogicFlow.Direction
import LineSegment = LogicFlow.LineSegment
import AppendAttributes = LogicFlow.AppendAttributes
import NodeBBox = BaseNodeModel.NodeBBox
import { sampleCubic } from './sampling'

// 从用户传入的数据中，获取规范的节点初始化数据
export const pickEdgeConfig = (data: LogicFlow.EdgeConfig) => {
  return pick(data, [
    'id',
    'type',
    'sourceNodeId',
    'sourceAnchorId',
    'targetNodeId',
    'targetAnchorId',
    'startPoint',
    'endPoint',
    'text',
    'pointsList',
    'zIndex',
    'properties',
  ])
}

// 计算两点之间的距离（勾股定理）
export const calcTwoPointDistance = (source: Point, target: Point): number => {
  // fix: 修复坐标存在负值时，计算错误的问题
  // const source = {
  //  x: p1.x,
  //  y: Math.abs(p1.y),
  // };
  // const target = {
  //  x: Math.abs(p2.x),
  //  y: Math.abs(p2.y),
  // };
  return Math.sqrt((source.x - target.x) ** 2 + (source.y - target.y) ** 2)
}

// 坐标字符串 转换为 坐标数组
// points string -> pintsList Point[]
// eg: '1,2 4,5 9,9' -> [{x: 1, y: 2}, {x: 4, y: 5}, {x: 9, y: 9}]
export const pointsStr2PointsList = (pointsStr: string): Point[] => {
  const positionPairList = filter(pointsStr.split(' '))
  return map(positionPairList, (pair) => {
    const [x, y] = pair.split(',')
    return {
      x: +x,
      y: +y,
    }
  })
}

// 坐标数组 转换为 坐标字符串
// pintsList Point[] -> points string
// eg: [{x: 1, y: 2}, {x: 4, y: 5}, {x: 9, y: 9}] -> '1,2 4,5 9,9'
export const pointsList2PointsStr = (pointsList: Point[]): string => {
  return map(pointsList, ({ x, y }) => `${x},${y}`).join(' ')
}

// 坐标数组 转换为 线段数组
// pointsList Point[] -> polyline LineSegment[]
// eg: [{x: 1, y: 2}, {x: 4, y: 5}, {x: 9, y: 9}] -> [
//   {start: {x: 1, y: 2}, end: {x: 4, y: 5}},
//   {start: {x: 4, y: 5}, end: {x: 9, y: 9}}
// ]
export const pointsList2Polyline = (pointsList: Point[]): LineSegment[] => {
  const polyline: LineSegment[] = []
  for (let i = 0; i < pointsList.length - 1; i++) {
    polyline.push({
      start: pointsList[i],
      end: pointsList[i + 1],
    })
  }
  return polyline
}

/**
 * 判断点是否在线段上
 * @param point
 * @param segment
 */
export const isPointInSegment = (
  point: Point,
  segment: LineSegment,
): boolean => {
  const { start, end } = segment
  if (arePointsEqual(start, end)) {
    return arePointsEqual(start, point)
  }

  const { x: x1, y: y1 } = start
  const { x: x2, y: y2 } = end
  // 判断点是否在线段的范围内
  const isWithinXRange =
    point.x >= Math.min(x1, x2) && point.x <= Math.max(x1, x2)
  const isWithinYRange =
    point.y >= Math.min(y1, y2) && point.y <= Math.max(y1, y2)

  if (!isWithinXRange || !isWithinYRange) {
    return false
  }

  if (x1 === x2) {
    return Math.abs(point.x - x1) < 0.0001
  }

  // 计算线段的斜率
  const slope = (y2 - y1) / (x2 - x1)
  // 判断点是否在线段上
  return Math.abs(point.y - (slope * (point.x - x1) + y1)) < 0.0001
}

/**
 * 计算线段数组中，最长的线段信息，包括 [start, end, distance]
 * @param lineSegments
 */
export const getLongestSegment = (
  lineSegments: LineSegment[],
): [Point, Point, number] => {
  let longestDistance = 0
  let longestSegment: LineSegment | null = null

  for (let i = 0; i < lineSegments.length; i++) {
    const curLineSegment = lineSegments[i]
    const { start, end } = curLineSegment
    const distance = calcTwoPointDistance(start, end)
    if (distance > longestDistance) {
      longestDistance = distance
      longestSegment = curLineSegment
    }
  }

  if (longestSegment) {
    return [longestSegment.start, longestSegment.end, longestDistance]
  } else {
    throw new Error('No segments found.')
  }
}

export type VerticalPointOfLine = {
  leftX: number
  leftY: number
  rightX: number
  rightY: number
}
/**
 * TODO: 优化该算法并确认是否还有需要
 * 计算垂直边的与起始点有一定距离对称，连线垂直于边的点
 * @param line 待计算的线段
 * @param offset 线段方向上的距离
 * @param verticalOffset 垂直线段的距离
 * @param type 'start' | 'end' 开始还是结束点
 */
// 计算线段的 appendArea，垂直与线段的区域
export const getVerticalPointOfLine = (
  line: LineSegment,
  offset: number,
  verticalOffset: number,
  type: 'start' | 'end',
): VerticalPointOfLine => {
  const { start, end } = line
  const position = {
    leftX: 0,
    leftY: 0,
    rightX: 0,
    rightY: 0,
  }
  const angleOfHorizontal = Math.atan((end.y - start.y) / (end.x - start.x))
  // 边和两边点的夹角
  const angleOfPoints = Math.atan(offset / verticalOffset)
  // 线段的长度
  const length = Math.sqrt(verticalOffset ** 2 + offset ** 2)

  // 依托答辩？？？ 亟待优化
  if (type === 'start') {
    if (end.x >= start.x) {
      position.leftX =
        start.x + length * Math.sin(angleOfHorizontal + angleOfPoints)
      position.leftY =
        start.y - length * Math.cos(angleOfHorizontal + angleOfPoints)
      position.rightX =
        start.x - length * Math.sin(angleOfHorizontal - angleOfPoints)
      position.rightY =
        start.y + length * Math.cos(angleOfHorizontal - angleOfPoints)
    } else {
      position.leftX =
        start.x - length * Math.sin(angleOfHorizontal + angleOfPoints)
      position.leftY =
        start.y + length * Math.cos(angleOfHorizontal + angleOfPoints)
      position.rightX =
        start.x + length * Math.sin(angleOfHorizontal - angleOfPoints)
      position.rightY =
        start.y - length * Math.cos(angleOfHorizontal - angleOfPoints)
    }
  } else if (type === 'end') {
    if (end.x >= start.x) {
      position.leftX =
        end.x + length * Math.sin(angleOfHorizontal + angleOfPoints)
      position.leftY =
        end.y - length * Math.cos(angleOfHorizontal + angleOfPoints)
      position.rightX =
        end.x - length * Math.sin(angleOfHorizontal - angleOfPoints)
      position.rightY =
        end.y + length * Math.cos(angleOfHorizontal - angleOfPoints)
    } else {
      position.leftX =
        end.x - length * Math.sin(angleOfHorizontal + angleOfPoints)
      position.leftY =
        end.y + length * Math.cos(angleOfHorizontal + angleOfPoints)
      position.rightX =
        end.x + length * Math.sin(angleOfHorizontal - angleOfPoints)
      position.rightY =
        end.y - length * Math.cos(angleOfHorizontal - angleOfPoints)
    }
  }

  return position
}

export const calculateOffsetPolyline = () => {}

// 边生成方法
export const createEdgeGenerator = (
  graphModel: GraphModel,
  generator?: Options.EdgeGeneratorType | unknown,
): any => {
  if (typeof generator !== 'function') {
    return (
      _sourceNode: NodeData,
      _targetNode: NodeData,
      currentEdge?: EdgeConfig,
    ) => Object.assign({ type: graphModel.edgeType }, currentEdge)
  }

  return (
    sourceNode: NodeData,
    targetNode: NodeData,
    currentEdge?: EdgeConfig,
  ) => {
    const result = generator(sourceNode, targetNode, currentEdge)
    // 若无结果，使用默认类型
    if (!result) {
      return { type: graphModel.edgeType }
    }
    if (typeof result === 'string') {
      return Object.assign({}, currentEdge, { type: result })
    }
    return Object.assign({ type: result }, currentEdge)
  }
}

/**
 * 获取字符串的字节长度
 * @param words
 */
export const getBytesLength = (words: string): number => {
  if (!words) return 0

  let totalLength = 0
  for (let i = 0; i < words.length; i++) {
    const c = words.charCodeAt(i)
    const word = words.charAt(i)

    if (word.match(/[A-Z]/)) {
      totalLength += 1.5
    } else if ((c >= 0x0001 && c <= 0x007e) || (c >= 0xff60 && c <= 0xff9f)) {
      totalLength += 1
    } else {
      totalLength += 2
    }
  }
  return totalLength
}

// 获取 Svg 标签文案高度，自动换行
export type IGetSvgTextSizeParams = {
  rows: string[]
  rowsLength: number
  fontSize: number
}
export const getSvgTextSize = ({
  rows,
  rowsLength,
  fontSize,
}: IGetSvgTextSizeParams): LogicFlow.RectSize => {
  let longestBytes = 0
  forEach(rows, (row) => {
    const rowBytesLength = getBytesLength(row)
    longestBytes = rowBytesLength > longestBytes ? rowBytesLength : longestBytes
  })

  // 背景框宽度，最长一行字节数/2 * fontsize + 2
  // 背景框宽度， 行数 * fontsize + 2
  return {
    width: Math.ceil(longestBytes / 2) * fontSize + fontSize / 4,
    height: rowsLength * (fontSize + 2) + fontSize / 4,
  }
}

// 扩大边的可点击区域，获取边 append 信息
export const getAppendAttributes = (
  lineSegment: LineSegment,
): AppendAttributes => {
  const { start, end } = lineSegment
  let d: string = ''
  if (start.x === end.x && start.y === end.y) {
    d = ''
  } else {
    const offset = 10
    const verticalLength = 5
    const startPos = getVerticalPointOfLine(
      lineSegment,
      offset,
      verticalLength,
      'start',
    )
    const endPos = getVerticalPointOfLine(
      lineSegment,
      offset,
      verticalLength,
      'end',
    )

    d = `M${startPos.leftX} ${startPos.leftY}
      L${startPos.rightX} ${startPos.rightY}
      L${endPos.rightX} ${endPos.rightY}
      L${endPos.leftX} ${endPos.leftY} z`
  }
  return {
    d,
    fill: 'transparent',
    stroke: 'transparent',
    strokeWidth: 1,
    strokeDasharray: '4, 4',
  }
}

// Polyline Edge Utils
// 判断线段的方向
export const getLineSegmentDirection = (
  start: Point,
  end: Point,
): Direction | undefined => {
  if (start.x === end.x) {
    return SegmentDirection.VERTICAL
  } else if (start.y === end.y) {
    return SegmentDirection.HORIZONTAL
  }
}

/**
 * 计算简单场景下折线的点 （理论上这种场景下）
 * @param start
 * @param end
 * @param sExpandPoint Source Expand Point 源节点 BBox 点
 * @param tExpandPoint Target Expand Point  目标节点 BBox 点
 */
export const getSimplePoints = (
  start: Point,
  end: Point,
  sExpandPoint: Point,
  tExpandPoint: Point,
): Point[] => {
  const points: Point[] = []
  // start, sExpandPoint 连线的方向，水平或垂直，即路径第一条线段的方向
  const startDirection = getLineSegmentDirection(start, sExpandPoint)
  // end, tExpandPoint 连线的方向，水平或垂直，即路径的最后一条线段的方向
  const endDirection = getLineSegmentDirection(end, tExpandPoint)
  // 根据两条线段的方向做了计算，调整线段经验所得，非严格最优计算，能保证不出现折线

  if (startDirection === endDirection) {
    // 方向相同，添加两个点，两条平行线垂直距离一般的两个端点
    if (start.y === sExpandPoint.y) {
      points.push({
        x: sExpandPoint.x,
        y: (sExpandPoint.y + tExpandPoint.y) / 2,
      })
      points.push({
        x: tExpandPoint.x,
        y: (sExpandPoint.y + tExpandPoint.y) / 2,
      })
    } else {
      points.push({
        x: (sExpandPoint.x + tExpandPoint.x) / 2,
        y: sExpandPoint.y,
      })
      points.push({
        x: (sExpandPoint.x + tExpandPoint.x) / 2,
        y: tExpandPoint.y,
      })
    }
  } else {
    // 方向不同，添加一个点，保证不在当前线段上（会出现重合），且不能有折线
    let point: Point = {
      x: sExpandPoint.x,
      y: tExpandPoint.y,
    }
    const isInStart = isPointInSegment(point, {
      start,
      end: sExpandPoint,
    })
    const isInEnd = isPointInSegment(point, {
      start: tExpandPoint,
      end,
    })
    if (isInStart || isInEnd) {
      point = {
        x: tExpandPoint.x,
        y: sExpandPoint.y,
      }
    }
    // TODO: 确认是否需要原先 else 的代码逻辑，通过分析后感觉没必要，暂时先不加
    points.push(point)
  }

  return points
}

// TODO: 折线连线功能待优化
export const getPolylinePoints = (
  start: Point,
  end: Point,
  sourceNode: BaseNodeModel,
  targetNode: BaseNodeModel,
  offset: number,
): Point[] => {
  const sourceNodeBBox = getNodeBBox(sourceNode)
  const targetNodeBBox = getNodeBBox(targetNode)

  const sourceNodeExpandBBox = getNodeBBox(sourceNode, offset)
  const targetNodeExpandBBox = getNodeBBox(targetNode, offset)

  const sourceExpandPoint = getPointOnExpandBBox(
    sourceNodeExpandBBox,
    sourceNodeBBox,
    start,
  )
  const targetExpandPoint = getPointOnExpandBBox(
    targetNodeExpandBBox,
    targetNodeBBox,
    end,
  )
  console.log(
    'zzZ. ...',
    isBBoxOverlapping(sourceNodeExpandBBox, targetNodeExpandBBox),
  )
  console.log('sourceNodeExpandBBox', sourceNodeExpandBBox)
  console.log('targetNodeExpandBBox', targetNodeExpandBBox)
  // 当加上 offset 后的 box 有重合，直接简单计算节点
  if (isBBoxOverlapping(sourceNodeExpandBBox, targetNodeExpandBBox)) {
    console.log('zzZ. ...')

    const points = getSimplePoints(
      start,
      end,
      sourceExpandPoint,
      targetExpandPoint,
    )
    return [start, sourceExpandPoint, ...points, targetExpandPoint, end]
  }

  // 复杂场景，节点数量增多，位置关系复杂时，会出现大量边和节点交叉和重合的现象，下面则处理这种场景
  // https://docs.logic-flow.cn/docs/#/zh/article/article03?id=%e7%9b%b4%e8%a7%92%e6%8a%98%e7%ba%bf
  const lineSegmentBBox = getBBoxOfPoints([
    sourceExpandPoint,
    targetExpandPoint,
  ])
  const sourceMixBBox = mergeBBox(sourceNodeExpandBBox, lineSegmentBBox)
  const targetMixBBox = mergeBBox(targetNodeExpandBBox, lineSegmentBBox)

  let points: Point[] = []
  points = [...points, ...getVerticesOfBBox(sourceMixBBox)]
  points = [...points, ...getVerticesOfBBox(targetMixBBox)]

  // 中心点坐标
  // TODO: 确认该点是否有问题，原代码取 start/end 的终点，按照设计，应该去 sourceExpandPoint 和 targetExpandPoint 的中点
  const centerPoint = {
    x: (sourceExpandPoint.x + targetExpandPoint.x) / 2,
    y: (sourceExpandPoint.y + targetExpandPoint.y) / 2,
  }

  // 获取中心点与上面几个 BBox 的交点
  forEach([lineSegmentBBox, sourceMixBBox, targetMixBBox], (bBox: NodeBBox) => {
    const crossPoints = getCrossPointsOfBBox(centerPoint, bBox)
    points = [
      ...points,
      ...filter(
        crossPoints,
        (p) =>
          !isWithinBBox(p, sourceNodeExpandBBox) &&
          !isWithinBBox(p, targetNodeExpandBBox),
      ),
    ]
  })

  // 将 sourceExpandPoint 和 targetExpandPoint 轴对称的两个点做判断后添加到 points 中
  forEach(
    [
      {
        x: sourceExpandPoint.x,
        y: targetExpandPoint.y,
      },
      {
        x: targetExpandPoint.x,
        y: sourceExpandPoint.y,
      },
    ],
    (p: Point) => {
      if (
        !isWithinBBox(p, sourceNodeExpandBBox) &&
        !isWithinBBox(p, targetNodeExpandBBox)
      ) {
        points.push(p)
      }
    },
  )

  points.unshift(sourceExpandPoint)
  points.push(targetExpandPoint)
  // 当前找到的点 去重 TODO: 确认是否需要排序
  points = sortBy(uniqWith(points, arePointsEqual), 'x')

  console.log('points', points)
  // TODO: 根据当前所有的点，得到所有节点相连的边

  // 路径查找
  const pathPoints = aStarSearch(
    points,
    sourceExpandPoint,
    targetExpandPoint,
    sourceNode,
    targetNode,
  )

  console.log('pathPoints', pathPoints)

  if (pathPoints) {
    // 删除一条线上多余的点
    pathPoints?.unshift(start)
    pathPoints?.push(end)

    return pathPoints
  }

  return []

  // TODO: 后续补充西面优化方法，1. 移除线段上多余的中间点；2. 所有节点去重
  // 删除计算后点中位于同一条直线上的重复点位
  // if (pathPoints.length > 2) {
  //   pathPoints = pointFilter(pathPoints)
  // }
  //
  // return filterRepeatPoints(pathPoints)
}

// Bezier Edge Utils
export const getBezierControlPoints = (
  start: Point,
  end: Point,
  sourceNode: BaseNodeModel,
  targetNode: BaseNodeModel,
  offset?: number,
): BezierEdgeModel.IBezierControls => {
  const sBBox = getNodeBBox(sourceNode)
  const tBBox = getNodeBBox(targetNode)

  const sExpandBBox = getNodeBBox(sourceNode, offset)
  const tExpandBBox = getNodeBBox(targetNode, offset)

  const sNext = getPointOnExpandBBox(sExpandBBox, sBBox, start)
  const ePre = getPointOnExpandBBox(tExpandBBox, tBBox, end)
  return { sNext, ePre }
}

// 根据 bezier 曲线 path 求出 Point 坐标
export const getBezierPoint = (positionStr: string): Point => {
  const [x, y] = positionStr.replace(/(^\s*)/g, '').split(' ')
  return {
    x: +x,
    y: +y,
  }
}

// 根据 bezier 曲线的 path 求出 points
export const getBezierPoints = (
  path: string,
): BezierEdgeModel.IBezierPoints => {
  const list = path.replace(/M/g, '').replace(/C/g, ',').split(',')
  const start = getBezierPoint(list[0])
  const sNext = getBezierPoint(list[1])
  const ePre = getBezierPoint(list[2])
  const end = getBezierPoint(list[3])

  return { start, sNext, ePre, end }
}

// 根据 bezier 曲线 path 求出结束切线的两点坐标
export const getEndTangent = (pointsList: Point[], offset: number): Point[] => {
  const [p1, cp1, cp2, p2] = pointsList
  const start = sampleCubic(p1, cp1, cp2, p2, offset)
  return [start, pointsList[3]]
}

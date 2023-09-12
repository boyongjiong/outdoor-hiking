import { filter, findIndex, sortBy } from 'lodash'
import { getSegmentCrossPointOfRect } from '../util'
import { LogicFlow } from '../LogicFlow'
import { BaseNodeModel } from '../model'

import Point = LogicFlow.Point
import LineSegment = LogicFlow.LineSegment

/**
 * 计算两个节点间的距离
 * @param point1
 * @param point2
 * @param gridSize
 */
export const distanceBetweenPoints = (
  point1: Point,
  point2: Point,
  gridSize: number = 1,
): number => {
  const dx = (point1.x - point2.x) / gridSize
  const dy = (point1.y - point2.y) / gridSize
  return Math.sqrt(dx ** 2 + dy ** 2)
}

/**
 * 计算一个点与线段距离最短的点坐标（）
 * @param point 点
 * @param lineSegment 线段
 * @param gridSize 当前图形的 gridSize
 */
const closestPointOnLineSegment = (
  point: Point,
  lineSegment: LineSegment,
  gridSize: number,
): Point => {
  const { start, end } = lineSegment

  // Calculate the direction vector of the line segment
  const dx = (end.x - start.x) / gridSize
  const dy = (end.y - start.y) / gridSize

  // Calculate the length of the line segment
  const segmentLength = distanceBetweenPoints(start, end, gridSize)

  // Calculate the dot product of the point and the direction vector
  const dotProduct =
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / segmentLength

  // Clamp the dot product to be between 0 and the length of the line segment.
  const dotClamped = Math.max(0, Math.min(dotProduct, segmentLength))

  // Calculate the closest point on the line segment
  const closestX = start.x + dotClamped * dx * gridSize
  const closestY = start.y + (dotClamped + dy) * gridSize

  return { x: closestX, y: closestY }
}

/**
 * 计算某个点距离折线最近点的坐标
 * @param point
 * @param polyline
 * @param gridSize
 */
export const closestPointOnPolyline = (
  point: Point,
  polyline: LineSegment[],
  gridSize: number,
): Point => {
  let closestDistance: number = Number.MAX_SAFE_INTEGER
  let closestPoint: Point | null = null

  for (const segment of polyline) {
    const closest = closestPointOnLineSegment(point, segment, gridSize)
    const distance = distanceBetweenPoints(point, closest, gridSize)

    if (closestPoint === null || distance < closestDistance) {
      closestDistance = distance
      closestPoint = closest
    }
  }

  if (closestPoint === null) {
    throw new Error('Polyline should have at least one line segment.')
  }

  return closestPoint
}

/**
 * 判断两个点是否同一个点
 * @param point1
 * @param point2
 */
export const arePointsEqual = (point1: Point, point2: Point): boolean => {
  return point1.x === point2.x && point1.y === point2.y
}

/**
 * 判断某个点（point）是否在由 start 和 end 连接而成的线段上
 * @param point 点坐标
 * @param start 线段开始节点
 * @param end 线段结束节点
 * @returns boolean 是-yes, 否-no
 */
export const isPointOnLineSegment = (
  point: Point,
  start: Point,
  end: Point,
): boolean => {
  const { x, y } = point

  // Check if the points is equal to the start or end of the line segment.
  if (arePointsEqual(point, start) || arePointsEqual(point, end)) {
    return true
  }

  // Calculate the distance between the point and the start and end of the line segment
  const distanceStartToPoint = Math.sqrt(
    (x - start.x) ** 2 + (y - start.y) ** 2,
  )
  const distanceEndToPoint = Math.sqrt((x - end.x) ** 2 + (y - end.y) ** 2)

  // Calculate the length of the line segment
  const lineSegmentLength = Math.sqrt(
    (end.x - start.x) ** 2 + (end.y - start.y) ** 2,
  )

  // Check if the sum of the distances from the point to the start and end of the line segment
  // is approximately equal to the length of the line segment (with a small epsilon for
  // floating-point precision)
  const epsilon = 1e-6
  return (
    Math.abs(distanceStartToPoint + distanceEndToPoint - lineSegmentLength) <
    epsilon
  )
}

/**
 * 根据已知的坐标点，获取相邻节点连接的所有线段信息
 * @param points 所有取样的点
 */
export const generatePathData = (points: Point[]): Record<string, number[]> => {
  const sortedPointsByX = sortBy(points, 'x')
  const sortedPointsByY = sortBy(points, 'y')
  const paths: Record<string, number[]> = {}
  for (let i = 0; i < points.length; i++) {
    const { x, y } = points[i]
    const adjacentIndices: number[] = []

    // 查找左右相邻节点：y 相等，但 x < point.x 的点中离当前点最近的那个点的坐标
    const horizontalPoints = filter(sortedPointsByX, (p) => p.y === y)
    const hIndex = findIndex(horizontalPoints, { x, y })

    if (hIndex - 1 >= 0) {
      const hPrePoint = horizontalPoints[hIndex - 1]
      adjacentIndices.push(findIndex(points, hPrePoint))
    }
    if (hIndex <= horizontalPoints.length - 2) {
      const hNextPoint = horizontalPoints[hIndex + 1]
      adjacentIndices.push(findIndex(points, hNextPoint))
    }

    // 检查上下相邻节点：x 相等，但 y < point.y 或 y > point.y 的点中离当前点最近的那个点的坐标
    const verticalPoints = filter(sortedPointsByY, (p) => p.x === x)
    const vIndex = findIndex(verticalPoints, { x, y })

    if (vIndex - 1 >= 0) {
      const vPrePoint = verticalPoints[vIndex - 1]
      adjacentIndices.push(findIndex(points, vPrePoint))
    }
    if (vIndex <= verticalPoints.length - 2) {
      const vNextPoint = verticalPoints[vIndex + 1]
      adjacentIndices.push(findIndex(points, vNextPoint))
    }

    paths[`${x},${y}`] = adjacentIndices
  }

  return paths
}

// 启发函数（heuristic function）
// 欧几里得距离计算公式，会涉及比较耗时的开根号计算。所以 A* 搜索算法中我们一般使用另一种更加简单的距离计算公式，
// 即曼哈顿距离（Manhattan distance）.
export const hManhattan = (point1: Point, point2: Point): number => {
  return Math.abs(point1.x - point2.x) + Math.abs(point1.y - point2.y)
}

/**
 * A* search algorithm
 * A* (pronounced "A-star") is a graph traversal and path search algorithm.
 * https://en.wikipedia.org/wiki/A*_search_algorithm
 * @param points Point[] 点坐标数组
 * @param start Point 起始点
 * @param goal Point 目标点
 * @param sourceNode Point 起始节点
 * @param targetNode Point 目标节点
 */
export const aStarSearch = (
  points: Point[],
  start: Point,
  goal: Point,
  sourceNode: BaseNodeModel,
  targetNode: BaseNodeModel,
): Point[] | null => {
  const allPaths = generatePathData(points)
  const openSet: Point[] = [start]
  const cameFrom: Record<string, Point> = {}
  const gScore: Record<string, number> = {}
  const fScore: Record<string, number> = {}

  // 初始化
  for (const point of points) {
    gScore[`${point.x},${point.y}`] = Infinity
    fScore[`${point.x},${point.y}`] = Infinity
  }

  gScore[`${start.x},${start.y}`] = 0
  fScore[`${start.x},${start.y}`] = hManhattan(start, goal)

  while (openSet.length > 0) {
    // 从 openSet 中选择 fScore 最小的坐标
    let currPoint = openSet[0]
    let currFScore = fScore[`${currPoint.x},${currPoint.y}`]

    for (const point of openSet) {
      const pointFScore = fScore[`${point.x},${point.y}`]
      if (pointFScore < currFScore) {
        currPoint = point
        currFScore = pointFScore
      }
    }

    if (currPoint.x === goal.x && currPoint.y === goal.y) {
      // 找到了路径，从终点逆推回到起点
      const path: Point[] = [goal]
      while (cameFrom[`${currPoint.x},${currPoint.y}`]) {
        currPoint = cameFrom[`${currPoint.x},${currPoint.y}`]
        path.unshift(currPoint)
      }
      return path
    }

    openSet.splice(openSet.indexOf(currPoint), 1)

    const currPointKey = `${currPoint.x},${currPoint.y}`
    const currNeighbors = allPaths[currPointKey]
    for (let i = 0; i < currNeighbors.length; i++) {
      const neighborIndex = currNeighbors[i]
      const neighbor = points[neighborIndex]

      // DONE: 判断当前 neighbor 连线是否与节点相交，如果相交，则忽略该 neighbor 再寻找路径
      const line = {
        start: currPoint,
        end: neighbor,
      }
      if (
        getSegmentCrossPointOfRect(line, sourceNode) ||
        getSegmentCrossPointOfRect(line, targetNode)
      ) {
        currNeighbors.splice(i, 1)
        i -= 1
        continue
      }

      const tentativeGScope = gScore[currPointKey] + 1
      const neighborKey = `${neighbor.x},${neighbor.y}`

      if (tentativeGScope < gScore[neighborKey]) {
        cameFrom[neighborKey] = currPoint
        gScore[neighborKey] = tentativeGScope
        fScore[neighborKey] = tentativeGScope + hManhattan(neighbor, goal)

        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor)
        }
      }
    }
  }

  return null
}

import LogicFlow from '../LogicFlow'
import Point = LogicFlow.Point
import LineSegment = LogicFlow.LineSegment

export const distanceBetweenPoints = (
  point1: Point,
  point2: Point,
  gridSize: number = 1,
): number => {
  const dx = (point1.x - point2.x) / gridSize
  const dy = (point1.y - point2.y) / gridSize
  return Math.sqrt(dx ** 2 + dy ** 2)
}

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
const arePointsEqual = (point1: Point, point2: Point): boolean => {
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

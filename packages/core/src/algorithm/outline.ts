import {
  BaseEdgeModel,
  BaseNodeModel,
  BezierEdgeModel,
  LineEdgeModel,
  PolylineEdgeModel,
} from '../model'
import { getBBoxOfPoints, pointsStr2PointsList } from '../util'
import { ModelType } from '../constant'

export type ElementInfo = {
  x: number
  y: number
  width: number
  height: number
}
export type OutlineData = {
  x: number
  y: number
  x1: number
  y1: number
}

export const calcOutline = ({
  x,
  y,
  width,
  height,
}: ElementInfo): OutlineData => ({
  x: x - width / 2,
  y: y - height / 2,
  x1: x + width / 2,
  y1: y + height / 2,
})

// 获取节点的 outline
export const getNodeOutline = ({
  x,
  y,
  width,
  height,
}: BaseNodeModel): OutlineData => calcOutline({ x, y, width, height })

// 获取 Line 的 Outline
export const getLineOutline = (edge: LineEdgeModel) => {
  const { startPoint, endPoint } = edge
  const x = (startPoint.x + endPoint.x) / 2
  const y = (startPoint.y + endPoint.y) / 2
  const width = Math.abs(startPoint.x - endPoint.x) + 10
  const height = Math.abs(startPoint.y - endPoint.y) + 10

  return calcOutline({ x, y, width, height })
}

// 获取 Polyline 的 Outline
export const getPolylineOutline = (edge: PolylineEdgeModel) => {
  const { points } = edge
  const pointsList = pointsStr2PointsList(points)
  const { x, y, width, height } = getBBoxOfPoints(pointsList, 8)

  return calcOutline({ x, y, width, height })
}

// 获取 BezierLine 的 Outline
export const getBezierOutline = (edge: BezierEdgeModel) => {
  const { points } = edge
  const pointsList = pointsStr2PointsList(points)
  const { x, y, width, height } = getBBoxOfPoints(pointsList, 8)

  return calcOutline({ x, y, width, height })
}

export const getEdgeOutline = (edge: BaseEdgeModel) => {
  if (edge.modelType === ModelType.LINE_EDGE) {
    return getLineOutline(edge as LineEdgeModel)
  }
  if (edge.modelType === ModelType.POLYLINE_EDGE) {
    return getPolylineOutline(edge as PolylineEdgeModel)
  }
  if (edge.modelType === ModelType.BEZIER_EDGE) {
    return getBezierOutline(edge as BezierEdgeModel)
  }
}

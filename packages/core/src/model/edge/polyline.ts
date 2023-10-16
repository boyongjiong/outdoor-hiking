import { action, observable } from 'mobx'
import { assign, cloneDeep, forEach, map, take, takeRight } from 'lodash'
import { BaseEdgeModel } from './base'
import { ModelType, SegmentDirection } from '../../constant'
import { LogicFlow } from '../../LogicFlow'
import {
  formatRawData,
  getClosestRadiusCenterPoint,
  getCrossPointWithCircle,
  getLineSegmentDirection,
  getLongestSegment,
  getPolylinePoints,
  getSegmentCrossPointOfRect,
  isInNodeBBox,
  isInStraightLineOfRect,
  isSegmentCrossNode,
  isSegmentInNodeBBox,
  pointsList2PointsStr,
  pointsList2Polyline,
  pointsStr2PointsList,
} from '../../util'
import { Model } from '../base'
import { BaseNodeModel, CircleNodeModel, RectNodeModel } from '../node'
import Point = LogicFlow.Point
import AnchorConfig = Model.AnchorConfig

export class PolylineEdgeModel extends BaseEdgeModel {
  readonly modelType = ModelType.POLYLINE_EDGE
  draggingPointList?: LogicFlow.Point[]
  offset: number = 30
  @observable dbClickPosition?: LogicFlow.Point

  initEdgeData(data: LogicFlow.EdgeConfig) {
    this.offset = 30
    super.initEdgeData(data)
  }

  getData(): LogicFlow.EdgeData {
    const data = super.getData()
    const pointsList: Point[] = map(
      this.pointsList,
      ({ x, y }): Point => ({ x, y }),
    )
    return assign({}, data, { pointsList })
  }

  getEdgeStyle(): LogicFlow.EdgeTheme {
    const { polyline } = this.graphModel.theme
    const style = super.getEdgeStyle()
    return {
      ...style,
      ...cloneDeep(polyline),
    }
  }

  getTextPosition(): LogicFlow.Point {
    // 在文案为空的情况下，文案位置为双击位置
    const textValue = this.text?.value
    if (this.dbClickPosition && !textValue) {
      const { x, y } = this.dbClickPosition
      return { x, y }
    }
    const pointsList = pointsStr2PointsList(this.points)
    const lineSegments = pointsList2Polyline(pointsList)
    const [p1, p2] = getLongestSegment(lineSegments)
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    }
  }

  // 获取下一个锚点
  getNextAnchor(
    direction: LogicFlow.Direction,
    position: Point,
    anchorList: AnchorConfig[],
  ): AnchorConfig | undefined {
    let anchor
    let minDistance = Number.MAX_SAFE_INTEGER
    forEach(anchorList, (a) => {
      let distanceX
      if (direction === SegmentDirection.HORIZONTAL) {
        distanceX = Math.abs(position.y - a.y)
      } else if (direction === SegmentDirection.VERTICAL) {
        distanceX = Math.abs(position.x - a.x)
      }
      if (distanceX && minDistance > distanceX) {
        minDistance = distanceX
        anchor = a
      }
    })
    return anchor
  }

  // 获取在拖拽过程中产生的交点
  getCrossPoint(
    direction: LogicFlow.Direction,
    start: Point,
    end: Point,
  ): Point | undefined {
    if (direction === SegmentDirection.HORIZONTAL) {
      return {
        x: end.x,
        y: start.y,
      }
    } else if (direction === SegmentDirection.VERTICAL) {
      return {
        x: start.x,
        y: end.y,
      }
    }
  }

  // TODO: 确认该段代码功能，删除在图形内的多个交点
  removeCrossPoints(
    startIndex: number,
    endIndex: number,
    pointsList: Point[],
  ): Point[] {
    const tempPointList = map(pointsList, (p) => p)

    if (startIndex === 1) {
      const start = tempPointList[startIndex]
      const end = tempPointList[endIndex]
      const pre = tempPointList[startIndex - 1]
      const startNextLine: LogicFlow.LineSegment = {
        start: pre,
        end: start,
      }
      const startEndLine: LogicFlow.LineSegment = {
        start,
        end,
      }
      const isInnerNode = isSegmentInNodeBBox(startNextLine, this.targetNode)
      if (isInnerNode) {
        const isCrossNode = isSegmentCrossNode(startEndLine, this.targetNode)
        if (isCrossNode) {
          const point = getSegmentCrossPointOfRect(
            startEndLine,
            this.targetNode,
          )
          if (point) {
            tempPointList[startIndex] = point
            tempPointList.splice(startIndex - 1, 1)
            startIndex -= 1
            endIndex -= 1
          }
        }
      }
    }

    return tempPointList
  }

  // 获取在拖拽过程中可能产生的点
  getDraggingPoints(
    direction: LogicFlow.Direction,
    positionType: 'start' | 'end',
    position: Point,
    anchorList: Point[],
    draggingPointList: Point[],
  ): Point[] {
    const pointList = map(draggingPointList, (p) => p)
    const anchor = this.getNextAnchor(direction, position, anchorList)
    if (anchor) {
      const crossPoint = this.getCrossPoint(direction, position, anchor)
      if (crossPoint) {
        if (positionType === 'start') {
          pointList.unshift(crossPoint)
          pointList.unshift(anchor)
        } else {
          pointList.push(crossPoint)
          pointList.push(anchor)
        }
      }
    }
    return pointList
  }

  // TODO: 确认是否要设置成 action
  adjustCrossPoint(
    appendInfo: LogicFlow.AppendConfig,
    dragInfo: LogicFlow.OffsetData,
    pointsList: Point[],
  ) {
    const { start, end, startIndex, endIndex, direction } = appendInfo

    // step2: 计算拖拽后，两个端点与节点外框的交点
    // 定义一个拖拽中的节点 List
    let draggingPointList = map(this.pointsList, (p) => p)
    if (startIndex !== 0 && endIndex !== pointsList.length - 1) {
      // 2.1 如果线段没有连接起终点，过滤会穿插在图形内部的线，取整个图形离线段最近的点
      draggingPointList = this.removeCrossPoints(
        startIndex,
        endIndex,
        draggingPointList,
      )
    }

    if (startIndex === 0) {
      // 2.2 如果线段连接了起点，判断起点是否在节点内部
      const startPosition: Point = {
        x: start.x,
        y: start.y + dragInfo.dy,
      }
      const isWithinNode = isInNodeBBox(startPosition, this.sourceNode)
      if (!isWithinNode) {
        // 如果不在节点内部，更换起点为线段与节点的交点
        const anchorList = this.sourceNode?.anchors
        draggingPointList = this.getDraggingPoints(
          direction,
          'start',
          startPosition,
          anchorList,
          draggingPointList,
        )
      }
    }

    if (endIndex === pointsList.length - 1) {
      // 2.3 如果线段连接了终点，判断终点是否在节点内部
      const endPosition = {
        x: end.x,
        y: end.y + dragInfo.dy,
      }
      const isWithinNode = isInNodeBBox(endPosition, this.targetNode)
      if (!isWithinNode) {
        // 如果不在节点内部，更换重点为线段与节点的交点
        const anchorList = this.targetNode?.anchors
        draggingPointList = this.getDraggingPoints(
          direction,
          'end',
          endPosition,
          anchorList,
          draggingPointList,
        )
      }
    }

    // step3: 调整到对应外框的位置后，执行 updatePointsAfterDrag, 找到当前线段和图形的准确交点
    this.updatePointsAfterDrag(draggingPointList)
    this.draggingPointList = draggingPointList
  }

  // TODO: 完善不同类型节点计算交点的方法
  // 计算不同类型节点与「起点、终点」相交的坐标（再想一下怎么更新这个注释）
  calcCrossPointsViaNodeType(
    modelType: string,
    start: Point,
    direction: LogicFlow.Direction,
    node: BaseNodeModel,
  ): Point | undefined {
    let crossPoint

    switch (modelType) {
      case ModelType.RECT_NODE:
        if (node?.radius !== 0) {
          const isInnerNode = isInStraightLineOfRect(
            start,
            node as RectNodeModel,
          )
          if (!isInnerNode) {
            crossPoint = getClosestRadiusCenterPoint(
              start,
              direction,
              node as RectNodeModel,
            )
          }
        }
        break
      case ModelType.CIRCLE_NODE:
        crossPoint = getCrossPointWithCircle(
          start,
          direction,
          node as CircleNodeModel,
        )
        break
      default:
        break
    }

    return crossPoint
  }

  // 更新相交点坐标[起点、终点]，更加贴近图形
  // TODO: 确认该逻辑代码是否抽离到 utils/edge 里面
  updateCrossPoints(pointsList: LogicFlow.Point[]): LogicFlow.Point[] {
    const { sourceNode, targetNode } = this
    const tempList = map(pointsList, (p) => p)
    const [start, next] = take(pointsList, 2)
    const [pre, end] = takeRight(pointsList, 2)
    const sourceModelType = sourceNode?.modelType
    const targetModelType = targetNode?.modelType

    const startDirection = getLineSegmentDirection(start, next)
    const endDirection = getLineSegmentDirection(pre, end)

    if (startDirection) {
      const startCrossPoint = this.calcCrossPointsViaNodeType(
        sourceModelType,
        start,
        startDirection,
        sourceNode,
      )

      if (startCrossPoint) {
        tempList[0] = startCrossPoint
      }
    }

    if (endDirection) {
      const endCrossPoint = this.calcCrossPointsViaNodeType(
        targetModelType,
        end,
        endDirection,
        targetNode,
      )
      if (endCrossPoint) {
        tempList[tempList.length - 1] = endCrossPoint
      }
    }

    return tempList
  }

  @action
  initPoints() {
    if (this.pointsList.length > 0) {
      this.points = pointsList2PointsStr(this.pointsList)
    } else {
      this.updatePoints()
    }
  }

  @action
  updatePoints() {
    /**
     * fix: fix issue ->  The same observable object cannot appear twice in the same tree,
     * trying to assign it to 'edges/0/pointsList/0',
     * but it already exists at 'edges/0/startPoint'
     */
    const startPoint = formatRawData(this.startPoint)
    const endPoint = formatRawData(this.endPoint)
    const pointsList = getPolylinePoints(
      startPoint,
      endPoint,
      this.sourceNode,
      this.targetNode,
      this.offset || 0,
    )
    this.pointsList = pointsList
    this.points = pointsList2PointsStr(pointsList)
  }

  @action
  updateStartPoint(anchor: LogicFlow.Point) {
    super.updateStartPoint(anchor)
    this.updatePoints()
  }

  @action
  moveStartPoint(deltaX: number, deltaY: number) {
    super.moveStartPoint(deltaX, deltaY)
    this.updatePoints()
  }

  @action
  updateEndPoint(anchor: LogicFlow.Point) {
    super.updateEndPoint(anchor)
    this.updatePoints()
  }

  @action
  moveEndPoint(deltaX: number, deltaY: number) {
    super.moveEndPoint(deltaX, deltaY)
    this.updatePoints()
  }

  @action
  dragAppendStart() {
    // mobx observer 对象被 iterator 处理会有问题
    this.draggingPointList = map(this.pointsList, (p) => p)
  }

  @action
  dragAppendSimple(
    appendInfo: LogicFlow.AppendConfig,
    dragInfo: LogicFlow.OffsetData,
  ): LogicFlow.AppendConfig {
    // 因为 drag 事件是 mouseDown 事件触发的，因此当真实拖拽之后再设置 isDragging
    // 避免因为点击事件造成，在 dragStart 触发之后，没有触发 dragEnd 错误设置了 isDragging
    // 状态，对 history 计算产生影响，造成错误
    this.isDragging = true
    const { pointsList } = this
    const { start, end, startIndex, endIndex, direction } = appendInfo
    let draggingPointList = pointsList

    if (direction === SegmentDirection.HORIZONTAL) {
      // 水平情况下，只调整 y 坐标，拿到当前线段两个端点移动后的坐标
      pointsList[startIndex] = { x: start.x, y: start.y + dragInfo.dy }
      pointsList[endIndex] = { x: end.x, y: end.y + dragInfo.dy }
      draggingPointList = map(this.pointsList, (i) => i)
    } else if (direction === SegmentDirection.VERTICAL) {
      // 垂直，仅调整 x 坐标，与水平调整同理
      pointsList[startIndex] = { x: start.x + dragInfo.dx, y: start.y }
      pointsList[endIndex] = { x: end.x + dragInfo.dx, y: end.y }
      draggingPointList = map(this.pointsList, (i) => i)
    }

    this.updatePointsAfterDrag(draggingPointList)
    this.draggingPointList = draggingPointList
    this.setText(assign({}, this.text, this.textPosition))

    return {
      start: assign({}, pointsList[startIndex]),
      end: assign({}, pointsList[endIndex]),
      startIndex,
      endIndex,
      direction,
    }
  }

  @action
  dragAppend(
    appendInfo: LogicFlow.AppendConfig,
    dragInfo: LogicFlow.OffsetData,
  ): LogicFlow.AppendConfig {
    this.isDragging = true
    const { pointsList } = this
    const { start, end, startIndex, endIndex, direction } = appendInfo

    if (direction === SegmentDirection.HORIZONTAL) {
      // 水平时，只调整 y 坐标
      // step1：拿到当前线段两个端点移动后的坐标
      pointsList[startIndex] = { x: start.x, y: start.y + dragInfo.dy }
      pointsList[endIndex] = { x: end.x, y: end.y + dragInfo.dy }

      this.adjustCrossPoint(appendInfo, dragInfo, pointsList)
    } else if (direction === SegmentDirection.VERTICAL) {
      // 垂直时，只调整 x 坐标
      // step1：拿到当前线段两个端点移动后的坐标
      pointsList[startIndex] = { x: start.x + dragInfo.dx, y: start.y }
      pointsList[endIndex] = { x: end.x + dragInfo.dx, y: end.y }

      this.adjustCrossPoint(appendInfo, dragInfo, pointsList)
    }

    this.setText(assign({}, this.text, this.textPosition))
    return {
      start: assign({}, pointsList[startIndex]),
      end: assign({}, pointsList[endIndex]),
      startIndex,
      endIndex,
      direction,
    }
  }

  @action
  dragAppendEnd() {
    this.isDragging = false
  }

  @action
  updatePointsAfterDrag(pointsList: LogicFlow.Point[]) {
    // 找到准确的连接点后，更新 points，更新边，同时更新依赖 points 的箭头
    const newPointsList = this.updateCrossPoints(pointsList)
    this.points = pointsList2PointsStr(newPointsList)
  }

  @action
  getAdjustStart(): LogicFlow.Point {
    return this.pointsList[0] || this.startPoint
  }

  @action
  getAdjustEnd(): LogicFlow.Point {
    const len = this.pointsList.length
    return this.pointsList[len - 1] || this.endPoint
  }

  @action
  updateAfterAdjustStartAndEnd({
    startPoint,
    endPoint,
    sourceNode,
    targetNode,
  }: {
    startPoint: LogicFlow.Point
    endPoint: LogicFlow.Point
    sourceNode: BaseNodeModel
    targetNode: BaseNodeModel
  }) {
    this.pointsList = getPolylinePoints(
      startPoint,
      endPoint,
      sourceNode,
      targetNode,
      this.offset || 0,
    )
    this.initPoints()
  }
}

export default PolylineEdgeModel

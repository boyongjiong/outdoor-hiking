import { action, observable } from 'mobx'
import BaseEdgeModel from './base'
import { ModelType } from '../../constant'
import { LogicFlow } from '../../LogicFlow'
import { assign, cloneDeep, forEach, map } from 'lodash'
import { getBezierControlPoints } from '../../util'
import GraphModel from '../graph'
import { Model } from '../base'

export class BezierEdgeModel extends BaseEdgeModel {
  readonly modelType = ModelType.BEZIER_EDGE
  offset?: number
  @observable path = ''

  constructor(data: LogicFlow.EdgeConfig, graphModel: GraphModel) {
    super(data, graphModel)

    this.initEdgeData(data)
    this.setAttributes()
  }

  initEdgeData(data: LogicFlow.EdgeConfig) {
    this.offset = 100
    super.initEdgeData(data)
  }

  getEdgeStyle(): LogicFlow.EdgeTheme {
    const { bezier } = this.graphModel.theme
    const style = super.getEdgeStyle()
    return {
      ...style,
      ...cloneDeep(bezier),
    }
  }

  getTextPosition(): LogicFlow.Point {
    const {
      pointsList,
      startPoint: { x: sx, y: sy },
      endPoint: { x: ex, y: ey },
    } = this

    if (pointsList && pointsList.length > 0) {
      let pointsXSum = 0
      let pointsYSum = 0
      forEach(pointsList, ({ x, y }) => {
        pointsXSum += x
        pointsYSum += y
      })

      return {
        x: pointsXSum / pointsList.length,
        y: pointsYSum / pointsList.length,
      }
    }

    return {
      x: (sx + ex) / 2,
      y: (sy + ey) / 2,
    }
  }

  getData(): LogicFlow.EdgeData {
    const data = super.getData()
    const pointsList = map(this.pointsList, ({ x, y }) => ({ x, y }))
    return {
      ...data,
      pointsList,
    }
  }

  // 获取贝塞尔曲线的控制点
  private getControls(): BezierEdgeModel.IBezierControls {
    const { startPoint: start, endPoint: end } = this
    return getBezierControlPoints(
      start,
      end,
      this.sourceNode,
      this.targetNode,
      this.offset || 0,
    )
  }

  // 获取贝塞尔曲线的 path
  private getPath(points: LogicFlow.Point[]): string {
    const [start, sNext, ePre, end] = points
    return `M ${start.x} ${start.y}
    C ${sNext.x} ${sNext.y},
    ${ePre.x} ${ePre.y},
    ${end.x} ${end.y}`
  }

  updatePath(sNext: LogicFlow.Point, ePre: LogicFlow.Point) {
    let newSNext = cloneDeep(sNext)
    let newEPre = cloneDeep(ePre)

    if (!newSNext || !newEPre) {
      const control = this.getControls()
      newSNext = control.sNext
      newEPre = control.ePre
    }
    this.pointsList = [this.startPoint, newSNext, newEPre, this.endPoint]
    this.path = this.getPath(this.pointsList)
  }

  @action initPoints() {
    if (this.pointsList.length > 0) {
      this.path = this.getPath(this.pointsList)
    } else {
      this.updatePoints()
    }
  }

  @action updatePoints() {
    const { sNext, ePre } = this.getControls()
    this.updatePath(sNext, ePre)
  }

  @action updateStartPoint(anchor: LogicFlow.Point) {
    this.startPoint = anchor
    this.updatePoints()
  }

  @action updateEndPoint(anchor: LogicFlow.Point) {
    this.endPoint = anchor
    this.updatePoints()
  }

  @action moveStartPoint(deltaX: number, deltaY: number) {
    this.startPoint.x += deltaX
    this.startPoint.y += deltaY
    const [, sNext, ePre] = this.pointsList

    // 保持调整点一起移动
    sNext.x += deltaX
    sNext.y += deltaY
    this.updatePath(sNext, ePre)
  }

  @action moveEndPoint(deltaX: number, deltaY: number) {
    this.endPoint.x += deltaX
    this.endPoint.y += deltaY
    const [, sNext, ePre] = this.pointsList

    // 保持调整点一起移动
    ePre.x += deltaX
    ePre.y += deltaY
    this.updatePath(sNext, ePre)
  }

  @action updateAdjustAnchor(anchor: LogicFlow.Point, type: string) {
    if (type === 'sNext') {
      this.pointsList[1] = anchor
    } else if (type === 'ePre') {
      this.pointsList[2] = anchor
    }
    this.path = this.getPath(this.pointsList)
    this.setText(assign({}, this.text, this.textPosition))
  }

  // 获取边调整的起点
  @action getAdjustStart() {
    return this.pointsList[0] || this.startPoint
  }

  // 获取边调整的终点
  @action getAdjustEnd(): LogicFlow.Point {
    const len = this.pointsList.length
    return this.pointsList[len - 1] || this.endPoint
  }

  // 起终点拖拽调整过程中，进行曲线路径更新
  @action updateAfterAdjustStartAndEnd({
    startPoint,
    endPoint,
    sourceNode,
    targetNode,
  }: Required<Model.AdjustEdgeStartAndEndParams>) {
    const { sNext, ePre } = getBezierControlPoints(
      startPoint,
      endPoint,
      sourceNode,
      targetNode,
      this.offset,
    )
    this.pointsList = [startPoint, sNext, ePre, endPoint]
    this.initPoints()
  }
}

export namespace BezierEdgeModel {
  export type IBezierControls = {
    sNext: LogicFlow.Point
    ePre: LogicFlow.Point
  }

  export type IBezierPoints = {
    start: LogicFlow.Point
    sNext: LogicFlow.Point
    ePre: LogicFlow.Point
    end: LogicFlow.Point
  }
}

export default BezierEdgeModel

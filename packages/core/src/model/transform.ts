import { observable, action } from 'mobx'
import LogicFlow from '../LogicFlow'
import { EventType } from '../constant'
import EventEmitter from '../event/eventEmitter'
import { Options as LFOptions } from '../options'

export type PointTuple = LogicFlow.PointTuple

const translateLimitsMap: any = {
  false: [-Infinity, -Infinity, Infinity, Infinity],
  true: [0, 0, 0, 0],
  vertical: [-Infinity, 0, Infinity, 0],
  horizontal: [0, -Infinity, 0, Infinity],
}

export interface ITransformModel {
  SCALE_X: number
  SCALE_Y: number
  SKEW_X: number
  SKEW_Y: number
  TRANSLATE_X: number
  TRANSLATE_Y: number
  ZOOM_SIZE: number
  translateLimitMinX: number
  translateLimitMinY: number
  translateLimitMaxX: number
  translateLimitMaxY: number

  zoom: (
    zoomOrRatio: TransformModel.ZoomParamType,
    point?: PointTuple,
  ) => string
  // REMIND: 注意下面名词缩写
  // HtmlPoint -->> hp
  // CanvasPoint -->> cp
  hp2Cp: (point: PointTuple) => PointTuple
  cp2Hp: (point: PointTuple) => PointTuple
  moveCpByHtml: (
    point: PointTuple,
    deltaX: number,
    deltaY: number,
  ) => PointTuple
  getTransformStyle: () => { transform: string }
}

export class TransformModel implements ITransformModel {
  private MIN_SCALE_SIZE = 0.2
  private MAX_SCALE_SIZE = 16

  @observable SCALE_X = 1
  @observable SCALE_Y = 1
  @observable SKEW_X = 0
  @observable SKEW_Y = 0
  @observable TRANSLATE_X = 0
  @observable TRANSLATE_Y = 0
  @observable ZOOM_SIZE = 0.04
  eventCenter: EventEmitter
  translateLimitMinX!: number
  translateLimitMinY!: number
  translateLimitMaxX!: number
  translateLimitMaxY!: number

  constructor(eventCenter: EventEmitter, options: LFOptions.Common) {
    this.eventCenter = eventCenter
    const { stopMoveGraph = false } = options
    this.updateTranslateLimits(stopMoveGraph)
  }

  setZoomMinSize(size: number): void {
    this.MIN_SCALE_SIZE = size
  }

  setZoomMaxSize(size: number): void {
    this.MAX_SCALE_SIZE = size
  }

  /**
   * 将最外层 graph 上的点基于缩放转换为 canvasOverlay 层上的点
   * REMIND：hp -->> htmlPoint; cp -->> canvasPoint
   * @param point: PointTuple
   * @return PointTuple
   */
  hp2Cp([x, y]: PointTuple): PointTuple {
    return [
      (x - this.TRANSLATE_X) / this.SCALE_X,
      (y - this.TRANSLATE_Y) / this.SCALE_Y,
    ]
  }

  /**
   * 将最外层 canvasOverlay 层上的点基于缩放转换为 graph 上的点
   * REMIND：hp -->> htmlPoint; cp -->> canvasPoint
   */
  cp2Hp([x, y]: PointTuple): PointTuple {
    return [
      x * this.SCALE_X + this.TRANSLATE_X,
      y * this.SCALE_Y + this.TRANSLATE_Y,
    ]
  }

  /**
   * 将一个在 canvas 上的点，向 X 轴方向移动 deltaX 距离，向 Y 轴方向移动 deltaY 距离
   * 因为 canvas 可能被缩小或放大了，所以其在 canvas 层移动的距离需要计算上缩放的量
   * @param point 点坐标
   * @param deltaX X 轴方向移动量
   * @param deltaY Y 轴方向移动量
   */
  moveCpByHtml([x, y]: PointTuple, deltaX: number, deltaY: number): PointTuple {
    return [x + deltaX / this.SCALE_X, y + deltaY / this.SCALE_Y]
  }

  /**
   * 根据缩放的情况，获取缩放后的 delta 距离
   * @param deltaX
   * @param deltaY
   */
  fixDeltaXY(deltaX: number, deltaY: number): PointTuple {
    return [deltaX / this.SCALE_X, deltaY / this.SCALE_Y]
  }

  /**
   * 基于当前的缩放，获取画布渲染样式 transform 值
   * transform: https://developer.mozilla.org/en-US/docs/Web/CSS/transform
   * matrix: https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix
   */
  getTransformStyle() {
    const matrixStr = [
      this.SCALE_X, // a
      this.SKEW_Y, // b
      this.SKEW_X, // c
      this.SCALE_Y, // d
      this.TRANSLATE_X, // tx
      this.TRANSLATE_Y, // ty
    ].join(',')

    return {
      transform: `matrix(${matrixStr})`,
    }
  }

  private emitGraphTransform(type: string): void {
    this.eventCenter?.emit(EventType.GRAPH_TRANSFORM, {
      type,
      transform: {
        SCALE_X: this.SCALE_X,
        SKEW_Y: this.SKEW_Y,
        SKEW_X: this.SKEW_X,
        SCALE_Y: this.SCALE_Y,
        TRANSLATE_X: this.TRANSLATE_X,
        TRANSLATE_Y: this.TRANSLATE_Y,
      },
    })
  }

  /**
   * 放大缩小图形
   * @param zoomOrRatio (true -> 放大；false -> 缩小；number 0-n -> 小于 1 表示缩小；大于 1 表示放大 )
   * @param point
   * @return { string } - 放大缩小的比例
   */
  @action zoom(
    zoomOrRatio: TransformModel.ZoomParamType,
    point?: PointTuple,
  ): string {
    let nextScaleX = this.SCALE_X
    let nextScaleY = this.SCALE_Y
    if (typeof zoomOrRatio === 'boolean') {
      if (zoomOrRatio) {
        nextScaleX += this.ZOOM_SIZE
        nextScaleY += this.ZOOM_SIZE
      } else {
        nextScaleX -= this.ZOOM_SIZE
        nextScaleY -= this.ZOOM_SIZE
      }
    } else {
      nextScaleX = zoomOrRatio
      nextScaleY = zoomOrRatio
    }

    if (nextScaleX < this.MIN_SCALE_SIZE || nextScaleY > this.MAX_SCALE_SIZE) {
      return `${this.SCALE_X * 100}%`
    }

    if (point) {
      this.TRANSLATE_X -= (nextScaleX - this.SCALE_X) * point[0]
      this.TRANSLATE_Y -= (nextScaleY - this.SCALE_Y) * point[1]
    }

    this.SCALE_X = nextScaleX
    this.SCALE_Y = nextScaleY
    this.emitGraphTransform('zoom')
    return `${this.SCALE_X * 100}%`
  }

  @action resetZoom(): void {
    this.SCALE_X = 1
    this.SCALE_Y = 1
    // TODO: core 包中事件监听没有对 zoom 和 resetZoom 做任何处理，此处是如何联动的？？？
    this.emitGraphTransform('resetZoom')
  }

  @action translate(x: number, y: number) {
    if (
      this.TRANSLATE_X + x <= this.translateLimitMaxX &&
      this.TRANSLATE_X + x >= this.translateLimitMinX
    ) {
      this.TRANSLATE_X += x
    }
    if (
      this.TRANSLATE_Y + y <= this.translateLimitMaxY &&
      this.TRANSLATE_Y + y >= this.translateLimitMinY
    ) {
      this.TRANSLATE_Y += y
    }
    this.emitGraphTransform('translate')
  }

  /**
   * 将图形定位到画布中心
   * @param targetX 图形当前 x 坐标
   * @param targetY 图形当前 y 坐标
   * @param width 画布宽
   * @param height 画布高
   */
  @action focusOn(
    targetX: number,
    targetY: number,
    width: number,
    height: number,
  ): void {
    const [x, y] = this.cp2Hp([targetX, targetY])
    const [deltaX, deltaY] = [width / 2 - x, height / 2 - y]
    this.TRANSLATE_X += deltaX
    this.TRANSLATE_Y += deltaY
    this.emitGraphTransform('focusOn')
  }
  /**
   * 更新画布可以移动范围
   */
  updateTranslateLimits(
    limit:
      | boolean
      | 'vertical'
      | 'horizontal'
      | [number, number, number, number],
  ) {
    const boundary =
      Array.isArray(limit) && limit.length === 4
        ? limit
        : translateLimitsMap[limit.toString()]
    ;[
      this.translateLimitMinX,
      this.translateLimitMinY,
      this.translateLimitMaxX,
      this.translateLimitMaxY,
    ] = boundary
  }
}

export namespace TransformModel {
  export type ZoomParamType = boolean | number
}

export default TransformModel

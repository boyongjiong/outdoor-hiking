import { computed, observable } from 'mobx'
import { cloneDeep, forEach, map } from 'lodash'
import BaseNodeModel from './base'
import { ModelType } from '../../constant'
import { LogicFlow } from '../../LogicFlow'

export class PolygonNodeModel extends BaseNodeModel {
  modelType = ModelType.POLYGON_NODE
  @observable points: LogicFlow.PointTuple[] = [
    [50, 0],
    [100, 50],
    [50, 100],
    [0, 50],
  ]

  @computed get width(): number {
    let min = Number.MAX_SAFE_INTEGER
    let max = Number.MIN_SAFE_INTEGER
    forEach(this.points, ([x]) => {
      if (x < min) {
        min = x
      }
      if (x > max) {
        max = x
      }
    })
    return max - min
  }

  @computed get height(): number {
    let min = Number.MAX_SAFE_INTEGER
    let max = Number.MIN_SAFE_INTEGER
    forEach(this.points, ([, y]) => {
      if (y < min) {
        min = y
      }
      if (y > max) {
        max = y
      }
    })
    return max - min
  }

  /**
   * 由于大多数情况下，我们初始化拿到的多边形坐标都是基于原点的（例如绘图工具导出的 SVG）
   * 在 LogicFlow 中对多边形进行移动，我们不需要去更新 points
   * 而是去更新多边形中心点即可。
   */
  @computed get pointsPosition(): LogicFlow.Point[] {
    const { x, y, width, height } = this
    return map(this.points, ([px, py]) => ({
      x: px + x - width / 2,
      y: py + y - height / 2,
    }))
  }

  getDefaultAnchor(): LogicFlow.Point[] {
    const { x, y, width, height } = this
    return map(this.points, ([px, py], idx) => ({
      x: x + px - width / 2,
      y: y + py - height / 2,
      id: `${this.id}_${idx}`,
    }))
  }

  getNodeStyle(): LogicFlow.CommonTheme {
    const style = super.getNodeStyle()
    const { polygon } = this.graphModel.theme
    return {
      ...style,
      ...cloneDeep(polygon),
    }
  }
}

export default PolygonNodeModel

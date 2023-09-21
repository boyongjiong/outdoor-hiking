import { computed, observable } from 'mobx'
import { cloneDeep, forEach, map } from 'lodash'
import BaseNodeModel from './base'
import { ModelType } from '../../constant'
import { LogicFlow } from '../../LogicFlow'

export class DiamondNodeModel extends BaseNodeModel {
  modelType = ModelType.DIAMOND_NODE
  @observable rx = 30
  @observable ry = 50

  @computed get points(): LogicFlow.PointTuple[] {
    const { x, y, rx, ry } = this
    return [
      [x, y - ry],
      [x + rx, y],
      [x, y + ry],
      [x - rx, y],
    ]
  }

  @computed get pointsPosition(): LogicFlow.Point[] {
    return map(this.points, ([x, y]) => ({
      x,
      y,
    }))
  }

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

  getDefaultAnchor(): LogicFlow.Point[] {
    return map(this.points, ([x, y], idx) => ({
      x,
      y,
      id: `${this.id}_${idx}`,
    }))
  }

  getNodeStyle(): LogicFlow.CommonTheme {
    const style = super.getNodeStyle()
    const { diamond } = this.graphModel.theme
    return {
      ...style,
      ...cloneDeep(diamond),
    }
  }
}

export default DiamondNodeModel

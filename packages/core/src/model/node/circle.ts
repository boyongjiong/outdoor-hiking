import { computed, observable } from 'mobx'
import { cloneDeep } from 'lodash'
import BaseNodeModel from './base'
import { ModelType } from '../../constant'
import { LogicFlow } from '../../LogicFlow'

export class CircleNodeModel extends BaseNodeModel {
  modelType = ModelType.CIRCLE_NODE
  @observable r = 50

  @computed get width(): number {
    return this.r * 2
  }

  @computed get height(): number {
    return this.r * 2
  }

  getDefaultAnchor = (): LogicFlow.Point[] => {
    const { x, y, r } = this
    return [
      { x, y: y - r, id: `${this.id}_0` },
      { x: x + r, y, id: `${this.id}_1` },
      { x, y: y + r, id: `${this.id}_2` },
      { x: x - r, y, id: `${this.id}_3` },
    ]
  }

  getNodeStyle = (): LogicFlow.CommonTheme => {
    const style = super.getNodeStyle()
    const { circle } = this.graphModel.theme
    return {
      ...style,
      ...cloneDeep(circle),
    }
  }
}

export default CircleNodeModel

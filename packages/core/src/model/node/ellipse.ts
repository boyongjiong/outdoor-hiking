import { computed, observable } from 'mobx'
import { cloneDeep } from 'lodash'
import BaseNodeModel from './base'
import { ModelType } from '../../constant'
import { LogicFlow } from '../../LogicFlow'
import GraphModel from '../graph'

export class EllipseNodeModel extends BaseNodeModel {
  modelType = ModelType.ELLIPSE_NODE
  @observable rx = 30
  @observable ry = 45

  @computed get width(): number {
    return this.rx * 2
  }

  @computed get height(): number {
    return this.ry * 2
  }

  constructor(data: LogicFlow.NodeConfig, graphModel: GraphModel) {
    super(data, graphModel)
    this.setAttributes()
  }

  getDefaultAnchor(): LogicFlow.Point[] {
    const { x, y, rx, ry } = this
    return [
      { x, y: y - ry, id: `${this.id}_0` },
      { x: x + rx, y, id: `${this.id}_1` },
      { x, y: y + ry, id: `${this.id}_2` },
      { x: x - rx, y, id: `${this.id}_3` },
    ]
  }

  getNodeStyle(): LogicFlow.CommonTheme {
    const style = super.getNodeStyle()
    const { ellipse } = this.graphModel.theme
    return {
      ...style,
      ...cloneDeep(ellipse),
    }
  }
}

export default EllipseNodeModel

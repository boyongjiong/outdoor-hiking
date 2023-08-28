import { cloneDeep } from 'lodash'
import { BaseEdgeModel } from '.'
import { ModelType } from '../../constant'
import { LogicFlow } from '../../LogicFlow'

export class LineEdgeModel extends BaseEdgeModel {
  readonly modelType = ModelType.LINE_EDGE

  getEdgeStyle(): LogicFlow.EdgeTheme {
    const { line } = this.graphModel.theme
    const style = super.getEdgeStyle()
    return {
      ...style,
      ...cloneDeep(line),
    }
  }

  getTextPosition(): LogicFlow.Point {
    return {
      x: (this.startPoint.x + this.endPoint.x) / 2,
      y: (this.startPoint.y + this.endPoint.y) / 2,
    }
  }
}

export default LineEdgeModel

import { computed } from 'mobx'
import { cloneDeep } from 'lodash'
import BaseNodeModel from './base'
import { ModelType } from '../../constant'
import { LogicFlow } from '../../LogicFlow'
import { getSvgTextSize } from '../../util'

export class TextNodeModel extends BaseNodeModel {
  modelType = ModelType.TEXT_NODE

  @computed get width(): number {
    const rows = String(this.text.value).split(/[\r\n]/g)
    const { fontSize } = this.getTextStyle()
    const { width } = getSvgTextSize({
      rows,
      fontSize,
      rowsLength: rows.length,
    })

    return width
  }

  @computed get height(): number {
    const rows = String(this.text.value).split(/[\r\n]/g)
    const { fontSize } = this.getTextStyle()
    const { height } = getSvgTextSize({
      rows,
      fontSize,
      rowsLength: rows.length,
    })

    return height
  }

  getTextStyle = (): LogicFlow.TextNodeTheme => {
    const style = super.getTextStyle()
    const { text } = this.graphModel.theme
    return {
      ...style,
      ...cloneDeep(text),
    }
  }
}

export default TextNodeModel

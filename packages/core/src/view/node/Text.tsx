import { createElement as h } from 'preact/compat'
import BaseNode from './Base'
import { Rect } from '../shape'
import { TextNodeModel, GraphModel } from '../../model'

export type ITextNodeProps = {
  model: TextNodeModel
  graphModel: GraphModel
}

export class TextNode extends BaseNode<ITextNodeProps> {
  getBackground = (): h.JSX.Element => {
    const { model } = this.props
    const style = model.getTextStyle()
    // 背景框宽度，最长一行字节数 / 2 * fontSize + 2
    // 背景框高度，行数 * fontSize + 2
    // FIX: #1067
    const { x, y, width, height } = model
    const rectAttr = {
      ...style.background,
      x,
      y: y - 1,
      width,
      height,
    }
    return <Rect {...rectAttr} />
  }

  getShape = (): h.JSX.Element => {
    return <g>{this.getBackground()}</g>
  }
}

export default TextNode

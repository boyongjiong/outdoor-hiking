import { createElement as h, createRef } from 'preact/compat'
import BaseNode from './Base'
import { HtmlNodeModel, GraphModel } from '../../model'

export type IHtmlNodeProps = {
  model: HtmlNodeModel
  graphModel: GraphModel
}

export class HtmlNode extends BaseNode<IHtmlNodeProps> {
  ref = createRef()
  currentProperties?: string
  preProperties?: string

  get rootEl() {
    return this.ref
  }

  /**
   * @overridable 支持重写
   * 自定义HTML节点内容
   * @param {HTMLElement} rootEl 自定义HTML节点内容可以挂载的dom节点
   * @example
   * class CustomHtmlNode extends HtmlNode {
   *   setHtml(rootEl) {
   *     const input = document.createElement('input');
   *     rootEl.appendChild(input)
   *   }
   * }
   */
  setHtml(rootEl: HTMLElement) {
    rootEl.appendChild(document.createElement('div'))
  }

  /**
   * @overridable 支持重写
   * 和 react 的 shouldComponentUpdate 类似，都是为了避免出发不必要的 render.
   * 但是这里不一样的地方在于，setHtml方法，我们只在properties发生变化了后再触发。
   * 而x,y等这些坐标相关的方法发生了变化，不会再重新触发setHtml.
   */
  shouldUpdate() {
    if (this.preProperties && this.preProperties === this.currentProperties)
      return
    this.preProperties = this.currentProperties
    return true
  }

  componentDidMount() {
    if (this.shouldUpdate() && this.rootEl) {
      this.setHtml(this.rootEl.current)
    }
  }

  componentDidUpdate() {
    if (this.shouldUpdate() && this.rootEl) {
      this.setHtml(this.rootEl.current)
    }
  }

  getShape = (): h.JSX.Element => {
    const { model } = this.props
    const { x, y, width, height } = model
    const style = model.getNodeStyle()
    this.currentProperties = JSON.stringify(model.properties)

    return (
      <foreignObject
        ref={this.ref}
        {...style}
        x={x - width / 2}
        y={y - height / 2}
        width={width}
        height={height}
      />
    )
  }
}

export default HtmlNode

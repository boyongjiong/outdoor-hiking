import { map } from 'lodash'
import { observer } from 'mobx-preact'
import { createElement as h, Component } from 'preact/compat'
import { GraphModel } from '../../model'
import LogicFlow from '../../LogicFlow'

export type IToolProps = {
  graphModel: GraphModel
  tool: any // TODO: 确认 tool 的类型
}

export const ToolOverlay = observer(
  class ToolOverlay extends Component<IToolProps> {
    // 在 react 严格模式下，useEffect 会执行两次，但是在 LogicFlow 内部，则只会触发一次
    // componentDidMount 和 componentDidUpdate.
    // 其中第一次 componentDidMount 对应的 graphModel 为被丢弃的 graphModel, 所以不应该生效
    // 在非 react 环境下，只会触发一次 componentDidMount，不会触发 componentDidUpdate。
    // 所以这里采用 componentDidUpdate 和 componentDidMount 都去触发插件的 render 方法。
    componentDidMount() {
      this.triggerToolRender()
    }
    componentDidUpdate() {
      this.triggerToolRender()
    }

    // 外部传入的一般是 HTMLElement
    getTools() {
      const { graphModel, tool } = this.props
      const tools = tool?.getTools()
      const components = map(tools, (t) => {
        return h(t, {
          graphModel,
          logicFlow: tool.instance,
          textEditElement: graphModel.textEditElement,
        })
      })
      tool.components = components
      return components
    }

    triggerToolRender() {
      const { graphModel, tool } = this.props
      const ToolOverlayElement = document.querySelector(
        `#ToolOverlay_${graphModel.flowId}`,
      )
      if (ToolOverlayElement) {
        const lf: LogicFlow = tool?.getInstance()
        // TODO：render 失败嘞怎么办嘞。是不是抛出错误比较好
        lf.components.forEach((render) => {
          render(lf, ToolOverlayElement as HTMLElement)
        })
        lf.components = [] // 保证 extension 组件的 render 只执行一次。
      }
    }

    render(): h.JSX.Element {
      const { graphModel } = this.props
      return (
        <div class="lf-tool-overlay" id={`ToolOverlay_${graphModel.flowId}`}>
          {this.getTools()}
        </div>
      )
    }
  },
)

export default ToolOverlay

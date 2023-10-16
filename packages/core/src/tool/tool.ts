import { findIndex } from 'lodash'
import { Component } from 'preact/compat'
import { LogicFlow } from '../LogicFlow'
import { ElementState, EventType } from '../constant'
import { TextEdit } from './TextEdit'
// import { MultipleSelect } from './MultipleSelect'

export class Tool {
  toolMap: Map<string, Component> = new Map()
  instance: LogicFlow

  constructor(instance: LogicFlow) {
    this.instance = instance

    // TODO: 注册默认插件 ？？？ 要不要放在 tool 里面
    if (!this.isDisabledTool(TextEdit.toolName)) {
      this.registerTool(TextEdit.toolName, TextEdit as any)
    }
    // if (!this.isDisabledTool(MultipleSelect.toolName)) {
    //   this.registerTool(MultipleSelect.toolName, MultipleSelect as any)
    // }

    // @see https://github.com/didi/LogicFlow/issues/152
    const { graphModel } = instance
    graphModel.eventCenter.on(
      `${EventType.GRAPH_TRANSFORM},${EventType.NODE_CLICK},${EventType.BLANK_CLICK}`,
      () => {
        const {
          textEditElement,
          editConfigModel: { edgeTextEdit, nodeTextEdit },
        } = graphModel
        // fix #826, 保留之前的文本可以编辑点击空白才设置为不可编辑。如果以后有其他需求再改。
        if ((edgeTextEdit || nodeTextEdit) && textEditElement) {
          graphModel.textEditElement?.setElementState(ElementState.DEFAULT)
        }
      },
    )
  }

  readonly isDisabledTool = (toolName: string) => {
    return findIndex(this.instance.options.disabledTools, toolName) > -1
  }

  registerTool(name: string, component: Component) {
    this.toolMap.set(name, component)
  }

  getTools() {
    return Array.from(this.toolMap.values())
  }

  getInstance() {
    return this.instance
  }
}

export default Tool

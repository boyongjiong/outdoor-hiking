import { findIndex, forEach } from 'lodash'
import { LogicFlow } from '@logicflow/core'
import Extension = LogicFlow.Extension

export type ControlItem = {
  key: string
  iconClass: string
  title: string
  text: string
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export type ControlProps = {
  lf: LogicFlow
}

export class Control implements Extension {
  static pluginName = 'control'

  private readonly lf: LogicFlow
  private domContainer!: HTMLElement
  private toolEl!: HTMLElement

  private controlItems: ControlItem[] = [
    {
      key: 'zoom-out',
      iconClass: 'lf-control-zoomOut',
      title: '缩小流程图',
      text: '缩小',
      onClick: () => {
        this.lf.zoom(false)
      },
    },
    {
      key: 'zoom-in',
      iconClass: 'lf-control-zoomIn',
      title: '放大流程图',
      text: '放大',
      onClick: () => {
        this.lf.zoom(true)
      },
    },
    {
      key: 'reset',
      iconClass: 'lf-control-fit',
      title: '恢复流程原尺寸',
      text: '适应',
      onClick: () => {
        this.lf.resetZoom()
      },
    },
    {
      key: 'undo',
      iconClass: 'lf-control-undo',
      title: '撤销操作',
      text: '撤销',
      onClick: () => {
        this.lf.undo()
      },
    },
    {
      key: 'redo',
      iconClass: 'lf-control-redo',
      title: '重做操作',
      text: '重做',
      onClick: () => {
        this.lf.redo()
      },
    },
  ]

  constructor({ lf }: ControlProps) {
    this.lf = lf
  }

  private getControlTool(): HTMLElement {
    const NORMAL = 'lf-control-item'
    const DISABLED = 'lf-control-item disabled'

    const controlTool = document.createElement('div')
    controlTool.className = 'lf-control'

    const controlElements: HTMLElement[] = []
    forEach(this.controlItems, (control) => {
      const itemContainer = document.createElement('div')
      const icon = document.createElement('i')
      const text = document.createElement('span')
      itemContainer.className = DISABLED

      control.onClick &&
        (itemContainer.onclick = control.onClick.bind(null, this.lf))
      control.onMouseEnter &&
        (itemContainer.onmouseenter = control.onMouseEnter.bind(null, this.lf))
      control.onMouseLeave &&
        (itemContainer.onmouseleave = control.onMouseLeave.bind(null, this.lf))

      icon.className = control.iconClass
      text.className = 'lf-control-text'
      text.title = control.title
      text.innerText = control.text
      itemContainer.append(icon, text)

      switch (control.text) {
        case '撤销':
          this.lf.on('history:change', ({ data: { undoAble } }: any) => {
            itemContainer.className = undoAble ? NORMAL : DISABLED
          })
          break
        case '重做':
          this.lf.on('history:change', ({ data: { redoAble } }: any) => {
            itemContainer.className = redoAble ? NORMAL : DISABLED
          })
          break
        default:
          itemContainer.className = NORMAL
          break
      }
      controlElements.push(itemContainer)
    })
    controlTool.append(...controlElements)
    return controlTool
  }

  destroy() {
    if (
      this.domContainer &&
      this.toolEl &&
      this.domContainer.contains(this.toolEl)
    ) {
      this.domContainer.removeChild(this.toolEl)
    }
  }

  render(lf: LogicFlow, domContainer: HTMLElement) {
    console.log('LogicFlow Ins', lf)
    this.destroy()
    const toolEl = this.getControlTool()
    this.toolEl = toolEl
    domContainer.appendChild(toolEl)
    this.domContainer = domContainer
  }

  addItem(item: ControlItem) {
    this.controlItems.push(item)
  }

  removeItem(key: string) {
    const idx = findIndex(this.controlItems, (item) => item.key === key)
    return idx > -1 ? this.controlItems.splice(idx, 1)[0] : null
  }
}

export default Control

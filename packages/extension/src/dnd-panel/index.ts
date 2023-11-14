import { LogicFlow } from '@logicflow/core'
import Extension = LogicFlow.Extension
import { forEach } from 'lodash'

export type DndPanelShapeItem = {
  type?: string
  text?: string
  icon?: string
  label?: string
  className?: string
  properties?: Record<string, unknown>
  callback?: (lf: LogicFlow, container?: HTMLElement) => void
}

export type DndPanelProps = {
  lf: LogicFlow
}

export class DndPanel implements Extension {
  static pluginName = 'dndPanel'

  lf: LogicFlow
  shapeList: DndPanelShapeItem[] = []
  container?: HTMLElement
  panelWrapper?: HTMLElement

  constructor({ lf }: DndPanelProps) {
    this.lf = lf
    // TODO: 这个 setPatternItems 名字起得是真奇怪
    this.lf.setPatternItems = (shapeList: DndPanelShapeItem[]) => {
      this.setPatternItems(shapeList)
    }
  }

  setPatternItems(shapeList: DndPanelShapeItem[]) {
    this.shapeList = shapeList
    if (this.container) {
      this.render(this.lf, this.container)
    }
  }

  private createDndItem(shapeItem: DndPanelShapeItem): HTMLElement {
    const el = document.createElement('div')
    el.className = `lf-dnd-item ${shapeItem.className || ''}`

    const shape = document.createElement('div')
    shape.className = 'lf-dnd-shape'
    if (shapeItem.icon) {
      shape.style.backgroundImage = `url(${shapeItem.icon})`
    }

    el.appendChild(shape)
    if (shapeItem.label) {
      const text = document.createElement('div')
      text.innerText = shapeItem.label
      text.className = 'lf-dnd-text'
      el.appendChild(text)
    }

    // 事件注册
    el.onmousedown = () => {
      if (shapeItem.type) {
        this.lf.dnd.startDrag({
          type: shapeItem.type,
          properties: shapeItem.properties,
          text: shapeItem.text,
        })
      }
      if (shapeItem.callback) {
        shapeItem.callback(this.lf, this.container)
      }
    }
    el.ondblclick = (e) => {
      this.lf.graphModel.eventCenter.emit('dnd:panel-dblclick', {
        e,
        data: shapeItem,
      })
    }
    el.onclick = (e) => {
      this.lf.graphModel.eventCenter.emit('dnd:panel-click', {
        e,
        data: shapeItem,
      })
    }
    el.oncontextmenu = (e) => {
      this.lf.graphModel.eventCenter.emit('dnd:panel-contextmenu', {
        e,
        data: shapeItem,
      })
    }

    return el
  }

  render(_lf: LogicFlow, container: HTMLElement) {
    this.destroy()
    if (!this.shapeList || this.shapeList.length === 0) {
      this.container = container
      return
    }

    this.panelWrapper = document.createElement('div')
    this.panelWrapper.className = 'lf-dnd-panel'

    const panelContent: HTMLElement[] = []
    forEach(this.shapeList, (shapeItem: DndPanelShapeItem) => {
      panelContent.push(this.createDndItem(shapeItem))
    })
    this.panelWrapper.append(...panelContent)

    container.appendChild(this.panelWrapper)
    this.container = container
  }

  destroy() {
    if (
      this.container &&
      this.panelWrapper &&
      this.container.contains(this.panelWrapper)
    ) {
      this.container.removeChild(this.panelWrapper)
    }
  }
}

export default DndPanel

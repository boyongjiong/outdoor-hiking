import { forEach } from 'lodash'
import { LogicFlow, EventType } from '@logicflow/core'
import GraphElements = LogicFlow.GraphElements
import Extension = LogicFlow.Extension

import {
  NodeMenuKey,
  EdgeMenuKey,
  GraphMenuKey,
  SelectionMenuKey,
} from './constant'
import { calculateMenuPosition } from './utils'
import {
  ActionType,
  BlankEventArgs,
  EdgeEventArgs,
  MenuConfig,
  MenuItem,
  MenuProps,
  MenuTypeConfig,
  NodeEventArgs,
  SelectionEventArgs,
} from './typings'

export class Menu implements Extension {
  static pluginName = 'menu'

  private lf: LogicFlow
  private container!: HTMLElement
  private menuDom: HTMLElement
  private currentData: unknown
  private menuTypeMap: Map<string, MenuItem[]> = new Map()

  constructor({ lf }: MenuProps) {
    this.lf = lf
    this.menuDom = document.createElement('ul')

    const {
      options: { isSilentMode },
    } = lf

    if (!isSilentMode) {
      this.initMenu()

      this.lf.setMenuConfig = (config: MenuConfig) => {
        this.setMenuConfig(config)
      }
      this.lf.addMenuConfig = (config: MenuConfig) => {
        this.addMenuConfig(config)
      }
      this.lf.setMenuByType = (config: MenuTypeConfig) => {
        this.setMenuByType(config)
      }
    }
  }

  private initMenu() {
    const defaultNodeMenu: MenuItem[] = [
      {
        text: '删除',
        callback: (node) => {
          console.log('this', this)
          this.lf.deleteNode(node.id)
        },
      },
      {
        text: '复制',
        callback: (node) => {
          this.lf.cloneNode(node.id)
        },
      },
      {
        text: '编辑文本',
        callback: (node) => {
          this.lf.graphModel.editText(node.id)
        },
      },
    ]
    this.menuTypeMap.set(NodeMenuKey, defaultNodeMenu)

    const defaultEdgeMenu: MenuItem[] = [
      {
        text: '删除',
        callback: (edge) => {
          this.lf.deleteEdge(edge.id)
        },
      },
      {
        text: '编辑文本',
        callback: (edge) => {
          this.lf.graphModel.editText(edge.id)
        },
      },
    ]
    this.menuTypeMap.set(EdgeMenuKey, defaultEdgeMenu)

    const defaultGraphMenu: MenuItem[] = []
    this.menuTypeMap.set(GraphMenuKey, defaultGraphMenu)

    const defaultSelectionMenu: MenuItem[] = [
      {
        text: '删除',
        callback: (elements: GraphElements) => {
          this.lf.clearSelectElements()
          forEach(elements.nodes, (node) => this.lf.deleteNode(node.id))
          forEach(elements.edges, (edge) => this.lf.deleteEdge(edge.id))
        },
      },
    ]
    this.menuTypeMap.set(SelectionMenuKey, defaultSelectionMenu)
  }

  private setMenuConfig(config: MenuConfig) {
    if (!config) return
    if (config.nodeMenu) {
      this.menuTypeMap.set(NodeMenuKey, config.nodeMenu)
    }
  }

  private addMenuConfig(config: MenuConfig) {
    if (!config) return
    if (config.nodeMenu) {
      const defaultNodeMenu = this.menuTypeMap.get(NodeMenuKey) || []
      this.menuTypeMap.set(NodeMenuKey, [
        ...defaultNodeMenu,
        ...config.nodeMenu,
      ])
    }

    if (config.edgeMenu) {
      const defaultEdgeMenu = this.menuTypeMap.get(EdgeMenuKey) || []
      this.menuTypeMap.set(EdgeMenuKey, [
        ...defaultEdgeMenu,
        ...config.edgeMenu,
      ])
    }

    if (config.graphMenu) {
      const defaultGraphMenu = this.menuTypeMap.get(GraphMenuKey) || []
      this.menuTypeMap.set(GraphMenuKey, [
        ...defaultGraphMenu,
        ...config.graphMenu,
      ])
    }
  }

  private setMenuByType(config: MenuTypeConfig) {
    if (!config?.type || !config?.menu) return

    this.menuTypeMap.set(config.type, config.menu)
  }

  private showMenu(x: number, y: number, menuList: MenuItem[]) {
    if (!menuList || !menuList.length) return
    const { rootEl } = this.lf.graphModel
    const menu = this.menuDom
    // 菜单容器不变，需要先清空内部的菜单项
    menu.innerHTML = ''
    menu.append(...this.getMenuContent(menuList))

    // 菜单中没有项时，不显示
    if (!menu.children.length) return
    menu.style.display = 'block'

    const { top, left } = calculateMenuPosition(rootEl, { x, y }, menu)

    menu.style.top = `${top}px`
    menu.style.left = `${left}px`
  }

  private hideMenu() {
    this.menuDom.style.display = 'none'
    this.currentData = null
  }

  private getMenuContent(list: MenuItem[]): HTMLElement[] {
    const menuList: HTMLElement[] = []
    forEach(list, (menu) => {
      const element = document.createElement('li')
      element.className = `lf-menu-item ${menu.className || ''}`

      if (menu.icon) {
        const icon = document.createElement('span')
        icon.className = 'lf-menu-item-icon'
        element.appendChild(icon)
      }

      if (menu.text) {
        const text = document.createElement('span')
        text.className = 'lf-menu-item-text'
        text.innerText = menu.text
        element.appendChild(text)
      }

      element.onclick = () => {
        menu.callback?.bind(null, this.currentData)()
        this.hideMenu()
      }
      menuList.push(element)
    })
    return menuList
  }

  render(lf: LogicFlow, container: HTMLElement) {
    if (lf.options.isSilentMode) return

    this.menuDom.className = 'lf-menu'
    container.appendChild(this.menuDom)
    this.container = container

    // 通过事件控制菜单的显示和隐藏 - 显示
    // NODE CONTEXTMENU
    this.lf.on(EventType.NODE_CONTEXTMENU, (eventArgs) => {
      const {
        data: nodeData,
        position: {
          domOverlayPosition: { x, y },
        },
      } = eventArgs as NodeEventArgs
      const nodeModel = this.lf.graphModel.getNodeModelById(nodeData.id)
      if (nodeModel) {
        let menuList: MenuItem[] = []

        const menuDefinedByType = this.menuTypeMap.get(nodeModel.type)
        if (nodeModel.menu) {
          menuList = nodeModel.menu as MenuItem[]
        } else if (menuDefinedByType) {
          menuList = menuDefinedByType
        } else {
          menuList = this.menuTypeMap.get(NodeMenuKey) || []
        }

        this.currentData = nodeData
        this.showMenu(x, y, menuList)
      }
    })

    // EDGE CONTEXTMENU
    this.lf.on(EventType.EDGE_CONTEXTMENU, (eventArgs) => {
      const {
        data: edgeData,
        position: {
          domOverlayPosition: { x, y },
        },
      } = eventArgs as EdgeEventArgs
      const edgeModel = this.lf.graphModel.getEdgeModelById(edgeData.id)
      if (edgeModel) {
        let menuList: MenuItem[] = []

        const menuDefinedByType = this.menuTypeMap.get(edgeModel.type)
        if (edgeModel.menu) {
          menuList = edgeModel.menu as MenuItem[]
        } else if (menuDefinedByType) {
          menuList = menuDefinedByType
        } else {
          menuList = this.menuTypeMap.get(EdgeMenuKey) || []
        }

        this.currentData = edgeData
        this.showMenu(x, y, menuList)
      }
    })

    // BLANK CONTEXTMENU
    this.lf.on(EventType.BLANK_CONTEXTMENU, (eventArgs) => {
      const {
        position: {
          domOverlayPosition: { x, y },
        },
      } = eventArgs as BlankEventArgs
      const menuList = this.menuTypeMap.get(GraphMenuKey) || []
      this.showMenu(x, y, menuList)
    })

    // SELECTION CONTEXTMENU
    this.lf.on(EventType.SELECTION_CONTEXTMENU, (eventArgs) => {
      const {
        data,
        position: {
          domOverlayPosition: { x, y },
        },
      } = eventArgs as SelectionEventArgs
      const menuList = this.menuTypeMap.get(SelectionMenuKey) || []

      this.currentData = data
      this.showMenu(x, y, menuList)
    })

    // 通过事件控制菜单的显示和隐藏 - 隐藏
    this.lf.on(EventType.NODE_CLICK, () => {
      this.hideMenu()
    })
    this.lf.on(EventType.EDGE_CLICK, () => {
      this.hideMenu()
    })
    this.lf.on(EventType.BLANK_CLICK, () => {
      this.hideMenu()
    })
  }

  destroy() {
    this.container?.removeChild(this.menuDom)
    this.menuDom = document.createElement('ul')
  }

  /**
   * 通过
   * @param type
   * @param config
   */
  changeMenuItem(type: ActionType, config: MenuConfig) {
    if (type === 'add') {
      this.addMenuConfig(config)
    } else if (type === 'reset') {
      this.setMenuConfig(config)
    } else {
      throw new Error(
        'ChangeMenuItem type is not support. Type should be "add" or "reset"',
      )
    }
  }
}

export default Menu

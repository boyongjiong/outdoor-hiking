import { LogicFlow } from '@logicflow/core'
import NodeData = LogicFlow.NodeData
import EdgeData = LogicFlow.EdgeData
import ClientPosition = LogicFlow.ClientPosition
import GraphElements = LogicFlow.GraphElements

export type NodeEventArgs = {
  data: NodeData
  position: ClientPosition
  e: MouseEvent
}

export type EdgeEventArgs = {
  data: EdgeData
  position: ClientPosition
  e: MouseEvent
}

export type BlankEventArgs = {
  position: ClientPosition
  e: MouseEvent
}

export type SelectionEventArgs = {
  data: GraphElements
  position: ClientPosition
  e: MouseEvent
}

export type MenuItem = {
  text?: string
  className?: string
  icon?: boolean
  callback: (element: any) => void
}
export type ActionType = 'add' | 'reset'
export type MenuType = 'nodeMenu' | 'edgeMenu' | 'graphMenu' | 'selectionMenu'
export type MenuConfig = {
  [key in MenuType]?: MenuItem[] | false
}

export type MenuTypeConfig = {
  type: string
  menu: MenuItem[]
}

export type ShowMenuOption = {
  width: number
  height: number
  clientX: number
  clientY: number
}

export type MenuProps = {
  lf: LogicFlow
}

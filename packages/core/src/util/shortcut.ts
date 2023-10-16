import { forEach, map } from 'lodash'
import LogicFlow from '../LogicFlow'
import { GraphModel } from '../model'

let selected: LogicFlow.GraphConfigData | null = null
const TRANSLATION_DISTANCE = 40

export const translateNodeData = (
  nodeData: LogicFlow.NodeData,
  distance: number,
) => {
  nodeData.x += distance
  nodeData.y += distance
  if (nodeData.text) {
    nodeData.text.x += distance
    nodeData.text.y += distance
  }
  return nodeData
}

export const translateEdgeData = (
  edgeData: LogicFlow.EdgeData,
  distance: number,
) => {
  if (edgeData.startPoint) {
    edgeData.startPoint.x += distance
    edgeData.startPoint.y += distance
  }
  if (edgeData.endPoint) {
    edgeData.endPoint.x += distance
    edgeData.endPoint.y += distance
  }
  if (edgeData.pointsList && edgeData.pointsList.length > 0) {
    edgeData.pointsList.forEach((point) => {
      point.x += distance
      point.y += distance
    })
  }
  if (edgeData.text) {
    edgeData.text.x += distance
    edgeData.text.y += distance
  }
  return edgeData
}

export const initDefaultShortcuts = (lf: LogicFlow, graph: GraphModel) => {
  const { keyboard } = lf
  const {
    options: { keyboard: keyboardOptions },
  } = keyboard

  /**
   * 复制快捷键「cmd + c」 or 「ctrl + c」
   */
  keyboard.on(['cmd + c', 'ctrl + c'], () => {
    if (!keyboardOptions.enabled) return true
    if (graph.textEditElement) return true

    const { guards } = lf.options
    const elements = graph.getSelectElements(false)
    const enableClone =
      guards && guards.beforeClone ? guards.beforeClone(elements) : true
    if (
      !enableClone ||
      (elements.nodes.length === 0 && elements.edges.length === 0)
    ) {
      selected = null
      return true
    }

    selected = elements
    selected.nodes = map(selected.nodes, (node) =>
      translateNodeData(node, TRANSLATION_DISTANCE),
    )
    selected.edges = map(selected.edges, (edge) =>
      translateEdgeData(edge, TRANSLATION_DISTANCE),
    )
    return false
  })

  /**
   * 粘贴快捷键「cmd + v」 or 「ctrl + v」
   */
  keyboard.on(['cmd + v', 'ctrl + v'], () => {
    if (!keyboardOptions.enabled) return true
    if (graph.textEditElement) return true
    if (selected && (selected.nodes.length > 0 || selected.edges.length > 0)) {
      lf.clearSelectElements()
      const addElements = lf.addElements(selected)

      forEach(addElements.nodes, (node) => lf.selectElementById(node.id, true))
      forEach(addElements.edges, (edge) => lf.selectElementById(edge.id, true))

      selected.nodes = map(selected.nodes, (node) =>
        translateNodeData(node, TRANSLATION_DISTANCE),
      )
      selected.edges = map(selected.edges, (edge) =>
        translateEdgeData(edge, TRANSLATION_DISTANCE),
      )
    }
    return false
  })

  /**
   * 撤销（undo）快捷键「cmd + z」or「ctrl + z」
   */
  keyboard.on(['cmd + z', 'ctrl + z'], () => {
    if (!keyboardOptions.enabled) return true
    if (graph.textEditElement) return true
    lf.undo()
    return false
  })

  /**
   * 重做（redo）快捷键「cmd + y」or「ctrl + y」or「command + shift + z」or「ctrl + shift + z」
   */
  keyboard.on(
    ['cmd + y', 'ctrl + y', 'cmd + shift + z', 'ctrl + shift + z'],
    () => {
      if (!keyboardOptions.enabled) return true
      if (graph.textEditElement) return true
      lf.redo()
      return false
    },
  )

  /**
   * 删除操作快捷键「'backspace'」or ['delete']
   */
  keyboard.on(['backspace', 'delete'], () => {
    if (!keyboardOptions.enabled) return true
    if (graph.textEditElement) return true
    const elements = graph.getSelectElements(true)
    lf.clearSelectElements()

    forEach(elements.nodes, (node) => lf.deleteNode(node.id))
    forEach(elements.edges, (edge) => lf.deleteEdge(edge.id))
    return false
  })
}

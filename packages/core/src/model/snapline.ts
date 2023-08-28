import { action, observable } from 'mobx'
import GraphModel from './graph'
import { LogicFlow } from '../LogicFlow'
import { BaseNodeModel } from './node'
import { getNodeBBox } from '../util'
import Position = LogicFlow.Position
import NodeData = LogicFlow.NodeData
import NodeBBox = BaseNodeModel.NodeBBox

export type ISnaplineInfo = {
  isShowHorizontal: boolean
  isShowVertical: boolean
  position: Position
}

export class SnaplineModel {
  readonly graphModel: GraphModel
  // 是否展示水平对齐线
  @observable isShowHorizontal: boolean
  // 是否展示垂直对齐线
  @observable isShowVertical: boolean
  // TODO：对齐线的中心位置，目前仅展示中心对齐的情况，后面考虑多种对齐策略
  @observable position: Position

  constructor(graphModel: GraphModel) {
    this.graphModel = graphModel
    this.isShowHorizontal = false
    this.isShowVertical = false
    this.position = { x: 0, y: 0 }
  }

  getStyle() {
    return this.graphModel.theme.snapline
  }

  // 计算节点中心线与其他节点的对齐信息
  getCenterSnapline(node: NodeData, nodes: BaseNodeModel[]): ISnaplineInfo {
    const { x, y } = node
    let isShowHorizontal = false
    let isShowVertical = false

    for (let i = 0; i < nodes.length; i++) {
      const curNode = nodes[i]
      // 排除当前节点自身
      if (curNode.id !== node.id) {
        if (x === curNode.x) {
          isShowVertical = true
        }
        if (y === curNode.y) {
          isShowHorizontal = true
        }
        // 如果水平垂直都已显示，则停止循环。减少不必要的遍历
        if (isShowHorizontal && isShowVertical) break
      }
    }
    return {
      isShowHorizontal,
      isShowVertical,
      position: { x, y },
    }
  }

  readonly getDraggingNodeData = (draggingNode: NodeData): NodeBBox => {
    const { id } = draggingNode
    let draggingNodeData: unknown
    if (id) {
      const { fakeNode } = this.graphModel
      if (fakeNode && fakeNode.id === id) {
        draggingNodeData = getNodeBBox(fakeNode)
      } else {
        const nodeModel = this.graphModel.getNodeModelById(id)
        if (nodeModel) {
          draggingNodeData = getNodeBBox(nodeModel)
        }
      }
    }

    return draggingNodeData as NodeBBox
  }

  // 计算节点上下边框与其它节点的对齐信息
  readonly getHorizontalSnapline = (
    draggingNode: NodeData,
    nodes: BaseNodeModel[],
  ): ISnaplineInfo => {
    const draggingNodeData = this.getDraggingNodeData(draggingNode)
    let isShowHorizontal = false
    let horizontalY: number = 0

    // 遍历查找，相同位置的点
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      // 排除当前节点
      if (node.id !== draggingNode.id) {
        const nodeData = getNodeBBox(node)
        // 如果节点的最大和最小 Y 轴坐标与节点的最大最小 Y 轴坐标相等，展示水平线
        if (
          nodeData.minY === draggingNodeData.minY ||
          nodeData.maxY === draggingNodeData.maxY
        ) {
          // 找到则停止循环，减少不必要的遍历
          isShowHorizontal = true
          horizontalY = draggingNodeData.minY
          break
        }

        // 如果节点的最大和最小 Y 轴坐标与节点的最大最小 Y 轴坐标相等，展示水平线
        if (
          nodeData.minY === draggingNodeData.maxY ||
          nodeData.maxY === draggingNodeData.minY
        ) {
          // 找到则停止循环，减少不必要的遍历
          isShowHorizontal = true
          horizontalY = draggingNodeData.maxY
          break
        }
      }
    }
    return {
      isShowHorizontal,
      isShowVertical: this.isShowVertical,
      position: {
        ...this.position,
        y: horizontalY,
      },
    }
  }

  // 计算节点左右边框与其他节点的左右边框的对齐信息
  readonly getVerticalSnapline = (
    draggingNode: NodeData,
    nodes: BaseNodeModel[],
  ): ISnaplineInfo => {
    const draggingNodeData = this.getDraggingNodeData(draggingNode)
    let isShowVertical = false
    let verticalX: number = 0

    // 遍历查找，相同位置的点
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      // 排除当前节点
      if (node.id !== draggingNode.id) {
        const nodeData = getNodeBBox(node)
        // 如果节点的最大和最小 Y 轴坐标与节点的最大最小 Y 轴坐标相等，展示水平线
        if (
          nodeData.minX === draggingNodeData.minX ||
          nodeData.maxX === draggingNodeData.maxX
        ) {
          // 找到则停止循环，减少不必要的遍历
          isShowVertical = true
          verticalX = draggingNodeData.minX
          break
        }

        // 如果节点的最大和最小 Y 轴坐标与节点的最大最小 Y 轴坐标相等，展示水平线
        if (
          nodeData.minX === draggingNodeData.maxX ||
          nodeData.maxX === draggingNodeData.minX
        ) {
          // 找到则停止循环，减少不必要的遍历
          isShowVertical = true
          verticalX = draggingNodeData.maxX
          break
        }
      }
    }
    return {
      isShowVertical,
      isShowHorizontal: this.isShowHorizontal,
      position: {
        ...this.position,
        x: verticalX,
      },
    }
  }

  // 计算节点与其他节点的对齐信息
  getSnaplinePosition(
    draggingNode: NodeData,
    nodes: BaseNodeModel[],
  ): ISnaplineInfo {
    const snaplineInfo = this.getCenterSnapline(draggingNode, nodes)
    const { isShowHorizontal, isShowVertical } = snaplineInfo
    // 中心对齐优先级最高
    // 如果没有中心坐标的水平对齐，计算上下边框的对齐
    if (!isShowHorizontal) {
      const hSnapline = this.getHorizontalSnapline(draggingNode, nodes)
      const {
        isShowHorizontal,
        position: { y },
      } = hSnapline
      snaplineInfo.isShowHorizontal = isShowHorizontal
      snaplineInfo.position.y = y
    }

    // 如果没有中心坐标的垂直对齐，计算左右边框的对齐
    if (!isShowVertical) {
      const vSnapline = this.getVerticalSnapline(draggingNode, nodes)
      const {
        isShowVertical,
        position: { x },
      } = vSnapline
      snaplineInfo.isShowVertical = isShowVertical
      snaplineInfo.position.x = x
    }

    return snaplineInfo
  }

  // 设置对齐信息
  setSnaplineInfo(snapline: ISnaplineInfo) {
    const { isShowHorizontal, isShowVertical, position } = snapline
    this.isShowHorizontal = isShowHorizontal
    this.isShowVertical = isShowVertical
    this.position = position
  }

  // 清空对齐信息
  @action clearSnapline() {
    this.position = { x: 0, y: 0 }
    this.isShowHorizontal = false
    this.isShowVertical = false
  }

  @action setNodeSnapline(nodeData: NodeData) {
    const { nodes } = this.graphModel
    const info = this.getSnaplinePosition(nodeData, nodes)
    this.setSnaplineInfo(info)
  }
}

export default SnaplineModel

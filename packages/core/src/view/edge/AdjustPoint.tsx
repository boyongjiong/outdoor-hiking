import { Component, createElement as h } from 'preact/compat'
import { assign } from 'lodash'
import { LogicFlow } from '../../LogicFlow'
import { BaseEdgeModel, BaseNodeModel, GraphModel } from '../../model'
import {
  formatConnectValidateResult,
  getTargetNodeInfo,
  RafInstance,
  TargetNodeInfo,
} from '../../util'
import { IDragParams, StepperDrag } from '../../common'
import { ElementState, EventType } from '../../constant'

export enum AdjustType {
  SOURCE = 'SOURCE',
  TARGET = 'TARGET',
}

export type IAdjustPointProps = {
  x: number
  y: number
  type: AdjustType
  id?: string
  getAdjustPointShape: (
    x: number,
    y: number,
    model: BaseEdgeModel,
  ) => h.JSX.Element | null
  edgeModel: BaseEdgeModel
  graphModel: GraphModel
}
export type IAdjustPointState = {
  dragging: boolean
  endX: number
  endY: number
}

export class AdjustPoint extends Component<
  IAdjustPointProps,
  IAdjustPointState
> {
  readonly adjustPointData?: Record<string, unknown>
  preTargetNode?: BaseNodeModel
  // requestAnimationFrame 方法实例
  rafIns?: RafInstance
  stepperDrag?: StepperDrag
  originEdge?: AdjustPoint.OriginEdgeInfo

  // 连线规则数据
  sourceRuleResults: Map<string, LogicFlow.ConnectRuleResult>
  targetRuleResults: Map<string, LogicFlow.ConnectRuleResult>

  constructor(props: IAdjustPointProps) {
    super()
    const {
      graphModel: { eventCenter },
      edgeModel,
      type,
    } = props
    this.sourceRuleResults = new Map()
    this.targetRuleResults = new Map()

    this.state = {
      dragging: false,
      endX: 0,
      endY: 0,
    }
    const edgeData = edgeModel.getData()
    this.adjustPointData = { type, edgeData }

    this.stepperDrag = new StepperDrag({
      eventCenter,
      onDragStart: this.onDragStart,
      onDragging: this.onDragging,
      onDragEnd: this.onDragEnd,
      eventType: 'ADJUST_POINT',
      isStopPropagation: false,
      data: this.adjustPointData,
    })
  }

  mouseDownHandler = (event: MouseEvent) => {
    if (this.stepperDrag) {
      this.stepperDrag.handleMouseDown(event)
    }
  }
  onDragStart = () => {
    const { x, y, edgeModel } = this.props
    const { startPoint, endPoint, pointsList } = edgeModel

    // 记录下原始路径信息，在调整中，如果放弃调整，进行路径还原
    this.originEdge = {
      startPoint,
      endPoint,
      pointsList,
    }

    this.setState({
      endX: x,
      endY: y,
      dragging: true,
    })
  }
  onDragging = ({ deltaX, deltaY }: IDragParams) => {
    const { endX, endY } = this.state
    const { graphModel, edgeModel, type } = this.props
    const { transformModel, editConfigModel } = graphModel
    const [x, y] = transformModel.moveCpByHtml([endX, endY], deltaX, deltaY)

    this.setState({
      endX: x,
      endY: y,
      dragging: true,
    })

    // 调整过程中实时更新路径
    const nodeInfo = getTargetNodeInfo({ x: endX, y: endY }, graphModel)

    // 如果一定的坐标能够找到目标节点，预结算当前节点与目标节点的路径进行展示
    if (nodeInfo && nodeInfo.node && this.isAllowAdjust(nodeInfo)?.pass) {
      const { startPoint, endPoint, sourceNode, targetNode } = edgeModel
      if (type === AdjustType.SOURCE) {
        edgeModel.updateAfterAdjustStartAndEnd({
          startPoint: { ...nodeInfo.anchor },
          endPoint,
          sourceNode: nodeInfo.node,
          targetNode,
        })
      } else if (type === AdjustType.TARGET) {
        edgeModel.updateAfterAdjustStartAndEnd({
          startPoint,
          endPoint: { ...nodeInfo.anchor },
          sourceNode,
          targetNode: nodeInfo.node,
        })
      }
    } else if (type === AdjustType.SOURCE) {
      // 如果没有找到目标节点，更新起终点为当前坐标
      edgeModel.updateStartPoint({ x, y })
    } else if (type === AdjustType.TARGET) {
      edgeModel.updateEndPoint({ x, y })
    }

    if (edgeModel.text.value && editConfigModel.adjustEdge) {
      edgeModel.setText(assign({}, edgeModel.text, edgeModel.textPosition))
    }
  }
  onDragEnd = ({ event }: Partial<IDragParams>) => {
    this.setState({ dragging: false })
    const { graphModel, edgeModel, type } = this.props
    const { endX, endY, dragging } = this.state
    try {
      // 将状态置为非拖拽状态
      const nodeInfo = getTargetNodeInfo({ x: endX, y: endY }, graphModel)

      // 没有 dragging 就结束边
      if (!dragging) return

      // TODO: 优化下这块儿的逻辑，太啰嗦了 !!!
      // 如果找到目标节点，删除旧边，创建新边
      let needRestoreEdge = false
      let createEdgeInfo: Partial<LogicFlow.EdgeConfig> = {}
      if (nodeInfo && nodeInfo.node) {
        const { pass, msg, newTargetNode } = this.isAllowAdjust(nodeInfo) || {}
        if (pass) {
          const edgeData = edgeModel.getData()
          createEdgeInfo = {
            ...edgeData,
            sourceAnchorId: '',
            targetAnchorId: '',
            text: edgeData?.text?.value || '',
          }
          if (type === AdjustType.SOURCE) {
            const edgeInfo = graphModel?.edgeGenerator?.(
              nodeInfo.node.getData(),
              edgeModel.targetNode?.getData(),
              createEdgeInfo,
            )
            createEdgeInfo = {
              ...edgeInfo,
              sourceNodeId: nodeInfo.node.id,
              sourceAnchorId: nodeInfo.anchor.id,
              targetNodeId: edgeModel.targetNodeId,
              startPoint: { ...nodeInfo.anchor },
              endPoint: { ...edgeModel.endPoint },
            }
            // 找到的是原有的源节点上的原锚点时，还原边
            if (
              edgeModel.sourceNodeId === nodeInfo.node.id &&
              edgeModel.sourceAnchorId === nodeInfo.anchor.id
            ) {
              needRestoreEdge = true
            }
          } else if (type === AdjustType.TARGET) {
            const edgeInfo = graphModel?.edgeGenerator?.(
              edgeModel.sourceNode?.getData(),
              nodeInfo.node.getData(),
              createEdgeInfo,
            )
            createEdgeInfo = {
              ...edgeInfo,
              targetNodeId: nodeInfo.node.id,
              targetAnchorId: nodeInfo.anchor.id,
              sourceNodeId: edgeModel.sourceNodeId,
              startPoint: { ...edgeModel.startPoint },
              endPoint: { ...nodeInfo.anchor },
            }
            // 找到的是原有的源节点上的原锚点时，还原边
            if (
              edgeModel.targetNodeId === nodeInfo.node.id &&
              edgeModel.targetAnchorId === nodeInfo.anchor.id
            ) {
              needRestoreEdge = true
            }
          }
        } else {
          // 如果没有通过校验，还原边并抛出 CONNECTION_NOT_ALLOWED 事件
          needRestoreEdge = true

          const nodeData = newTargetNode?.getData()
          graphModel.eventCenter.emit(EventType.CONNECTION_NOT_ALLOWED, {
            msg,
            e: event,
            data: nodeData,
          })
        }
      } else {
        // 如果没有找到目标节点，还原边
        needRestoreEdge = true
      }

      if (!needRestoreEdge) {
        // 为了保证 id 不变必须先删除旧边，再创建新边，创建新边会判断是否有重复的 id
        const oldEdgeData = edgeModel.getData()
        graphModel.deleteEdgeById(edgeModel.id)

        const newEdge = graphModel.addEdge(
          createEdgeInfo as LogicFlow.EdgeConfig,
        )
        graphModel.eventCenter.emit(EventType.EDGE_EXCHANGE_NODE, {
          data: {
            newEdge: newEdge.getData(),
            oldEdge: oldEdgeData,
          },
        })
      } else {
        this.restoreEdge()
      }

      this.preTargetNode?.setElementState(ElementState.DEFAULT)
    } finally {
      graphModel.eventCenter.emit(EventType.ADJUST_POINT_DRAGEND, {
        e: event,
        data: this.adjustPointData,
      })
    }
  }

  // 还原上次边的样式
  restoreEdge() {
    const { edgeModel } = this.props
    if (this.originEdge) {
      const { startPoint, endPoint, pointsList } = this.originEdge
      edgeModel.updateStartPoint(startPoint)
      edgeModel.updateEndPoint(endPoint)

      // 折线和曲线还需要还原其 pointsList
      edgeModel.pointsList = pointsList
      edgeModel.initPoints()
    }
  }

  /**
   * 调整点的样式默认从主题中读取，可以复写此方法进行更加个性化的自定义
   * 目前仅支持圆形图形进行标识，可以从圆形的 r 和颜色上进行调整
   */
  getAdjustPointStyle() {
    const { edgeAdjust } = this.props.graphModel.theme
    return edgeAdjust
  }

  // TODO: 优化一下这个方法，略挫
  isAllowAdjust(
    nodeInfo: TargetNodeInfo,
  ): AdjustPoint.AllowAdjustInfo | undefined {
    const {
      edgeModel: { id, sourceNode, targetNode, sourceAnchorId, targetAnchorId },
      type,
    } = this.props

    let newSourceNode
    let newTargetNode
    let newSourceAnchor
    let newTargetAnchor

    // 如果调整的是连接起点
    if (type === AdjustType.SOURCE) {
      newSourceNode = nodeInfo.node
      newTargetNode = targetNode
      newSourceAnchor = nodeInfo.anchor
      newTargetAnchor = targetNode?.getAnchorInfo(targetAnchorId)
    }
    if (type === AdjustType.TARGET) {
      newSourceNode = sourceNode
      newTargetNode = nodeInfo.node
      newTargetAnchor = nodeInfo.anchor
      newSourceAnchor = sourceNode?.getAnchorInfo(sourceAnchorId)
    }

    if (
      !newSourceNode ||
      !newTargetNode ||
      !newSourceAnchor ||
      !newTargetAnchor
    )
      return

    // 如果前一个接触的节点和此时接触的节点不相等，则将前一个节点状态重新设置为默认状态
    if (this.preTargetNode && this.preTargetNode !== nodeInfo.node) {
      this.preTargetNode.setElementState(ElementState.DEFAULT)
    }
    this.preTargetNode = nodeInfo.node

    // #500 不允许锚点自己连自己，在锚点一开始连接的时候，不触发自己连接自己的校验
    if (newTargetAnchor.id === newSourceAnchor.id) {
      return {
        pass: false,
        msg: '',
        newTargetNode,
      }
    }

    const targetInfoId = `${newSourceNode.id}_${newTargetNode.id}_${newSourceAnchor.id}_${newTargetAnchor.id}`
    // 查看鼠标是否进入过 target，若有检验结果，表示进入过，就不重复计算了
    if (!this.targetRuleResults.has(targetInfoId)) {
      const sourceRuleResult = newSourceNode.isAllowConnectedAsSource(
        newTargetNode,
        newSourceAnchor,
        newTargetAnchor,
        id,
      )
      const targetRuleResult = newTargetNode.isAllowConnectedAsTarget(
        newSourceNode,
        newSourceAnchor,
        newTargetAnchor,
        id,
      )
      this.sourceRuleResults.set(
        targetInfoId,
        formatConnectValidateResult(sourceRuleResult),
      )
      this.targetRuleResults.set(
        targetInfoId,
        formatConnectValidateResult(targetRuleResult),
      )
    }

    const { isAllPass: isSourcePass, msg: sourceMsg } =
      this.sourceRuleResults.get(targetInfoId) || {}
    const { isAllPass: isTargetPass, msg: targetMsg } =
      this.targetRuleResults.get(targetInfoId) || {}

    // 实时提示出即将连接的节点是否允许连接
    const state =
      isSourcePass && isTargetPass
        ? ElementState.ALLOW_CONNECT
        : ElementState.NOT_ALLOW_CONNECT
    if (type === AdjustType.SOURCE) {
      newSourceNode.setElementState(state)
    }
    if (type === AdjustType.TARGET) {
      newTargetNode.setElementState(state)
    }

    return {
      pass: !!(isSourcePass && isTargetPass),
      msg: targetMsg || sourceMsg,
      newTargetNode,
    }
  }

  render(): h.JSX.Element {
    const { x, y, getAdjustPointShape, edgeModel } = this.props
    const { dragging } = this.state
    return (
      <g
        pointerEvents={dragging ? 'none' : ''}
        onMouseDown={this.mouseDownHandler}
      >
        {!dragging ? getAdjustPointShape(x, y, edgeModel) : ''}
      </g>
    )
  }
}

export namespace AdjustPoint {
  export type OriginEdgeInfo = {
    startPoint: LogicFlow.Point
    endPoint: LogicFlow.Point
    pointsList: LogicFlow.Point[]
  }

  export type AllowAdjustInfo = {
    pass: boolean
    msg?: string
    newTargetNode?: BaseNodeModel
  }
}

export default AdjustPoint

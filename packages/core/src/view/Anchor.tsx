import { h, Component } from 'preact'
import { LogicFlow } from '..'
import { BaseNode, IBaseNodeProps, Circle, Line } from '.'
import {
  createRaf,
  distance,
  formatConnectValidateResult,
  getTargetNodeInfo,
  IDragParams,
  RafInstance,
  StepperDrag,
} from '../util'
import { BaseNodeModel, GraphModel } from '../model'
import { ElementState, EventType, OverlapMode } from '../constant'

export interface AnchorOptions {
  id?: string
  x: number
  y: number
  [key: string]: unknown
}

export interface IAnchorProps {
  anchorData: AnchorOptions
  anchorIndex: number
  graphModel: GraphModel
  node: BaseNode<IBaseNodeProps>
  nodeModel: BaseNodeModel
  // Style
  style?: LogicFlow.AnchorTheme
  edgeStyle?: LogicFlow.AnchorLineTheme
  hoverStyle?: LogicFlow.AnchorTheme
  // Event
  setHoverOff?: (e: MouseEvent) => void
}

export interface IAnchorState {
  startX: number
  startY: number
  endX: number
  endY: number
  dragging: boolean
}

export class Anchor extends Component<IAnchorProps, IAnchorState> {
  preTargetNode?: BaseNodeModel
  // requestAnimationFrame 方法实例
  rafIns?: RafInstance
  // 拖拽辅助函数
  stepperDrag: StepperDrag
  // 连线规则数据
  sourceRuleResults: Map<string, LogicFlow.ConnectRuleResult>
  targetRuleResults: Map<string, LogicFlow.ConnectRuleResult>

  constructor() {
    super()
    this.sourceRuleResults = new Map()
    this.targetRuleResults = new Map()

    this.state = {
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      dragging: false,
    }
    this.stepperDrag = new StepperDrag({
      onDragStart: this.onDragStart,
      onDragging: this.onDragging,
      onDragEnd: this.onDragEnd,
    })
  }

  checkEnd = (event: MouseEvent | null | undefined) => {
    const { graphModel, nodeModel, anchorData } = this.props
    const { x, y, id } = anchorData

    // 创建边
    const { endX, endY, dragging } = this.state
    const nodeInfo = getTargetNodeInfo({ x: endX, y: endY }, graphModel)

    // 保证鼠标离开的时候，将上一个节点状态重置为正常状态
    if (
      this.preTargetNode &&
      this.preTargetNode.state !== ElementState.DEFAULT
    ) {
      this.preTargetNode.setElementState(ElementState.DEFAULT)
    }
    // 没有 dragging 就结束边
    if (!dragging) return
    if (nodeInfo && nodeInfo.node) {
      const targetNode = nodeInfo.node
      const anchorId = nodeInfo.anchor.id
      const targetInfoId = `${nodeModel.id}_${targetNode.id}_${anchorId}_${id}`

      const sourceRuleResult = this.sourceRuleResults.get(targetInfoId)
      const targetRuleResult = this.targetRuleResults.get(targetInfoId)
      if (sourceRuleResult && targetRuleResult) {
        const { isAllPass: isSourcePass, msg: sourceMsg } = sourceRuleResult
        const { isAllPass: isTargetPass, msg: targetMsg } = targetRuleResult

        if (isSourcePass && isTargetPass) {
          targetNode.setElementState(ElementState.DEFAULT)
          // 新建一条 edge
          const edgeData = graphModel.edgeGenerator?.(
            nodeModel.getData(),
            nodeInfo.node.getData(),
          )
          const edgeModel = graphModel.addEdge({
            ...edgeData,
            sourceNodeId: nodeModel.id,
            sourceAnchorId: id,
            startPoint: { x, y },
            targetNodeId: nodeInfo.node.id,
            targetAnchorId: nodeInfo.anchor.id,
            endPoint: { x: nodeInfo.anchor.x, y: nodeInfo.anchor.y },
          })

          graphModel.eventCenter.emit(EventType.ANCHOR_DROP, {
            data: anchorData,
            e: event,
            nodeModel,
            edgeModel,
          })
        } else {
          const nodeData = targetNode.getData()
          graphModel.eventCenter.emit(EventType.CONNECTION_NOT_ALLOWED, {
            data: nodeData,
            msg: targetMsg || sourceMsg,
          })
        }
      }
    }
  }
  moveAnchorEnd = (endX: number, endY: number) => {
    const { anchorData, nodeModel, graphModel } = this.props
    const nodeInfo = getTargetNodeInfo({ x: endX, y: endY }, graphModel)

    if (nodeInfo) {
      const targetNode = nodeInfo.node
      const anchorId = nodeInfo.anchor.id
      if (this.preTargetNode && this.preTargetNode !== nodeInfo.node) {
        this.preTargetNode.setElementState(ElementState.DEFAULT)
      }

      // 不允许锚点链接自己，在锚点一开始连接的时候，不触发自己连接自己的校验
      if (anchorData.id === anchorId) return

      this.preTargetNode = targetNode
      // 支持节点的每个锚点单独设置是否可连接，因此规则 key 取 nodeId + anchorId 作为唯一值
      const targetInfoId = `${nodeModel.id}_${targetNode.id}_${anchorId}_${anchorData.id}`

      // DONE: 查看鼠标是否进入过 target，若有检验结果，表示进入过，就不重复计算了 ??? 没太懂
      if (!this.targetRuleResults.has(targetInfoId)) {
        const targetAnchor = nodeInfo.anchor
        const sourceRuleResult = nodeModel.isAllowConnectedAsSource(
          targetNode,
          anchorData,
          targetAnchor,
        )
        const targetRuleResult = targetNode.isAllowConnectedAsTarget(
          nodeModel,
          anchorData,
          targetAnchor,
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

      const sourceRuleResult = this.sourceRuleResults.get(targetInfoId)
      const targetRuleResult = this.targetRuleResults.get(targetInfoId)
      if (sourceRuleResult && targetRuleResult) {
        const { isAllPass: isSourcePass } = sourceRuleResult
        const { isAllPass: isTargetPass } = targetRuleResult
        const nextState =
          isSourcePass && isTargetPass
            ? ElementState.ALLOW_CONNECT
            : ElementState.NOT_ALLOW_CONNECT

        targetNode.setElementState(nextState)
      }
    } else if (
      this.preTargetNode &&
      this.preTargetNode.state !== ElementState.DEFAULT
    ) {
      // 为了保证鼠标离开的时候，将上一个节点状态重置为正常状态
      this.preTargetNode.setElementState(ElementState.DEFAULT)
    }
  }

  onDragStart = ({ event }: Partial<IDragParams>) => {
    const { anchorData, nodeModel, graphModel } = this.props
    console.log('anchorData --->>>', anchorData)
    const { overlapMode } = graphModel
    const { x, y } = anchorData

    graphModel.selectNodeById(nodeModel.id)
    if (overlapMode !== OverlapMode.INCREASE && nodeModel.autoToFront) {
      graphModel.toFront(nodeModel.id)
    }

    graphModel.eventCenter.emit(EventType.ANCHOR_DRAGSTART, {
      data: anchorData,
      e: event,
      nodeModel,
    })
    this.setState({
      startX: x,
      startY: y,
      endX: x,
      endY: y,
    })
  }
  onDragging = ({ event }: IDragParams) => {
    const { anchorData, nodeModel, graphModel } = this.props
    const {
      transformModel,
      eventCenter,
      width,
      height,
      editConfigModel: { autoExpand, stopMoveGraph },
    } = graphModel
    if (event) {
      const { clientX, clientY } = event
      const {
        domOverlayPosition: { x, y },
        canvasOverlayPosition: { x: x1, y: y1 },
      } = graphModel.getPointByClient({ x: clientX, y: clientY })
      if (this.rafIns) {
        this.rafIns.stop()
      }

      // optimize anchor line dragging behavior while near graph boundary
      let nearBoundary: number[] = []
      const size = 10
      if (x < 10) {
        nearBoundary = [size, 0]
      } else if (x + 10 > width) {
        nearBoundary = [-size, 0]
      } else if (y < 10) {
        nearBoundary = [0, size]
      } else if (y + 10 > height) {
        nearBoundary = [0, -size]
      }

      this.setState({
        endX: x1,
        endY: y1,
        dragging: true,
      })
      this.moveAnchorEnd(x1, y1)

      if (nearBoundary.length > 0 && !stopMoveGraph && autoExpand) {
        // TODO: 验证拖拽到到图边缘时的优化，以及 createRaf 方法功能是否 OK
        this.rafIns = createRaf(() => {
          const [translateX, translateY] = nearBoundary
          transformModel.translate(translateX, translateY)
          const { endX, endY } = this.state
          this.setState({
            endX: endX - translateX,
            endY: endY - translateY,
          })
          this.moveAnchorEnd(endX - translateX, endY - translateY)
        })
        this.rafIns.start()
      }

      eventCenter.emit(EventType.ANCHOR_DRAG, {
        data: anchorData,
        e: event,
        nodeModel,
      })
    }
  }
  onDragEnd = ({ event }: Partial<IDragParams>) => {
    if (this.rafIns) {
      this.rafIns.stop()
    }

    // TODO：check 校验相关逻辑，未添加
    this.checkEnd(event)
    this.setState({
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      dragging: false,
    })

    const { anchorData, nodeModel, graphModel } = this.props
    graphModel.eventCenter.emit(EventType.ANCHOR_DRAGEND, {
      data: anchorData,
      e: event,
      nodeModel,
    })
  }

  getAnchorShape(): h.JSX.Element {
    const { anchorData, style, node } = this.props
    const anchorShape = node.getAnchorShape(anchorData)
    if (anchorShape) return anchorShape

    const { x, y } = anchorData
    const hoverStyle = {
      ...style,
      ...style?.hover,
    }
    return (
      <g>
        <Circle
          className="lf-node-anchor-hover"
          {...hoverStyle}
          {...{ x, y }}
        />
        <Circle className="lf-node-anchor" {...style} {...{ x, y }} />
      </g>
    )
  }

  get customTrajectory() {
    const {
      graphModel: { customTrajectory },
    } = this.props
    return customTrajectory
  }

  isShowLine() {
    const { startX, startY, endX, endY } = this.state
    const v = distance(startX, startY, endX, endY)
    return v > 10
  }

  render(): h.JSX.Element {
    const { startX, startY, endX, endY } = this.state
    const {
      anchorData: { edgeAddable },
      edgeStyle,
    } = this.props

    return (
      // className="lf-anchor" 作为下载时，需要将锚点删除的依据，不要修改类名
      <g className="lf-anchor">
        <g
          onMouseDown={(ev) => {
            if (edgeAddable !== false) {
              this.stepperDrag.handleMouseDown(ev)
            }
          }}
        >
          {this.getAnchorShape()}
        </g>
        {this.isShowLine() &&
          (this.customTrajectory ? (
            this.customTrajectory({
              sourcePoint: { x: startX, y: startY },
              targetPoint: {
                x: endX,
                y: endY,
              },
              ...edgeStyle,
            })
          ) : (
            <Line
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              {...edgeStyle}
              pointer-events="none"
            />
          ))}
      </g>
    )
  }
}

export default Anchor

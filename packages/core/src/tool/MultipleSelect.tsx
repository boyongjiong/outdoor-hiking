import { Component, createElement as h } from 'preact/compat'
import { observer } from 'mobx-preact'
import { forEach, map } from 'lodash'
import { LogicFlow } from '../LogicFlow'
import { GraphModel } from '../model'
import { ElementType, EventType } from '../constant'
import { IDragParams, StepperDrag } from '../common'
import {
  getEdgeOutline,
  getNodeOutline,
  OutlineData,
} from '../algorithm/outline'

export type IMultipleSelectProps = {
  logicflow: LogicFlow
  graphModel: GraphModel
}

export const MultipleSelect = observer(
  class MultipleSelectTool extends Component<IMultipleSelectProps> {
    static toolName = 'multipleSelect'
    stepperDrag: StepperDrag

    constructor(props: IMultipleSelectProps) {
      super()
      const {
        graphModel: { gridSize, eventCenter },
      } = props
      this.stepperDrag = new StepperDrag({
        onDragging: this.onDragging,
        step: gridSize,
        eventType: 'SELECTION',
        eventCenter,
      })
    }

    handleMouseDown = (ev: MouseEvent) => {
      this.stepperDrag.handleMouseDown(ev)
    }

    onDragging = ({ deltaX, deltaY }: IDragParams) => {
      const { graphModel } = this.props
      const selectElements = graphModel.getSelectElements(true)
      graphModel.moveNodes(
        map(selectElements.nodes, (node) => node.id),
        deltaX,
        deltaY,
      )
    }

    handleContextMenu = (ev: MouseEvent) => {
      ev.preventDefault()
      const { graphModel } = this.props
      const { eventCenter, selectElements } = graphModel
      const position = graphModel.getPointByClient({
        x: ev.clientX,
        y: ev.clientY,
      })
      const selectedGraphData: LogicFlow.GraphConfigData = {
        nodes: [],
        edges: [],
      }
      const models = [...selectElements.values()]
      forEach(models, (model) => {
        if (model.baseType === ElementType.NODE) {
          selectedGraphData.nodes.push(model.getData())
        }
        if (model.baseType === ElementType.EDGE) {
          selectedGraphData.edges.push(model.getData())
        }
      })
      eventCenter.emit(EventType.SELECTION_CONTEXTMENU, {
        data: selectedGraphData,
        e: ev,
        position,
      })
    }

    render(): h.JSX.Element | undefined {
      const { graphModel } = this.props
      const { selectElements, transformModel } = graphModel
      if (selectElements.size <= 1) return
      let x = Number.MAX_SAFE_INTEGER
      let y = Number.MAX_SAFE_INTEGER
      let x1 = Number.MIN_SAFE_INTEGER
      let y1 = Number.MIN_SAFE_INTEGER

      selectElements.forEach((element) => {
        let outline: OutlineData = {
          x: 0,
          y: 0,
          x1: 0,
          y1: 0,
        }
        if (element.baseType === ElementType.NODE) {
          outline = getNodeOutline(element)
        }
        if (element.baseType === ElementType.EDGE) {
          const edgeOutline = getEdgeOutline(element)
          if (edgeOutline) {
            outline = edgeOutline
          }
        }

        x = Math.min(x, outline.x)
        y = Math.min(y, outline.y)
        x1 = Math.max(x1, outline.x1)
        y1 = Math.max(y1, outline.y1)
      })
      ;[x, y] = transformModel.cp2Hp([x, y])
      ;[x1, y1] = transformModel.cp2Hp([x1, y1])

      return (
        <div
          className="lf-multiple-select"
          style={{
            left: `${x - 10}px`,
            top: `${y - 10}px`,
            width: `${x1 - x + 20}px`,
            height: `${y1 - y + 20}px`,
          }}
          onMouseDown={this.handleMouseDown}
          onContextMenu={this.handleContextMenu}
        />
      )
    }
  },
)

export default MultipleSelect

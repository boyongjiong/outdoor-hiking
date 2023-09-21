import { map } from 'lodash'
import { observer } from 'mobx-preact'
import { createElement as h, Component } from 'preact/compat'
import { Options } from '../options'
import { LogicFlow } from '../LogicFlow'
import { Dnd } from './behavior'
import { Tool } from '../tool'
import {
  Canvas,
  Operation,
  Outline,
  Snapline,
  ToolOverlay,
  Background,
  Grid,
  IGridProps,
} from './overlay'
import {
  BaseEdgeModel,
  BaseNodeModel,
  GraphModel,
  SnaplineModel,
} from '../model'

export type IGraphProps = {
  options: Options.Common
  // TODO: 确认 component 和 tool 的类型
  // getView: (type: string) => typeof Component;
  getView: (type: string) => any
  tool: Tool
  dnd: Dnd
  snaplineModel?: SnaplineModel
  graphModel: GraphModel
}

export const Graph = observer(
  class Graph extends Component<IGraphProps> {
    getComponent = (
      model: BaseNodeModel | BaseEdgeModel,
      graphModel: GraphModel,
      overlay = 'canvas-overlay',
    ): h.JSX.Element => {
      const { getView } = this.props
      const View = getView(model.type)

      return (
        <View
          key={model.id}
          model={model}
          overlay={overlay}
          graphModel={graphModel}
        />
      )
    }

    render(): h.JSX.Element {
      const { graphModel, options, snaplineModel, dnd, tool } = this.props
      const {
        fakeNode,
        // TODO: 在 ModificationOverlay 组件中使用，待完成
        // editConfigModel: { adjustEdge },
      } = graphModel
      const style: LogicFlow.ContainerTheme = {}
      const { width, height, grid, background, outline, snapline } = options
      if (width) {
        style.width = `${graphModel.width}px`
      }
      if (height) {
        style.height = `${graphModel.height}px`
      }
      return (
        <div className="lf-graph" style={style} flow-id={graphModel.flowId}>
          <Canvas graphModel={graphModel} dnd={dnd}>
            <g class="lf-base">
              {map(graphModel.sortElements, (element) => {
                return this.getComponent(element, graphModel)
              })}
            </g>
            {fakeNode ? this.getComponent(fakeNode, graphModel) : null}
          </Canvas>

          <Operation graphModel={graphModel}>
            {outline && <Outline graphModel={graphModel} />}
            {snapline && <Snapline snapline={snaplineModel} />}
          </Operation>
          <ToolOverlay graphModel={graphModel} tool={tool} />
          {background && <Background background={background} />}
          {grid && <Grid {...(grid as IGridProps)} graphModel={graphModel} />}
        </div>
      )
    }
  },
)

export default Graph

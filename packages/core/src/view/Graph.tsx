import { map } from 'lodash';
import { observer } from 'mobx-preact';
import { h, Component } from 'preact';
import { Options } from "../options";
import { LogicFlow } from '../LogicFlow';
import { Dnd } from './behavior';
import { Canvas, Tool, Background, Grid, IGridProps } from './overlay'
import { BaseEdgeModel, BaseNodeModel, GraphModel, SnaplineModel } from '../model';

export type IGraphProps = {
  options: Options.Common;
  // getView: (type: string) => typeof Component;
  // tool: typeof Tool;
  getView: (type: string) => any;
  tool: any;
  dnd: Dnd;
  snaplineModel?: SnaplineModel;
  graphModel: GraphModel;
}

export const Graph = observer(
  class Graph extends Component<IGraphProps> {
    getComponent(
      model: BaseNodeModel | BaseEdgeModel,
      graphModel: GraphModel,
      overlay = 'canvas-overlay'
    ): h.JSX.Element {
      const { getView } = this.props;
      const View = getView(model.type);

      return (
        <View
          key={model.id}
          model={model}
          overlay={overlay}
          graphModel={graphModel}
        />
      )
    }

    render() {
      const { graphModel, options, dnd, tool } = this.props;
      const {
        fakeNode,
        // TODO: 在 ModificationOverlay 组件中使用，待完成
        // editConfigModel: { adjustEdge },
      } = graphModel;
      const style: LogicFlow.ContainerTheme = {};
      const {
        width,
        height,
        grid,
        background,
      } = options;
      if (width) {
        style.width = `${graphModel.width}px`;
      }
      if (height) {
        style.height = `${graphModel.height}px`;
      }
      return (
        <div
          className="lf-graph"
          style={style}
          flow-id={graphModel.flowId}
        >
          <Canvas
            graphModel={graphModel}
            dnd={dnd}
          >
            <g class="lf-base">
              {
                map(graphModel.sortElements, (node) => (
                  this.getComponent(node, graphModel)
                ))
              }
            </g>
            {
              fakeNode ? this.getComponent(fakeNode, graphModel) : null
            }
          </Canvas>

          <Tool graphModel={graphModel} tool={tool}/>
          {background && <Background background={background} />}
          {grid && <Grid {...grid as IGridProps} graphModel={graphModel}/>}
        </div>
      )
    }
  }
)

export default Graph;

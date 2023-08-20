import { observer } from 'mobx-preact';
import { Component } from 'preact';
import { GraphModel } from '../../model';
import { LogicFlow } from '../../LogicFlow';
import Color = LogicFlow.Color;
import { createUuid } from '../../util'

export type IGridProps = {
  graphModel: GraphModel;
  size: number;
  visible: boolean;
  type: 'dot' | 'mesh';
  config: {
    color: Color;
    thickness: number;
  };
};

export const Grid = observer(
  class GridOverlay extends Component<IGridProps> {
    readonly id: string = createUuid();

    // 点状网格
    renderDot() {
      const {
        config: { color, thickness = 2 },
        size,
        visible,
      } = this.props;
      const length = Math.min(Math.max(2, thickness), size / 2); // 2 <= length <= size / 2
      let opacity = 1;
      if (!visible) opacity = 0;

      return (
        <rect
          width={length}
          rx={length / 2}
          ry={length / 2}
          fill={color}
          opacity={opacity}
        />
      );
    }

    // 交叉线形网格
    renderMesh() {
      const { config, size, visible } = this.props;
      const { color, thickness = 1 } = config;
      const strokeWidth = Math.min(Math.max(1, thickness), size / 2);
      const d = `M ${size} 0 H0 M0 0 V0 ${size}`;
      const opacity = !visible ? 0 : 1;
      return (
        <path
          d={d}
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={opacity}
        />
      )
    }

    render() {
      const { type, size, graphModel } = this.props;
      const {
        transformModel: {
          SCALE_X,
          SKEW_Y,
          SKEW_X,
          SCALE_Y,
          TRANSLATE_X,
          TRANSLATE_Y,
        },
      } = graphModel;

      const matrixStr = [SCALE_X, SKEW_Y, SKEW_X, SCALE_Y, TRANSLATE_X, TRANSLATE_Y].join(',');
      const transform = `matrix(${matrixStr})`;
      return (
        <div class="lf-grid">
          <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="100%" height="100%">
            <defs>
              <pattern
                id={this.id}
                patternUnits="userSpaceOnUse"
                patternTransform={transform}
                x="0"
                y="0"
                width={size}
                height={size}
              >
                {type === 'dot' && this.renderDot()}
                {type === 'mesh' && this.renderMesh()}
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${this.id})`} />
          </svg>
        </div>
      );
    }
  }
)

Grid.defaultProps = {
  size: 20,
  visible: true,
  type: 'dot',
  config: {
    color: '#ababab',
    thickness: 1,
  },
}

export default Grid;

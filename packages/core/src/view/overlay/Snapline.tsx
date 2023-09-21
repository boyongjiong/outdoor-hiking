import { observer } from 'mobx-preact'
import { createElement as h, Component } from 'preact/compat'
import { SnaplineModel } from '../../model'
import { Line } from '../shape'

export type ISnaplineProps = {
  snapline?: SnaplineModel
}

export const Snapline = observer(
  class SnaplineOverlay extends Component<ISnaplineProps> {
    render(): h.JSX.Element | null {
      const { snapline } = this.props
      if (!snapline) {
        return null
      }

      const {
        position: { x, y },
        isShowHorizontal,
        isShowVertical,
      } = snapline

      const style = snapline.getStyle()

      // 展示横向，纵向默认 -100000, 10000 减少计算量
      const horizontalLine = {
        x1: -100000,
        y1: y,
        x2: 100000,
        y2: y,
        ...style,
        stroke: isShowHorizontal ? style.stroke : 'none',
      }
      const verticalLine = {
        x1: x,
        y1: -100000,
        x2: x,
        y2: 100000,
        ...style,
        stroke: isShowVertical ? style.stroke : 'none',
      }

      return (
        <g className="lf-snapline">
          <Line {...horizontalLine} />
          <Line {...verticalLine} />
        </g>
      )
    }
  },
)

export default Snapline

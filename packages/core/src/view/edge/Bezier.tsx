import { createElement as h } from 'preact/compat'
import { map } from 'lodash'
import { LogicFlow } from '../../LogicFlow'
import BaseEdge, { IBaseEdgeProps } from './Base'
import { Path } from '../shape'
import { BezierEdgeModel } from '../../model'
import { getEndTangent } from '../../util'

export interface IBezierEdgeModel extends IBaseEdgeProps {
  model: BezierEdgeModel
}

export class BezierEdge extends BaseEdge<IBezierEdgeModel> {
  /**
   * @overridable 支持重写，此方法为获取边的形状，如果需要自定义边的形状，请重写此方法
   * @example https://codesandbox.io/embed/affectionate-visvesvaraya-uexl0y?fontsize=14&hidenavigation=1&theme=dark
   */
  getEdge(): h.JSX.Element {
    const { model } = this.props
    const style = model.getEdgeStyle()
    const { path, isAnimation, arrowConfig } = model
    const { stroke, strokeDasharray, ...restAnimationStyle } =
      model.getEdgeAnimationStyle()

    return (
      <Path
        d={path}
        {...style}
        {...arrowConfig}
        {...(isAnimation
          ? {
              stroke,
              strokeDasharray,
              style: {
                ...restAnimationStyle,
              },
            }
          : {})}
      />
    )
  }

  /**
   * @overridable 支持重写，在完全自定义边的时候，可以重写此方法，来自定义边的选区
   */
  getAppendWidth(): h.JSX.Element {
    const { path } = this.props.model
    return <Path d={path} stroke="transparent" strokeWidth={10} fill="none" />
  }

  /**
   * @deprecated 方法已废弃
   */
  getArrowInfo(): LogicFlow.ArrowConfig {
    const { model } = this.props
    const { hover } = this.state
    const { isSelected, pointsList } = model
    const { offset } = model.getArrowStyle()

    const points: LogicFlow.Point[] = map(pointsList, ({ x, y }) => ({ x, y }))
    const [ePre, end] = getEndTangent(points, offset)

    return {
      start: ePre,
      end,
      hover,
      isSelected,
    }
  }

  getLastTwoPoints(): LogicFlow.Point[] {
    const { model } = this.props
    const { pointsList } = model
    const { offset } = model.getArrowStyle()
    const points: LogicFlow.Point[] = map(pointsList, ({ x, y }) => ({ x, y }))
    return getEndTangent(points, offset)
  }
}

export default BezierEdge

import { createElement as h } from 'preact/compat'
import { BaseEdge, IBaseEdgeProps } from '.'
import { Line, Path } from '../shape'
import { LogicFlow } from '../../LogicFlow'
import { getAppendAttributes } from '../../util'

export class LineEdge extends BaseEdge<IBaseEdgeProps> {
  /**
   * @overridable 支持重写，此方法为获取边的形状，如果需要自定义边的形状，请重写此方法
   * @example: https://docs.logic-flow.cn/docs/#/zh/guide/basic/edge?id=%e5%9f%ba%e4%ba%8e-react-%e7%bb%84%e4%bb%b6%e8%87%aa%e5%ae%9a%e4%b9%89%e8%be%b9
   */
  getEdge() {
    const { model } = this.props
    const { startPoint, endPoint, isAnimation, arrowConfig } = model
    const style = model.getEdgeStyle()
    const animationStyle = model.getEdgeAnimationStyle()
    const { stroke, strokeDasharray, ...restStyle } = animationStyle

    return (
      <Line
        {...style}
        x1={startPoint.x}
        y1={startPoint.y}
        x2={endPoint.x}
        y2={endPoint.y}
        {...arrowConfig}
        {...(isAnimation
          ? {
              strokeDasharray,
              stroke,
              style: {
                ...restStyle,
              },
            }
          : {})}
      />
    )
  }

  /**
   * @overridable 克重写，在完全自定义边的时候，可以重写此方法，来子定义边的选区
   */
  getAppendWidth(): h.JSX.Element {
    const { model } = this.props
    const { startPoint, endPoint } = model
    const appendInfo: LogicFlow.LineSegment = {
      start: startPoint,
      end: endPoint,
    }
    const appendAttributes = getAppendAttributes(appendInfo)
    return <Path {...appendAttributes} />
  }
}

export default LineEdge

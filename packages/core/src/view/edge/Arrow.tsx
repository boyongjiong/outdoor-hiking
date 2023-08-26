import { createElement as h, Component } from 'preact/compat';
import { Path } from '..';
import { LogicFlow } from '../../LogicFlow';
import { getVerticalPointOfLine } from '../../util'

export type IArrowProps = {
  arrowInfo: LogicFlow.ArrowConfig;
  style: LogicFlow.ArrowTheme;
}

export class Arrow extends Component<IArrowProps> {
  getArrowAttributes(): LogicFlow.ArrowAttributesType {
    const { arrowInfo, style } = this.props;
    const { end } = arrowInfo;
    const config = {
      type: 'end',
      offset: style.offset,
      verticalLength: style.verticalLength,
    };
    // TODO: 确认该算法参数以及对应返回值的意义
    const { leftX, leftY, rightX, rightY } = getVerticalPointOfLine(
      arrowInfo, config.offset, config.verticalLength, 'end',
    );
    return {
      d: `M${leftX} ${leftY} L${end.x} ${end.y} L${rightX} ${rightY} z`,
      ...style,
    };
  }

  getShape(): h.JSX.Element | null {
    const { d, stroke, strokeWidth, fill } = this.getArrowAttributes();
    return (
      <Path
        d={d}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }

  render(): h.JSX.Element {
    return (
      <g className="lf-arrow">
        {this.getShape()}
      </g>
    )
  }
}

export default Arrow;

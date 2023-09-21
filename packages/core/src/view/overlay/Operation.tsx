import { createElement as h, Component } from 'preact/compat'
import { observer } from 'mobx-preact'
import { GraphModel } from '../../model'

export type IOperationProps = {
  graphModel: GraphModel
}

export const Operation = observer(
  class OperationOverlay extends Component<IOperationProps> {
    render(): h.JSX.Element {
      const {
        graphModel: { transformModel },
        children,
      } = this.props
      const { transform } = transformModel.getTransformStyle()

      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          width="100%"
          height="100%"
          className="modification-overlay"
        >
          <g transform={transform}>{children}</g>
        </svg>
      )
    }
  },
)

export default Operation

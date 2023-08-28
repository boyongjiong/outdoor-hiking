import { createElement as h, Component } from 'preact/compat'
import { Options } from '../../options'
import BackgroundConfig = Options.BackgroundConfig

export type IBackgroundProps = {
  background: BackgroundConfig
}

export class Background extends Component<IBackgroundProps> {
  render(): h.JSX.Element {
    const { background } = this.props
    return (
      <div class="lf-background">
        <div class="lf-background-area" style={background} />
      </div>
    )
  }
}

export default Background

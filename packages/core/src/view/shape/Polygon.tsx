import { createElement as h } from 'preact/compat'
import { LogicFlow } from '../..'
import { forEach, toPairs } from 'lodash'

export type IPolygonProps = {
  points?: LogicFlow.PointTuple[]
  className?: string
}

export function Polygon(props: IPolygonProps): h.JSX.Element {
  const { points = [], className } = props
  const attrs: Record<string, unknown> = {
    fill: 'transparent',
    fillOpacity: 1,
    strokeWidth: 1,
    stroke: '#000',
    strokeOpacity: 1,
    points: '',
  }

  forEach(toPairs(props), ([k, v]: [k: string, v: unknown]) => {
    if (typeof v !== 'object') {
      attrs[k] = v
    }
  })

  if (className) {
    attrs.classNmae = `lf-basic-shape ${className}`
  } else {
    attrs.className = 'lf-basic-shape'
  }
  attrs.points = points.map((point) => point.join(',')).join(' ')

  return <polygon {...attrs} />
}

export default Polygon

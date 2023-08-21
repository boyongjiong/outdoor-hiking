import { h } from 'preact';
import { forEach, toPairs } from 'lodash'
import { LogicFlow } from '../../LogicFlow'

export type IPolylineProps = {
  points?: LogicFlow.PointTuple[];
  pathLength?: number | 'none';
  className?: string;
}

export function Polyline(props: IPolylineProps): h.JSX.Element {
  const { points = [], className } = props;
  const attrs: Record<string, unknown> = {
    points: '',
    fill: 'none',
  };

  forEach(toPairs(props), ([k, v]: [k: string, v: unknown]) => {
    if (k === 'style') {
      attrs[k] = v;
    } else {
      if (typeof v !== 'object') {
        attrs[k] = v;
      }
    }
  });
  if (className) {
    attrs.className = `${className}`;
  }
  attrs.points = points.map(point => point.join(',')).join(' ');

  return (
    <polyline {...attrs} />
  );
}

export default Polyline;

import { forEach, toPairs } from 'lodash';
import { createElement as h } from "preact/compat";
import { LogicFlow } from '../..';

export type IEllipseProps = {
  x?: number;
  y?: number;
  rx?: number;
  ry?: number;
  className?: string;
} & LogicFlow.CommonTheme;

export function Ellipse(props: IEllipseProps): h.JSX.Element {
  const {
    x = 0,
    y = 0,
    rx = 4,
    ry = 4,
    className,
  } = props;

  const attrs: Record<string, unknown> = {
    cx: x,
    cy: y,
    rx,
    ry,
    fill: 'transparent',
    fillOpacity: 1,
    strokeWidth: 1,
    stroke: '#000',
    strokeOpacity: 1,
  };
  forEach(toPairs(props), ([k, v]: [k: string, v: unknown]) => {
    if (typeof v !== 'object') {
      attrs[k] = v;
    }
  });

  if (className) {
    attrs.className = `lf-basic-shape ${className}`;
  } else {
    attrs.className = `lf-basic-shape`;
  }

  return (
    <ellipse {...attrs} />
  );
}

export default Ellipse;

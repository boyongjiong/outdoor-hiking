import { createElement as h } from "preact/compat";
import { forEach, toPairs } from 'lodash';
import { LogicFlow } from '../../LogicFlow';

export type IRectProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  className?: string;
  radius?: LogicFlow.NumberOrPercent;
  [key: string]: unknown;
}

export function Rect(props: IRectProps): h.JSX.Element {
  const {
    x,
    y,
    width,
    height,
    className,
    strokeWidth,
    radius = 0,
  } = props;

  const leftTopX = x - width / 2;
  const leftTopY = y - height / 2;
  const attrs: Record<string, unknown> = {};
  attrs['stroke-width'] = strokeWidth;
  forEach(toPairs(props), ([k, v]: [k: string, v: unknown]) => {
    if (typeof v !== 'object') {
      attrs[k] = v;
    }
  });

  if (className) {
    attrs.className = `lf-basic-shape ${className}`;
  } else {
    attrs.className = 'lf-basic-shape';
  }

  if (radius) {
    attrs.rx = radius;
    attrs.ry = radius;
  }
  attrs.x = leftTopX;
  attrs.y = leftTopY;

  return (
    <rect {...attrs} />
  );
}

export default Rect;

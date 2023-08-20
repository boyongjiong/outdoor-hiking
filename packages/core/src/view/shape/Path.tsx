import { h } from 'preact';
import {forEach, toPairs} from 'lodash'

export type IPathProps = {
  d: string;
  [key: string]: unknown;
};

export function Path(props: IPathProps): h.JSX.Element {
  const attrs: Record<string, unknown> = {
    d: '',
  };
  forEach(toPairs(props), ([k, v]: [key: string, v: unknown]) => {
    if (k === 'style' || typeof v !== 'object') {
      attrs[k] = v;
    }
  });

  return (
    <path {...attrs} />
  );
}

export default Path

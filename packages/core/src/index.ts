import { observer as mobxObserver } from 'mobx-preact';

export { h } from 'preact';
export * from './LogicFlow.tsx';

export function observer<P>(props: P) {
  return mobxObserver(props as any);
}

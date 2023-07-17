import { observer as mobxObserver } from 'mobx-react';
import { h } from 'preact';
import LogicFlow from './LogicFlow.tsx';

export function observer<P>(props: P) {
  return mobxObserver(props);
}

export { LogicFlow, h };

export default LogicFlow;

import { observer as mobxObserver } from 'mobx-preact';
import LogicFlow from './LogicFlow';
import * as LogicFlowUtils from './util';

export { h } from 'preact';

export function observer<P>(props: P) {
  return mobxObserver(props as any);
}

export * from './view';
export * from './model';
export * from './options';
export * from './constant';

export {
  LogicFlow,
  LogicFlowUtils,
}

export default LogicFlow;

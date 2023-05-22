import { observer as mobxObserver } from 'mobx-react';
import LogicFlow from './LogicFlow.tsx';

export function observer<P>(props: P) {
  return mobxObserver(props);
}

export { LogicFlow };

export default LogicFlow;

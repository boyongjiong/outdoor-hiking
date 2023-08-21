import { action, observable, computed, toJS, isObservable, configure } from 'mobx';

configure({ isolateGlobalState: true });

export {
  action,
  observable,
  computed,
  toJS,
  isObservable,
  configure,
};

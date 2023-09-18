import { observer as mobxObserver } from 'mobx-preact'
import LogicFlow from './LogicFlow'
import * as LogicFlowUtils from './util'

export { createElement as h } from 'preact/compat'
console.log('111')
export function observer<P>(props: P) {
  return mobxObserver(props as any)
}

export * from './view'
export * from './model'
export * from './options'
export * from './constant'

export { LogicFlow, LogicFlowUtils }

export default LogicFlow

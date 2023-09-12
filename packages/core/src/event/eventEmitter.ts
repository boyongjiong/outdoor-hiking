export interface EventType {
  readonly callback: (params?: unknown) => unknown
  readonly once: boolean
}

export type EventArgs = Record<string, unknown>
export type EventsType = Record<string, EventType[]>
export type CallbackType = (...args: unknown[]) => void

export default class EventEmitter {
  private _events: EventsType = {}

  /**
   * 添加一个监听事件
   * @param evt 事件名称
   * @param callback 回调方法
   * @param once 是否触发一次
   * @returns 当前 EventEmitter 实例
   */
  on(evt: string, callback: CallbackType, once?: boolean) {
    evt?.split(',').forEach((evtKey: string) => {
      const trimEvtKey = evtKey.trim()
      if (!this._events[trimEvtKey]) {
        this._events[trimEvtKey] = []
      }
      this._events[trimEvtKey].push({
        callback,
        once: !!once,
      })
    })

    return this
  }

  /**
   * 监听一个事件一次
   * @param evt 事件名称
   * @param callback 回调方法
   */
  once(evt: string, callback: CallbackType) {
    evt?.split(',').forEach((evtKey: string) => {
      const trimEvtKey = evtKey.trim()
      return this.on(trimEvtKey, callback, true)
    })
  }

  /**
   * 取消监听一个事件，或者一个 Channel
   * @param eventsKey
   * @param callback
   */
  off(eventsKey: string, callback?: CallbackType) {
    if (!eventsKey) {
      this._events = {}
    }

    eventsKey.split(',').forEach((key: string) => {
      const evtKey = key.trim()

      if (!callback) {
        // evtKey 对应事件存在，callback 为空，则清除事件所有方法
        delete this._events[evtKey]
      } else {
        // evtKey 存在，callback 存在，清除匹配的
        const events = this._events[evtKey] || []
        let count = events.length
        for (let i = 0; i < count; i++) {
          if (events[i].callback === callback) {
            events.splice(i, 1)
            count -= 1
            i -= 1
          }
        }

        if (events.length === 0) {
          delete this._events[evtKey]
        }
      }
    })

    return this
  }

  /**
   * 主动触发事件
   * @param eventsKey 触发事件名称
   * @param eventArgs 事件参数
   */
  emit(eventsKey: string, eventArgs: EventArgs) {
    eventsKey?.split(',').forEach((key: string) => {
      const evtKey = key.trim()
      const events = this._events[evtKey] || []
      const wildcardEvents = this._events[WILDCARD] || []

      // 实际的处理 emit 方法
      const doEmit = (event: EventType[]) => {
        const count = event.length
        for (let i = 0; i < count; i++) {
          const current = event[i]
          if (!current) {
            continue
          }
          const { callback, once } = current
          if (once) {
            event.splice(i, 1)
            if (event.length === 0) {
              delete this._events[evtKey]
            }
            length -= 1
            i -= 1
          }

          callback.apply(this, [eventArgs])
        }
      }
      doEmit(events)
      doEmit(wildcardEvents)
    })
  }

  /**
   * 获取当前所有事件
   * @returns _events
   */
  getEvents() {
    return this._events
  }
}

const WILDCARD = '*'
export { WILDCARD, EventEmitter }

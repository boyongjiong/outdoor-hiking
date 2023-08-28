import { SnaplineModel } from '../model'
import EventEmitter from '../event/eventEmitter'

export const snaplineTool = (
  eventCenter: EventEmitter,
  snaplineModel: SnaplineModel,
) => {
  // 节点拖拽时启动对齐连计算
  // TODO: 确认下面 data 的数据类型
  eventCenter.on('node:mousemove', ({ data }: any) => {
    snaplineModel.setNodeSnapline(data)
  })

  // 节点拖动结束时，对齐线消失
  eventCenter.on('node:mouseup', () => {
    snaplineModel.clearSnapline()
  })
}

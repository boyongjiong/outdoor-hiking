import { assign, pick } from 'lodash'
import { observable, action } from 'mobx'

export class EditConfigModel {
  @observable isSilentMode = false
  @observable stopZoomGraph = false
  @observable stopScrollGraph = false
  @observable stopMoveGraph = false
  @observable adjustEdge = true
  @observable adjustEdgeMiddle = false
  @observable adjustEdgeStartAndEnd = false
  @observable adjustNodePosition = true
  @observable hideAnchors = false
  @observable allowRotation = true
  @observable hoverOutline = true
  @observable nodeSelectedOutline = true
  @observable edgeSelectedOutline = true
  @observable nodeTextEdit = true
  @observable edgeTextEdit = true
  @observable nodeTextDraggable = false
  @observable edgeTextDraggable = false
  @observable autoExpand = false

  multipleSelectKey = ''
  defaultConfig = {} // 设置为静默模式之前的配置，在取消静默模式后恢复

  constructor(config: EditConfigModel.Options) {
    assign(this, this.getCurrentConfig(config))
  }

  getCurrentConfig(config: EditConfigModel.Options) {
    const { SilentModeConfig, defaultKeys } = EditConfigModel
    const { isSilentMode, textEdit } = config
    const curConfig = {}

    // false 表示要切换为怎么「静默模式」
    if (isSilentMode === false) {
      assign(curConfig, this.defaultConfig)
    }

    // 如果不传 isSilentMode，默认 undefined 表示「非静默模式」
    if (isSilentMode === true && isSilentMode !== this.isSilentMode) {
      // https://github.com/didi/LogicFlow/issues/1180
      // 如果重复调用isSilentMode=true多次，会导致this.defaultConfig状态保存错误：保存为修改之后的Config
      // 因此需要阻止重复赋值为true，使用config.isSilentMode !== this.isSilentMode
      const silentConfig = pick(SilentModeConfig, defaultKeys)

      // 缓存修改之前上次的 config，用于切换 isSilentMode 后恢复配置
      this.defaultConfig = pick(this, defaultKeys)
      assign(curConfig, silentConfig)
    }

    // 如果不传 textEdit，默认 undefined 表示「允许文本编辑」
    if (textEdit === false) {
      assign(curConfig, {
        nodeTextEdit: false,
        edgeTextEdit: false,
      })
    }

    const userConfig = pick(config, defaultKeys)
    return assign(curConfig, userConfig)
  }

  getConfig() {
    return pick(this, EditConfigModel.defaultKeys)
  }

  @action updateEditConfig(config: EditConfigModel.Options) {
    const newConfig = this.getCurrentConfig(config)
    assign(this, newConfig)
  }
}

export namespace EditConfigModel {
  export interface Options {
    // 是否为静默模式
    isSilentMode?: boolean
    // 禁止缩放画布
    stopZoomGraph?: boolean
    // 禁止鼠标滚动移动画布
    stopScrollGraph?: boolean
    // 禁止拖动画布
    stopMoveGraph?:
      | boolean
      | 'vertical'
      | 'horizontal'
      | [number, number, number, number]
    // 允许调整边
    adjustEdge?: boolean
    // 允许调整边起点和终点
    adjustEdgeStartAndEnd?: boolean
    // 允许拖动节点
    adjustNodePosition?: boolean
    // 隐藏节点所有锚点
    hideAnchors?: boolean
    // 是否允许节点旋转（旋转点的显隐）
    allowRotation?: boolean
    // 显示节点悬浮时的外框
    hoverOutline?: boolean
    // 节点被选中时是否显示 outline
    nodeSelectedOutline?: boolean
    // 边被选中时是否显示 outline
    edgeSelectedOutline?: boolean
    // 允许节点文本可以编辑
    nodeTextEdit?: boolean
    // 允许边文本可以编辑
    edgeTextEdit?: boolean
    // 允许文本编辑
    textEdit?: boolean
    // 允许节点文本可以拖拽
    nodeTextDraggable?: boolean
    // 允许边文本可以拖拽
    edgeTextDraggable?: boolean
    // 多选按键，支持 meta（cmd）、shift、alt
    // 不支持 ctrl， ctrl 会触发 contextmenu
    multipleSelectKey?: boolean
  }

  export const SilentModeConfig: Options = {
    stopZoomGraph: false, // 禁止缩放画布
    stopScrollGraph: false, // 禁止鼠标滚动移动画布
    stopMoveGraph: false, // 禁止拖动画布
    adjustEdge: false, // 允许调整边
    adjustEdgeStartAndEnd: false, // 允许调整边起点和终点
    adjustNodePosition: false, // 允许拖动节点
    hideAnchors: true, // 隐藏节点所有锚点
    allowRotation: true, // 是否允许节点旋转（旋转点的显隐）
    nodeSelectedOutline: true, // 节点被选中时是否显示 outline
    nodeTextEdit: false, // 允许节点文本可以编辑
    edgeTextEdit: false, // 允许边文本可以编辑
    nodeTextDraggable: false, // 允许节点文本可以拖拽
    edgeTextDraggable: false, // 允许边文本可以拖拽
  }

  export const defaultKeys = [
    'isSilentMode',
    'stopZoomGraph',
    'stopScrollGraph',
    'stopMoveGraph',
    'adjustEdge',
    'adjustEdgeMiddle',
    'adjustEdgeStartAndEnd',
    'adjustNodePosition',
    'hideAnchors',
    'allowRotation',
    'hoverOutline',
    'nodeSelectedOutline',
    'edgeSelectedOutline',
    'nodeTextEdit',
    'edgeTextEdit',
    'nodeTextDraggable',
    'edgeTextDraggable',
    'multipleSelectKey',
    'autoExpand',
  ]
}

export default EditConfigModel

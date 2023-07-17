export enum ElementState {
  DEFAULT = 1, // 默认显示
  TEXT_EDIT, // 此元素正在进行文本编辑
  SHOW_MENU, // 显示菜单，废弃请使用菜单插件
  ALLOW_CONNECT, // 此元素允许作为当前边的目标节点
  NOT_ALLOW_CONNECT, // 此元素不允许作为当前边的目标节点
}

export enum ElementType {
  NODE = 'node',
  EDGE = 'edge',
  GRAPH = 'graph',
}

export enum OverlapMode {
  DEFAULT = 0,
  INCREASE = 1,
}

export const ElementMaxZIndex = 9999;

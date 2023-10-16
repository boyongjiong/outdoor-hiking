export const snapToGrid = (coord: number, gridSize: number) => {
  // 保证 x, y 的值为 gridSize 的整数倍
  return gridSize * Math.floor(coord / gridSize) || coord
}

/**
 * 获取节点偏移时，产生的偏移量。当节点基于 gridSize 进行了偏移后
 * 节点上的问题本可以基于此方法移动对应的距离，来保持与节点的相对位置不变
 * @param distance
 * @param gridSize
 */
export const getGridOffset = (distance: number, gridSize: number) => {
  return distance % gridSize
}

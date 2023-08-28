export const snapToGrid = (coord: number, gridSize: number) => {
  return gridSize * Math.round(coord / gridSize) || coord
}

export const getGridOffset = (distance: number, gridSize: number) => {
  return distance % gridSize
}

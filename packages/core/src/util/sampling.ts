import { LogicFlow } from '../LogicFlow'
import { distance } from './node'
import Point = LogicFlow.Point
import Vector = LogicFlow.Vector

const SAMPLING_FREQUENCY = 100
const normal: Vector = {
  x: 1,
  y: 0,
  z: 0,
}

/**
 * 采样三次贝塞尔曲线上的点
 * 假设采样频率为SAMPLING_FREQUENCY, 取倒数第1-6/SAMPLING_FREQUENCY个点即t=1-6/SAMPLING_FREQUENCY
 * @param p1 控制点 p1
 * @param cp1 控制点 cp1
 * @param cp2 控制点 cp2
 * @param p2 控制点 p2
 * @param offset 曲线上与终点的距离，计算箭头的垂点
 */
export const sampleCubic = (
  p1: Point,
  cp1: Point,
  cp2: Point,
  p2: Point,
  offset: number,
): Point => {
  const program = (t: number): Point => {
    if (t < 0 || t > 1) {
      throw new RangeError('The value range of parameter "t" is [0,1]')
    }
    return {
      x:
        p1.x * (1 - t) ** 3 +
        3 * cp1.x * t * (1 - t) ** 2 +
        3 * cp2.x * t ** 2 * (1 - t) +
        p2.x * t ** 3,
      y:
        p1.y * (1 - t) ** 3 +
        3 * cp1.y * t * (1 - t) ** 2 +
        3 * cp2.y * t ** 2 * (1 - t) +
        p2.y * t ** 3,
    }
  }
  // fix: https://github.com/didi/LogicFlow/issues/951
  // 计算贝塞尔曲线上与终点距离为offset的点，作为箭头的的垂点。
  let arrowDistance = 0
  let t = 2
  const { x: x1, y: y1 } = p2
  let point = p2
  while (arrowDistance < offset && t < 50) {
    point = program(1 - t / SAMPLING_FREQUENCY)
    const { x: x2, y: y2 } = point
    arrowDistance = distance(x1, y1, x2, y2)
    t++
  }
  return point
}

/**
 * 叉乘求 z 轴
 * @param v 起始向量
 * @param w 终点向量
 */
export const crossByZ = (v: Vector, w: Vector): number => {
  return v.x * w.y - v.y * w.x
}

/**
 * 点乘算法
 * @param v
 * @param w
 */
export const dot = (v: Vector, w: Vector): number => {
  const v1 = [v.x, v.y, v.z]
  const v2 = [w.x, w.y, w.z]
  return v2.reduce((prev, cur, index) => prev + cur * v1[index])
}

/**
 * 计算向量夹角
 * @param v1
 * @param v2
 */
export const angle = (v1: Vector, v2: Vector): number => {
  const negative = crossByZ(v1, v2)
  const r = Math.acos(dot(normalize(v1), normalize(v2)))
  return negative >= 0 ? r : -r
}

/**
 * 归一化（向量缩放到 0,1 区间）
 * @param v
 */
export const normalize = (v: Vector): Vector => {
  const len = Math.hypot(v.x, v.y)
  return {
    x: v.x / len,
    y: v.y / len,
    z: 0,
  }
}

/**
 * 计算 x 轴正方向与向量夹角（弧度）
 * @param v
 */
export const getThetaOfVector = (v: Vector): number => {
  return angle(normal, v)
}

/**
 * 弧度转角度
 * @param radians 弧度
 */
export const degrees = (radians: number): number => {
  return radians * (180 / Math.PI)
}

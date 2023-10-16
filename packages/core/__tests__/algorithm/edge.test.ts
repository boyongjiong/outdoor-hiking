import {
  closestPointOnPolyline,
  isPointOnLineSegment,
} from '../../src/algorithm/edge'

describe('algorithm/edge', () => {
  const polyline = [
    {
      start: { x: 0, y: 0 },
      end: { x: 100, y: 100 },
    },
    {
      start: { x: 100, y: 100 },
      end: { x: 200, y: 0 },
    },
    {
      start: { x: 200, y: 0 },
      end: { x: 300, y: 0 },
    },
    {
      start: { x: 300, y: 0 },
      end: { x: 200, y: 100 },
    },
    {
      start: { x: 200, y: 100 },
      end: { x: 400, y: 100 },
    },
    {
      start: { x: 500, y: 100 },
      end: { x: 500, y: 0 },
    },
  ]
  const point1 = { x: 0, y: 100 }
  const point2 = { x: 150, y: 0 }
  const point3 = { x: 200, y: 50 }
  const point4 = { x: 300, y: 0 }
  const point5 = { x: 400, y: 50 }
  const gridSize = 1
  test('get closest point on polyline', () => {
    expect(closestPointOnPolyline(point1, polyline, gridSize)).toEqual({
      x: 50,
      y: 50,
    })
    expect(closestPointOnPolyline(point2, polyline, gridSize)).toEqual({
      x: 50,
      y: 50,
    })
    expect(closestPointOnPolyline(point3, polyline, gridSize)).toEqual({
      x: 175,
      y: 25,
    })
    expect(closestPointOnPolyline(point4, polyline, gridSize)).toEqual({
      x: 300,
      y: 0,
    })
    expect(closestPointOnPolyline(point5, polyline, gridSize)).toEqual({
      x: 400,
      y: 100,
    })
  })
  test('if the point is on a segment', () => {
    expect(
      isPointOnLineSegment(point1, polyline[0].start, polyline[0].end),
    ).toBe(false)
    expect(
      isPointOnLineSegment(point4, polyline[0].start, polyline[0].end),
    ).toBe(false)
    expect(
      isPointOnLineSegment(point4, polyline[3].start, polyline[3].end),
    ).toBe(true)
  })
})

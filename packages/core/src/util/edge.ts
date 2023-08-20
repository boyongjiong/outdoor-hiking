import { forEach, map, pick } from 'lodash';
import LogicFlow from '../LogicFlow';
import { GraphModel } from '../model';
import { Options } from '../options';
import Point = LogicFlow.Point;
import NodeData = LogicFlow.NodeData;
import EdgeData = LogicFlow.EdgeData;
import LineSegment = LogicFlow.LineSegment;
import AppendAttributes = LogicFlow.AppendAttributes;

// 从用户传入的数据中，获取规范的节点初始化数据
export const pickEdgeConfig = (data: LogicFlow.EdgeConfig) => {
  return pick(data, [
    'id',
    'type',
    'sourceNodeId',
    'sourceAnchorId',
    'targetNodeId',
    'targetAnchorId',
    'startPoint',
    'endPoint',
    'text',
    'pointsList',
    'zIndex',
    'properties',
  ]);
}

export const calcTwoPointDistance = (
  source: Point,
  target: Point,
): number => {
  // fix: 修复坐标存在负值时，计算错误的问题
  // const source = {
  //  x: p1.x,
  //  y: Math.abs(p1.y),
  // };
  // const target = {
  //  x: Math.abs(p2.x),
  //  y: Math.abs(p2.y),
  // };
  return Math.sqrt((source.x - target.x) ** 2 + (source.y - target.y) ** 2);
}

export const pointsStr2PointsList = (pointsStr: string): Point[] => {
  const positionPairList = pointsStr.split(' ');
  return map(positionPairList, (pair) => {
    const [x, y] = pair.split(',');
    return {
      x: +x,
      y: +y,
    };
  });
};

export const pointsList2Polyline = (pointsList: Point[]): LineSegment[] => {
  const polyline: LineSegment[] = []
  for (let i = 0; i < pointsList.length - 1; i++) {
    polyline.push({
      start: pointsList[i],
      end: pointsList[i + 1],
    });
  }

  return polyline;
};

export type VerticalPointOfLine = {
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
}
/**
 * TODO: 优化该算法并确认是否还有需要
 * 计算垂直边的与起始点有一定距离对称，连线垂直于边的点
 * @param line 待计算的线段
 * @param offset 线段方向上的距离
 * @param verticalOffset 垂直线段的距离
 * @param type 'start' | 'end' 开始还是结束点
 */
export const getVerticalPointOfLine = (
  line: LineSegment,
  offset: number,
  verticalOffset: number,
  type: 'start' | 'end'
): VerticalPointOfLine => {
  const { start, end } = line;
  const position = {
    leftX: 0,
    leftY: 0,
    rightX: 0,
    rightY: 0,
  };
  const angleOfHorizontal = Math.atan((end.y - start.y) / (end.x - start.x));
  // 边和两边点的夹角
  const angleOfPoints = Math.atan(offset / verticalOffset);
  // 线段的长度
  const length = Math.sqrt(verticalOffset ** 2 + offset ** 2);

  // 依托答辩？？？ 亟待优化
  if (type === 'start') {
    if (end.x >= start.x) {
      position.leftX = start.x + length * Math.sin(angleOfHorizontal + angleOfPoints);
      position.leftY = start.y - length * Math.cos(angleOfHorizontal + angleOfPoints);
      position.leftY = start.x - length * Math.sin(angleOfHorizontal - angleOfPoints);
      position.leftY = start.y + length * Math.cos(angleOfHorizontal - angleOfPoints);
    } else {
      position.leftX = start.x - length * Math.sin(angleOfHorizontal + angleOfPoints);
      position.leftY = start.y + length * Math.cos(angleOfHorizontal + angleOfPoints);
      position.leftY = start.x + length * Math.sin(angleOfHorizontal - angleOfPoints);
      position.leftY = start.y - length * Math.cos(angleOfHorizontal - angleOfPoints);
    }
  } else if (type === 'end') {
    if (end.x >= start.x) {
      position.leftX = end.x + length * Math.sin(angleOfHorizontal + angleOfPoints);
      position.leftY = end.y - length * Math.cos(angleOfHorizontal + angleOfPoints);
      position.leftY = end.x - length * Math.sin(angleOfHorizontal - angleOfPoints);
      position.leftY = end.y + length * Math.cos(angleOfHorizontal - angleOfPoints);
    } else {
      position.leftX = end.x - length * Math.sin(angleOfHorizontal + angleOfPoints);
      position.leftY = end.y + length * Math.cos(angleOfHorizontal + angleOfPoints);
      position.leftY = end.x + length * Math.sin(angleOfHorizontal - angleOfPoints);
      position.leftY = end.y - length * Math.cos(angleOfHorizontal - angleOfPoints);
    }
  }

  return position;
};

export const calculateOffsetPolyline = () => {};

export const createEdgeGenerator = (
  graphModel: GraphModel,
  generator?: Options.EdgeGeneratorType | unknown
): any => {
  if (typeof generator !== 'function') {
    return (
      _sourceNode: NodeData,
      _targetNode: NodeData,
      currentEdge?: EdgeData,
    ) => Object.assign(
      { type: graphModel.edgeType },
      currentEdge,
    );
  }

  return (
    sourceNode: NodeData,
    targetNode: NodeData,
    currentEdge?: EdgeData,
  ) => {
    const result = generator(sourceNode, targetNode, currentEdge);
    // 若无结果，使用默认类型
    if (!result) {
      return { type: graphModel.edgeType };
    }
    if (typeof result === 'string') {
      return Object.assign({}, currentEdge, { type: result });
    }
    return Object.assign({ type: result }, currentEdge);
  };
};

/**
 * 获取字符串的字节长度
 * @param words
 */
export const getBytesLength = (words: string): number => {
  if (!words) return 0;

  let totalLength = 0;
  for (let i = 0; i < words.length; i++) {
    const c = words.charCodeAt(i);
    const word = words.charAt(i);

    if (word.match(/[A-Z]/)) {
      totalLength += 1.5;
    } else if ((c >= 0x0001 && c <= 0x007e) || (c >= 0xff60 && c <= 0xff9f)) {
      totalLength += 1;
    } else {
      totalLength += 2;
    }
  }
  return totalLength;
}

// 获取 Svg 标签文案高度，自动换行
export type IGetSvgTextSizeParams = {
  rows: string[];
  rowsLength: number;
  fontSize: number;
}
export const getSvgTextSize = (
  { rows, rowsLength, fontSize }: IGetSvgTextSizeParams
): LogicFlow.RectSize => {
  let longestBytes = 0;
  forEach(rows, (row) => {
    const rowBytesLength = getBytesLength(row);
    longestBytes = rowBytesLength > longestBytes ? rowBytesLength : longestBytes;
  });

  // 背景框宽度，最长一行字节数/2 * fontsize + 2
  // 背景框宽度， 行数 * fontsize + 2
  return {
    width: Math.ceil(longestBytes / 2) * fontSize + fontSize / 4,
    height: rowsLength * (fontSize + 2) + fontSize / 4,
  };
};

export const getAppendAttributes = (appendInfo: LineSegment): AppendAttributes => {
  const { start, end } = appendInfo;
  let d: string = '';
  if (start.x === end.x && start.y === end.y) {
    d = '';
  } else {
    const offset = 10;
    const verticalLength = 5;
    const startPos = getVerticalPointOfLine(appendInfo, offset, verticalLength, 'start');
    const endPos = getVerticalPointOfLine(appendInfo, offset, verticalLength, 'end');

    d = `M${startPos.leftX} ${startPos.leftY}
      L${startPos.rightX} ${startPos.rightY}
      L${endPos.rightX} ${endPos.rightY}
      L${endPos.leftX} ${endPos.leftY} z`;
  }
  return {
    d,
    fill: 'transparent',
    stroke: 'transparent',
    strokeWidth: 1,
    strokeDasharray: '4, 4',
  };
}

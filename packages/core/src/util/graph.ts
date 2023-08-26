import { find } from 'lodash';
import LogicFlow from '../LogicFlow';
import { getNodeBBox } from './node';
import { ElementType } from '../constant';
import {BaseEdgeModel, BaseNodeModel, EditConfigModel, TransformModel} from '../model'

export type Element = BaseNodeModel | BaseEdgeModel;

export const getElementById = (id: string, elements: Element[]) => {
  return find(elements, (elem: Element) => elem.id === id);
};

/**
 * 判断一个点是否在指定区域
 * @param point [x, y] 需要判断的点坐标轴
 * @param ltX leftTopPoint X 轴坐标值
 * @param ltY leftTopPoint Y 轴坐标值
 * @param rbX rightBottomPoint X 轴坐标值
 * @param rbY rightBottomPoint Y 轴坐标值
 */
export const isPointInArea = (
  [x, y]: LogicFlow.PointTuple,
  [ltX, ltY]: LogicFlow.PointTuple,
  [rbX, rbY]: LogicFlow.PointTuple,
): boolean =>
  x > ltX && x < rbX && y > ltY && y < rbY;

/**
 *
 * @param element
 * @param lt
 * @param rb
 * @param wholeEdge
 * @param wholeNode
 * @param transformModel
 */
export const isElementInArea = (
  element: Element,
  lt: LogicFlow.PointTuple,
  rb: LogicFlow.PointTuple,
  wholeEdge: boolean = true,
  wholeNode: boolean = true,
  transformModel: TransformModel,
): boolean => {
  if (element.baseType === ElementType.NODE) {
    const { minX, minY, maxX, maxY } = getNodeBBox(element);
    const bBoxPointsList: LogicFlow.Position[] = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ];
    let isInArea = wholeNode;
    for (let i = 0; i < bBoxPointsList.length; i++) {
      let { x, y } = bBoxPointsList[i];
      // TODO: 这个该如何是好？？？
      // 将当前 transformModel. SCALE_X/SCALE_Y/TRANSLATE_X/TRANSLATE_Y 等传值进来
      [x, y] = transformModel.cp2Hp([x, y]);
      if (isPointInArea([x, y], lt, rb) !== wholeNode) {
        isInArea = !wholeNode;
        break;
      }
    }
    return isInArea;
  }
  if (element.baseType === ElementType.EDGE) {
    const { startPoint, endPoint } = element;
    if (startPoint && endPoint) {
      // DONE: 如何优化此处的方法: 将 transformModel 用参数传入
      const startHtmlPoint = transformModel.cp2Hp([startPoint.x, startPoint.y]);
      const endHtmlPoint = transformModel.cp2Hp([endPoint.x, endPoint.y]);

      const isStartInArea = isPointInArea(startHtmlPoint, lt, rb);
      const isEndInArea = isPointInArea(endHtmlPoint, lt, rb);
      return wholeEdge
        ? isStartInArea && isEndInArea
        : isStartInArea || isEndInArea;
    }
  }
  return false;
};

export const isMultipleSelect = (e: MouseEvent, editConfigModel: EditConfigModel): boolean | string => {
  const { multipleSelectKey } = editConfigModel;
  let isMultiple: boolean | string = false;
  switch (multipleSelectKey) {
    case 'meta':
      isMultiple = e.metaKey;
      break
    case 'alt':
      isMultiple = e.altKey;
      break;
    case 'shift':
      isMultiple = e.shiftKey;
      break;
    case 'ctrl':
      isMultiple = e.ctrlKey;
      break;
    default:
      isMultiple = false;
      break;
  }
  return isMultiple;
};

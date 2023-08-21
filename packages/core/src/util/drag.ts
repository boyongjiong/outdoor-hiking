import { noop } from 'lodash';
import { Model } from '../model';
import { EventType } from '../constant'
import EventEmitter from '../event/eventEmitter'

const document = window.document;
const LEFT_MOUSE_BUTTON_CODE = 0;

export type IDragParams = {
  deltaX?: number;
  deltaY?: number;
  event: MouseEvent | null;
  [key: string]: unknown
}

export type ICreateDragParams = {
  onDragStart?: (params: IDragParams) => void;
  onDragging?: (param: IDragParams) => void;
  onDragEnd?: (param: IDragParams) => void;
  step?: number;
  isStopPropagation?: boolean;
}
export function createDrag({
  onDragStart = noop,
  onDragging = noop,
  onDragEnd = noop,
  step = 1,
  isStopPropagation = true,
}: ICreateDragParams): (e: MouseEvent) => void {
  let isDragging = false;
  let isStartDrag = false;
  let startX = 0;
  let startY = 0;
  let totalDeltaX = 0;
  let totalDeltaY = 0;

  function handleMoseMove(e: MouseEvent) {
    if (isStopPropagation) {
      e.stopPropagation();
    }
    if (!isStartDrag) return;

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    totalDeltaX += e.clientX - startX;
    totalDeltaY += e.clientY - startY;

    if (Math.abs(totalDeltaX) > step || Math.abs(totalDeltaY) > step) {
      const remainderX = totalDeltaX % step;
      const remainderY = totalDeltaY % step;
      const deltaX = totalDeltaX - remainderX;
      const deltaY = totalDeltaY - remainderY;
      onDragging({ deltaX, deltaY, event: e });
    }
  }

  function handleMouseUp(e: MouseEvent) {
    if (isStopPropagation) {
      e.stopPropagation();
    }
    isStartDrag = false;

    document.removeEventListener('mousemove', handleMoseMove, false);
    document.removeEventListener('mouseup', handleMouseUp, false);

    if (isDragging) return;
    isDragging = false;
    return onDragEnd({ event: e });
  }

  function handleMoseDown(e: MouseEvent) {
    if (e.button !== LEFT_MOUSE_BUTTON_CODE) return;
    if (isStopPropagation) e.stopPropagation();

    isStartDrag = true;
    startX = e.clientX;
    startY = e.clientY;

    document.addEventListener('mousemove', handleMoseMove, false);
    document.addEventListener('mouseup', handleMouseUp, false);
    return onDragStart({ event: e });
  }

  return handleMoseDown;
}

export type IStepperDragProps = {
  eventType?: 'NODE' | 'BLANK' | 'SELECTION' | 'ADJUST_POINT' | '';
  eventCenter?: EventEmitter,
  model?: Model.BaseModel,
  data?: Record<string, unknown>,
  [key: string]: unknown;
} & Partial<ICreateDragParams>;
/**
 * 支持拖拽时按步长进行移动
 * REMIND：在绘制的过程中因为放大缩小，移动的真实 step 是变化的
 */
export class StepperDrag {
  // 初始化
  onDragStart: (params: IDragParams) => void;
  onDragging: (params: IDragParams) => void;
  onDragEnd: (params: IDragParams) => void;

  step: number;
  isStopPropagation: boolean;
  eventType: 'NODE' | 'BLANK' | 'SELECTION' | 'ADJUST_POINT' | '';
  eventCenter?: EventEmitter;
  model?: Model.BaseModel;
  data?: Record<string, unknown>;

  // 运行时
  isDragging: boolean = false;
  isStartDrag: boolean = false;

  startX: number = 0;
  startY: number = 0;
  totalDeltaX: number = 0;
  totalDeltaY: number = 0;

  startTime?: number;
  constructor({
    onDragStart = noop,
    onDragging = noop,
    onDragEnd = noop,
    step = 1,
    eventType = '',
    isStopPropagation = true,
    eventCenter,
    model,
    data,
  }: IStepperDragProps) {
    this.onDragStart = onDragStart;
    this.onDragging = onDragging;
    this.onDragEnd = onDragEnd;
    this.step = step;
    this.eventType = eventType;
    this.isStopPropagation = isStopPropagation;
    this.eventCenter = eventCenter;
    this.model = model;
    this.data = data;
  }

  setStep(step: number) {
    this.step = step;
  }

  handleMouseMove = (e: MouseEvent) => {
    if (this.isStopPropagation) e.stopPropagation();
    if (!this.isStartDrag) return;

    this.startX = e.clientX;
    this.startY = e.clientY;
    this.totalDeltaX += e.clientX - this.startX;
    this.totalDeltaY += e.clientY - this.startY;

    if (this.step <= 1
      || Math.abs(this.totalDeltaX) > this.step
      || Math.abs(this.totalDeltaY) > this.step
    ) {
      const remainderX = this.totalDeltaX % this.step;
      const remainderY = this.totalDeltaY % this.step;

      const deltaX = this.totalDeltaX - remainderX;
      const deltaY = this.totalDeltaY - remainderY;

      this.totalDeltaX = remainderX;
      this.totalDeltaY = remainderY;

      const elementData = this.model?.getData();
      // REMIND: 为了区分点击和拖动，在鼠标没有拖动时，不触发 dragstart。
      if (!this.isDragging && this.eventType) {
        this.eventCenter?.emit(EventType[`${this.eventType}_DRAGSTART`], {
          e,
          data: this.data || elementData,
        });
      }

      this.isDragging = true;
      // REMIND: 为了让 dragstart 和 drag 不在同一个事件循环中，将 drag 事件放在下一个任务队列中。
      // TODO: 测试用例是否可覆盖？？？
      Promise.resolve().then(() => {
        this.onDragging({ deltaX, deltaY, event: e });
        if (this.eventType) {
          this.eventCenter?.emit(EventType[`${this.eventType}_MOUSEMOVE`], {
            e,
            data: this.data || elementData,
          });
          this.eventCenter?.emit(EventType[`${this.eventType}_DRAG`], {
            e,
            data: this.data || elementData,
          });
        }
      });
    }
  }

  handleMouseUp = (e: MouseEvent) => {
    this.isStartDrag = false;
    if (this.isStopPropagation) e.stopPropagation();

    // fix: issue#568, 如果 onDragging 在下一个时间循环中触发，而 drop 在当前事件循环，会出现问题
    Promise.resolve().then(() => {
      document.removeEventListener('mousemove', this.handleMouseMove, false);
      document.removeEventListener('mouseup', this.handleMouseUp, false);

      const elementData = this.model?.getData();
      if (this.eventType) {
        this.eventCenter?.emit(EventType[`${this.eventType}_MOUSEUP`], {
          e,
          data: this.data || elementData,
        });
      }

      if (!this.isDragging) return;
      this.isDragging = false;
      this.onDragEnd({ event: e });
      if (this.eventType) {
        this.eventCenter?.emit(EventType[`${this.eventType}_DROP`], {
          e,
          data: this.data || elementData,
        });
      }
    });
  }

  handleMouseDown = (e: MouseEvent) => {
    // TODO: debugger 确认
    // issue: LogicFlow交流群-3群 8.10 号抛出的事件相关的问题，是否是这引起的？？？
    if (e.button !== LEFT_MOUSE_BUTTON_CODE) return;
    if (this.isStopPropagation) e.stopPropagation();

    this.isStartDrag = true;
    this.startX = e.clientX;
    this.startY = e.clientY;

    document.addEventListener('mousemove', this.handleMouseMove, false);
    document.addEventListener('mouseup', this.handleMouseUp, false);

    const elementData = this.model?.getData();
    if (this.eventType) {
      this.eventCenter?.emit(EventType[`${this.eventType}_MOUSEDOWN`], {
        e,
        data: this.data || elementData,
      });
    }
    this.startTime = new Date().getTime();
  }

  cancelDrag = () => {
    document.removeEventListener('mousemove', this.handleMouseMove, false);
    document.removeEventListener('mouseup', this.handleMouseUp, false);

    this.onDragEnd({ event: null });
    this.isDragging = false;
  }
}

export default StepperDrag;

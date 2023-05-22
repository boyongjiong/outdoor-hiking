import { ElementState } from '../constant';

export interface IBaseModel {
  id: string;
  modelType: string;
  type: string;
  state: ElementState;
  additionStateData: Record<string, unknown>;
  text: any; // TODO: 待定
  isSelected: boolean;
  visible: boolean;
  virtual: boolean;
  zIndex: number;
  created: () => string;
  moveText: (deltaX: number, deltaY: number) => void;
  updateText: (text: string) => void;
  setSelected: (selected: boolean) => void;
  setZIndex: (zIndex?: number) => void;

  setElementState: (state: ElementState, additionStateData?: Record<string, unknown>) => void;
  getProperties: () => Record<string, any>; // TODO: 确认
  setProperties: (properties: Record<string, any>) => void;
  updateAttributes: (attributes: Record<string, any>) => void;
  getTextStyle: () => Record<string, any>;
}

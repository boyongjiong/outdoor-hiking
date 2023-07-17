import { pick } from 'lodash-es';
import LogicFlow from '../LogicFlow';

// 从用户传入的数据中，获取规范的节点初始化数据
export const pickEdgeConfig = (data: LogicFlow.EdgeConfig) => {
  const nodeData = pick(data, [
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
  return nodeData;
}

import { cloneDeep } from 'lodash-es';

/**
 * 对数据实现兼容处理。
 * 
 * Vue 中的 data 会进行 Observe，深拷贝的原始数据对象
 */
export function formatRawData<T>(data: T): T {
  try {
    return cloneDeep(data);
  } catch {
    return data;
  }
}

// import { cloneDeep } from 'lodash-es';
/**
 * 对数据实现兼容处理。
 * 
 * Vue 中的 data 会进行 Observe，深拷贝的原始数据对象
 */
export function formatRawData<T>(data: T): T {
  try {
    // WARNING: cloneDeep 虽然也会将 Observer 对象转换为 plain 对象，但是不会像 JSON.parse那样将 undefined 去掉
    // 会导致后面的 pick 因为属性存在而覆盖默认值的情况
    // return cloneDeep(data);

    return JSON.parse(JSON.stringify(data));
  } catch {
    return data;
  }
}

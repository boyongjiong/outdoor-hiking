import { cloneDeep, merge} from 'lodash'
import type { Options } from '../options';

export const defaultOffAnimationConfig = {
  node: false,
  edge: false,
};

export const defaultOnAnimationConfig = {
  node: true,
  edge: true,
};

export const setupAnimation = (config?: boolean | Partial<Options.AnimationConfig>): Options.AnimationConfig => {
  if (!config || typeof config === 'boolean') {
    return config
      ? cloneDeep(defaultOnAnimationConfig)
      : cloneDeep(defaultOffAnimationConfig);
  }

  // 当传入的是对象时，将其与默认关合并
  return merge(cloneDeep(defaultOffAnimationConfig), config);
};

export const updateAnimation = setupAnimation;

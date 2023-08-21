import { runInNodeContext } from './nodeVm';
import { runInBrowserContext } from './brewserVm';
import { isInNodeJS, isInBrowser, globalScope } from '../utils';

const getExpressionResult = async (code: string, context: any) => {
  if (isInNodeJS) {
    const r = await runInNodeContext(code, context);
    return r;
  }
  if (isInBrowser) {
    const r = await runInBrowserContext(code, context);
    return r;
  }
  return globalScope.eval(code);
};

export {
  getExpressionResult,
};

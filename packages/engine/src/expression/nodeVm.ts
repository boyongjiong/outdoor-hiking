// import vm from 'node:vm';
const vm = require('node:vm');

const runInNodeContext = async (code: string, globalData: Record<string, unknown> = {}) => {
  const context = vm.createContext(globalData);
  vm.runInContext(code, context);

  return context;
};

export {
  runInNodeContext,
};

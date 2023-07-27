import { v4 as uuidV4 } from 'uuid';

export const createExecId = (): string => {
  const uuid = uuidV4();
  return `exec-${uuid}`;
};

export const createTaskId = (): string => {
  const uuid = uuidV4();
  return `task-${uuid}`;
};

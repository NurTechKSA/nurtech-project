import { AppPath } from '@core/enums/app-path.enum';

import { TaskDetail } from '../interfaces/task-detail.interface';

export function getTaskUrl(key: TaskDetail['key']): string {
  const [projectKey] = key.split('-');

  return `/${AppPath.PROJECT}/${projectKey}/${AppPath.TASKS}/${key}`;
}

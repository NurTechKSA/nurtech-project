import { LinkedTask } from './linked-task.interface';
import { LinkType } from '../enums/link-type.enum';

export interface TaskLink {
  id: string;
  type: LinkType;
  task: LinkedTask;
}

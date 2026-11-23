import { FormControl } from '@angular/forms';
import { TuiDay } from '@taiga-ui/cdk';

import { UserRef } from '@core/user/interfaces/user-ref.interface';
import { Status } from '@status/interfaces/status.interface';

import { TaskParentRef } from './task-parent-ref.interface';
import { Subsystem } from '../../dictionary/interfaces/subsystem.interface';
import { Tag } from '../../dictionary/interfaces/tag.interface';
import { Priority } from '../enums/priority.enum';
import { TaskType } from '../enums/task-type.enum';

export interface CreateTaskForm {
  type: FormControl<TaskType>;
  title: FormControl<string>;
  description: FormControl<string>;
  parent: FormControl<TaskParentRef | null>;
  status: FormControl<Status | null>;
  priority: FormControl<Priority>;
  assignee: FormControl<UserRef | null>;
  reviewer: FormControl<UserRef | null>;
  subsystem: FormControl<Subsystem | null>;
  dueDate: FormControl<TuiDay | null>;
  estimate: FormControl<string>;
  tags: FormControl<Tag[]>;
}

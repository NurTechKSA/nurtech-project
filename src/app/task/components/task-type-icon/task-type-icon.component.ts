import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiBadge, TuiBadgeOptions } from '@taiga-ui/kit';

import { TaskType } from '../../enums/task-type.enum';

interface TaskTypeIcon {
  label: string;
  letter: string;
  // todo вычленить корректный тип без string
  appearance: Extract<TuiBadgeOptions['appearance'], string>;
}

const TASK_TYPE_DATA: Record<TaskType, TaskTypeIcon> = {
  [TaskType.TASK]: {
    letter: 'T',
    appearance: 'positive',
    label: 'Task',
  },
  [TaskType.BUG]: {
    letter: 'B',
    appearance: 'negative',
    label: 'Bug',
  },
  [TaskType.SUBTASK]: {
    letter: 'S',
    appearance: 'warning',
    label: 'Subtask',
  },
};

@Component({
  selector: 'app-task-type-icon',
  imports: [TuiBadge],
  templateUrl: './task-type-icon.component.html',
  styleUrl: './task-type-icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskTypeIconComponent {
  readonly type = input.required<TaskType>();

  readonly data = TASK_TYPE_DATA;
}

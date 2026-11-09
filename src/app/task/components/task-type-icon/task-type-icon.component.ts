import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TuiBadge } from '@taiga-ui/kit';

import { TaskType } from '../../enums/task-type.enum';

@Component({
  selector: 'app-task-type-icon',
  imports: [TuiBadge],
  templateUrl: './task-type-icon.component.html',
  styleUrl: './task-type-icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskTypeIconComponent {
  readonly type = input.required<TaskType>();

  readonly data = computed(() => {
    switch (this.type()) {
      case TaskType.TASK:
        return {
          letter: 'T',
          appearance: 'positive',
          label: 'Task',
        };
      case TaskType.BUG:
        return {
          letter: 'B',
          appearance: 'negative',
          label: 'Bug',
        };
      case TaskType.SUBTASK:
        return {
          letter: 'S',
          appearance: 'warning',
          label: 'Subtask',
        };
    }
  });
}

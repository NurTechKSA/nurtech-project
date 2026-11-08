import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TuiHint } from '@taiga-ui/core';

import { TaskType } from '../../enums/task-type.enum';

@Component({
  selector: 'app-task-type-icon',
  imports: [TuiHint],
  templateUrl: './task-type-icon.component.html',
  styleUrl: './task-type-icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskTypeIconComponent {
  readonly type = input.required<TaskType>();

  readonly data = computed(() => {
    switch (this.type()) {
      case TaskType.TASK:
        return { letter: 'T', label: 'Task' };
      case TaskType.BUG:
        return { letter: 'B', label: 'Bug' };
      case TaskType.SUBTASK:
        return { letter: 'S', label: 'Subtask' };
    }
  });
}

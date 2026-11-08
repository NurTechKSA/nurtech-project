import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TuiHint, TuiIcon } from '@taiga-ui/core';

import { TaskType } from '../../enums/task-type.enum';

@Component({
  selector: 'app-task-type-icon',
  imports: [TuiHint, TuiIcon],
  templateUrl: './task-type-icon.component.html',
  styleUrl: './task-type-icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskTypeIconComponent {
  readonly type = input.required<TaskType>();

  readonly data = computed(() => {
    switch (this.type()) {
      case TaskType.TASK:
        return { icon: '@tui.square-check', label: 'Task' };
      case TaskType.BUG:
        return { icon: '@tui.bug', label: 'Bug' };
      case TaskType.SUBTASK:
        return { icon: '@tui.list-tree', label: 'Subtask' };
    }
  });
}

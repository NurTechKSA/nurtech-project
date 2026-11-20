import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { TuiButton, TuiDataList, TuiDropdown, TuiIcon } from '@taiga-ui/core';
import { TuiSegmented } from '@taiga-ui/kit';

import { TaskType } from '../../enums/task-type.enum';
import { TaskDetail } from '../../interfaces/task-detail.interface';
import { TaskTypeIconComponent } from '../task-type-icon/task-type-icon.component';

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  [TaskType.TASK]: 'Task',
  [TaskType.BUG]: 'Bug',
  [TaskType.SUBTASK]: 'Subtask',
};

@Component({
  selector: 'app-task-type-select',
  imports: [
    TaskTypeIconComponent,
    TuiButton,
    TuiDataList,
    TuiDropdown,
    TuiIcon,
    TuiSegmented,
  ],
  templateUrl: './task-type-select.component.html',
  styleUrl: './task-type-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskTypeSelectComponent {
  readonly options = input.required<TaskDetail['type'][]>();
  readonly value = input<TaskDetail['type'] | null>(null);
  readonly readonly = input(false);

  readonly variant = input<'segmented' | 'dropdown'>('segmented');

  readonly changed = output<TaskDetail['type']>();

  readonly isOpen = signal(false);
  readonly labels = TASK_TYPE_LABELS;

  readonly activeIndex = computed(() => {
    const current = this.value();

    return current === null ? -1 : this.options().indexOf(current);
  });

  onActiveIndexChange(index: number): void {
    const type = this.options().at(index);

    if (type !== undefined) {
      this.onOptionClick(type);
    }
  }

  onOptionClick(type: TaskDetail['type']): void {
    this.isOpen.set(false);

    if (this.readonly() || type === this.value()) {
      return;
    }

    this.changed.emit(type);
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiDataList, TuiDropdown } from '@taiga-ui/core';
import { TuiSegmented, TuiButtonSelect, TuiChevron } from '@taiga-ui/kit';

import { TaskType } from '../../enums/task-type.enum';
import { TaskTypeIconComponent } from '../task-type-icon/task-type-icon.component';

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  [TaskType.TASK]: 'Task',
  [TaskType.BUG]: 'Bug',
  [TaskType.SUBTASK]: 'Subtask',
};

@Component({
  selector: 'app-task-type-select',
  imports: [
    FormsModule,
    TaskTypeIconComponent,
    TuiButton,
    TuiButtonSelect,
    TuiChevron,
    TuiDataList,
    TuiDropdown,
    TuiSegmented,
  ],
  templateUrl: './task-type-select.component.html',
  styleUrl: './task-type-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskTypeSelectComponent {
  readonly options = input.required<TaskType[]>();
  readonly value = model.required<TaskType>();
  readonly viewOnly = input(false);

  readonly variant = input<'segmented' | 'dropdown'>('segmented');

  readonly labels = TASK_TYPE_LABELS;

  readonly activeIndex = computed(() => this.options().indexOf(this.value()));

  onActiveIndexChange(index: number): void {
    if (index < 0 || index >= this.options().length) {
      return;
    }

    this.onOptionClick(this.options()[index]);
  }

  onOptionClick(type: TaskType): void {
    if (this.viewOnly() || type === this.value()) {
      return;
    }

    this.value.set(type);
  }
}

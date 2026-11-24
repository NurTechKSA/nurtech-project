import { TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
} from '@angular/core';
import { TuiSegmented } from '@taiga-ui/kit';

import { TaskType } from '../../enums/task-type.enum';
import { TaskTypeIconComponent } from '../task-type-icon/task-type-icon.component';

@Component({
  selector: 'app-task-type-select',
  imports: [TaskTypeIconComponent, TuiSegmented, TitleCasePipe],
  templateUrl: './task-type-select.component.html',
  styleUrl: './task-type-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskTypeSelectComponent {
  readonly options = input.required<TaskType[]>();
  readonly value = model.required<TaskType>();
  readonly viewOnly = input(false);

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

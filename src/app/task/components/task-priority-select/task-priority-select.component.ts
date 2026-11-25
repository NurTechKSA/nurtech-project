import { TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiDataList, TuiDropdown } from '@taiga-ui/core';
import { TuiButtonSelect, TuiChevron } from '@taiga-ui/kit';

import { Priority } from '../../enums/priority.enum';
import { TaskPriorityBadgeComponent } from '../task-priority-badge/task-priority-badge.component';

@Component({
  selector: 'app-task-priority-select',
  imports: [
    FormsModule,
    TitleCasePipe,
    TuiButton,
    TuiButtonSelect,
    TuiChevron,
    TuiDataList,
    TuiDropdown,
    TaskPriorityBadgeComponent,
  ],
  templateUrl: './task-priority-select.component.html',
  styleUrl: './task-priority-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskPrioritySelectComponent {
  readonly value = model.required<Priority>();
  readonly viewOnly = input(false);

  protected readonly priorities = Object.values(Priority);
}

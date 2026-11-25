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

import { TaskType } from '../../enums/task-type.enum';
import { TaskTypeIconComponent } from '../task-type-icon/task-type-icon.component';

@Component({
  selector: 'app-task-type-dropdown',
  imports: [
    FormsModule,
    TaskTypeIconComponent,
    TitleCasePipe,
    TuiButton,
    TuiButtonSelect,
    TuiChevron,
    TuiDataList,
    TuiDropdown,
  ],
  templateUrl: './task-type-dropdown.component.html',
  styleUrl: './task-type-dropdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskTypeDropdownComponent {
  readonly options = input.required<TaskType[]>();
  readonly value = model.required<TaskType>();
  readonly viewOnly = input(false);
}

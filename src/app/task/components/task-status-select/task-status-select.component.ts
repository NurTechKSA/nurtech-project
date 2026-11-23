import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { TuiButton, TuiDropdown, TuiIcon, TuiDataList } from '@taiga-ui/core';

import { Status } from '@status/interfaces/status.interface';

import { TaskStatusBadgeComponent } from '../task-status-badge/task-status-badge.component';

@Component({
  selector: 'app-task-status-select',
  imports: [
    TaskStatusBadgeComponent,
    TuiButton,
    TuiDataList,
    TuiDropdown,
    TuiIcon,
  ],
  templateUrl: './task-status-select.component.html',
  styleUrl: './task-status-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskStatusSelectComponent {
  readonly statuses = input.required<Status[]>();
  readonly value = input.required<Status>();
  readonly viewOnly = input(false);

  readonly valueChange = output<Status>();

  readonly open = signal(false);

  selectStatus(status: Status): void {
    this.open.set(false);

    if (status.id !== this.value().id) {
      this.valueChange.emit(status);
    }
  }
}

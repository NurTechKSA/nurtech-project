import {
  ChangeDetectionStrategy,
  Component,
  input,
  InputSignal,
} from '@angular/core';
import { TuiBadge } from '@taiga-ui/kit';

import { TaskDetail } from '../../../task/interfaces/task-detail.interface';

@Component({
  selector: 'app-parent-key-badge',
  imports: [TuiBadge],
  templateUrl: './parent-key-badge.component.html',
  styleUrl: './parent-key-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentKeyBadgeComponent {
  readonly parentKey: InputSignal<TaskDetail['key']> =
    input.required<TaskDetail['key']>();
}

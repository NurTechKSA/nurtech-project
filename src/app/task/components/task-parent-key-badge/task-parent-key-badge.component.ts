import {
  ChangeDetectionStrategy,
  Component,
  input,
  InputSignal,
} from '@angular/core';
import { TuiBadge } from '@taiga-ui/kit';

@Component({
  selector: 'app-parent-key-badge',
  imports: [TuiBadge],
  templateUrl: './task-parent-key-badge.component.html',
  styleUrl: './task-parent-key-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskParentKeyBadgeComponent {
  readonly parentKey: InputSignal<string> = input.required<string>();
}

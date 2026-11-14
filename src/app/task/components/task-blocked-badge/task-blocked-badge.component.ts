import {
  ChangeDetectionStrategy,
  Component,
  input,
  InputSignal,
} from '@angular/core';
import { TuiBadge } from '@taiga-ui/kit';

@Component({
  selector: 'app-blocked-badge',
  imports: [TuiBadge],
  templateUrl: './task-blocked-badge.component.html',
  styleUrl: './task-blocked-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskBlockedBadgeComponent {
  readonly isBlocked: InputSignal<boolean> = input.required<boolean>();
}

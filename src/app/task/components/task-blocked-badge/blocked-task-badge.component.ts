import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiBadge } from '@taiga-ui/kit';

@Component({
  selector: 'app-blocked-task-badge',
  imports: [TuiBadge],
  templateUrl: './blocked-task-badge.component.html',
  styleUrl: './blocked-task-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockedTaskBadgeComponent {
  readonly isBlocked = input.required<boolean>();
}

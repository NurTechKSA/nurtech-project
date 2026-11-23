import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiHint } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';

@Component({
  selector: 'app-parent-task-key-badge',
  imports: [TuiBadge, TuiHint],
  templateUrl: './parent-task-key-badge.component.html',
  styleUrl: './parent-task-key-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentTaskKeyBadgeComponent {
  readonly parentKey = input.required<string>();
}

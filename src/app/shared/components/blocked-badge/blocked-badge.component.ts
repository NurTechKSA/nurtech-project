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
  templateUrl: './blocked-badge.component.html',
  styleUrl: './blocked-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockedBadgeComponent {
  readonly isBlocked: InputSignal<boolean> = input.required<boolean>();
}

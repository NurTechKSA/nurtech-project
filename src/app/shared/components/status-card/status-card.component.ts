import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TuiBlockStatus, TuiCardLarge } from '@taiga-ui/layout';

@Component({
  selector: 'app-status-card',
  imports: [TuiAvatar, TuiBlockStatus, TuiCardLarge],
  templateUrl: './status-card.component.html',
  styleUrl: './status-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusCardComponent {
  readonly icon = input.required<string>();
  readonly heading = input.required<string>();
  readonly description = input<string>();
}

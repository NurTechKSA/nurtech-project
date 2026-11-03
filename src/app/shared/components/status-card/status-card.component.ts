import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TuiBlockStatus, TuiCardLarge } from '@taiga-ui/layout';

import { NotificationService } from '@shared/services/notification.service';

@Component({
  selector: 'app-status-card',
  imports: [TuiAvatar, TuiBlockStatus, TuiCardLarge, TuiIcon, TuiButton],
  templateUrl: './status-card.component.html',
  styleUrl: './status-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusCardComponent {
  private readonly notificationService: NotificationService =
    inject(NotificationService);

  readonly icon = input.required<string>();
  readonly heading = input.required<string>();
  readonly description = input<string>();
  readonly taskUrl = input.required<string>();

  copyLink(): void {
    navigator.clipboard
      .writeText(this.taskUrl())
      .then(() => {
        this.notificationService.showSuccess('Ссылка скопирована');
      })
      .catch(() => {
        this.notificationService.showError('Не удалось скопировать ссылку');
      });
  }
}

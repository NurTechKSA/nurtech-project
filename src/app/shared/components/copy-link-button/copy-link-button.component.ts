import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { TuiIcon, TuiButton } from '@taiga-ui/core';

import { NotificationService } from '@shared/services/notification.service';
@Component({
  selector: 'app-copy-link-button',
  imports: [TuiButton, TuiIcon],
  templateUrl: './copy-link-button.component.html',
  styleUrl: './copy-link-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyLinkButtonComponent {
  private readonly notificationService: NotificationService =
    inject(NotificationService);
  readonly url = input.required<string>();

  onCopyLink(): void {
    navigator.clipboard
      .writeText(this.url())
      .then(() => {
        this.notificationService.showSuccess('Ссылка скопирована');
      })
      .catch(() => {
        this.notificationService.showError('Не удалось скопировать ссылку');
      });
  }
}

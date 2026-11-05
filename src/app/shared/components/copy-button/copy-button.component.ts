import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { TuiButton, TuiHint } from '@taiga-ui/core';

import { NotificationService } from '@shared/services/notification.service';
@Component({
  selector: 'app-copy-button',
  imports: [TuiButton, TuiHint],
  templateUrl: './copy-button.component.html',
  styleUrl: './copy-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyButtonComponent {
  private readonly notificationService = inject(NotificationService);
  readonly text = input.required<string>();
  readonly label = input<string>('Копировать');

  onCopy(): void {
    navigator.clipboard
      .writeText(this.text())
      .then(() => {
        this.notificationService.showSuccess('Текст скопирован в буфер обмена');
      })
      .catch(() => {
        this.notificationService.showError('Не удалось скопировать текст');
      });
  }
}

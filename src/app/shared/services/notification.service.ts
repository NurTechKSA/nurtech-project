import { inject, Injectable } from '@angular/core';
import { TuiNotificationService } from '@taiga-ui/core';

const AUTO_CLOSE_MS = 5000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly tuiNotificationService = inject(TuiNotificationService);

  showError(message: string): void {
    this.tuiNotificationService
      .open(message, { appearance: 'negative', autoClose: AUTO_CLOSE_MS })
      .subscribe();
  }
}

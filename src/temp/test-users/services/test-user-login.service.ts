import { DOCUMENT, inject, Injectable } from '@angular/core';
import { catchError, EMPTY, tap } from 'rxjs';

import { ApiAuthService } from '@core/authentication/services/api-auth.service';
import { User } from '@core/user/interfaces/user.interface';
import { NotificationService } from '@shared/services/notification.service';

import { TEST_USERS_PASSWORD } from '../config/test-users-password.config';

const LOGIN_ERROR_MESSAGE = 'Не удалось войти под тестовым пользователем';

// После входа страница перезагружается, чтобы все сторы начали
// с чистого состояния под новым пользователем
@Injectable({ providedIn: 'root' })
export class TestUserLoginService {
  private readonly document = inject(DOCUMENT);
  private readonly apiAuthService = inject(ApiAuthService);
  private readonly notificationService = inject(NotificationService);

  loginAs(username: User['username'], url: string): void {
    this.apiAuthService
      .login({ username, password: TEST_USERS_PASSWORD })
      .pipe(
        tap(() => {
          this.document.location.assign(url);
        }),
        catchError(() => {
          this.notificationService.showError(LOGIN_ERROR_MESSAGE);

          return EMPTY;
        })
      )
      .subscribe();
  }
}

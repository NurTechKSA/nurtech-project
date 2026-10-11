import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  signal,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTaiga } from '@taiga-ui/core';
import { TUI_LANGUAGE, TUI_RUSSIAN_LANGUAGE } from '@taiga-ui/i18n';

import { AuthStore } from '@core/authentication/+store/auth.store';
import { unauthorizedInterceptor } from '@core/authentication/interceptors/unauthorized.interceptor';
import { apiUrlInterceptor } from '@core/interceptors/api-url.interceptor';
import { errorNotificationInterceptor } from '@core/interceptors/error-notification.interceptor';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideTaiga(),
    provideHttpClient(
      withInterceptors([
        unauthorizedInterceptor,
        errorNotificationInterceptor,
        apiUrlInterceptor,
      ])
    ),
    provideAppInitializer(() => {
      inject(AuthStore).getCurrentUser();
    }),
    { provide: TUI_LANGUAGE, useValue: signal(TUI_RUSSIAN_LANGUAGE) },
  ],
};

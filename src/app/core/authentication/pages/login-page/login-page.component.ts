import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  TuiButton,
  TuiError,
  TuiIcon,
  TuiInput,
  TuiLoader,
  TuiNotification,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiAvatar, TuiPassword } from '@taiga-ui/kit';
import { TuiCardLarge, TuiForm } from '@taiga-ui/layout';

import { User } from '@core/user/interfaces/user.interface';
import { getLengthValidator } from '@shared/validators/length.util';
import { getRequiredValidator } from '@shared/validators/required.util';

import { LoginPageStore } from './login-page.store';
// eslint-disable-next-line
import { TestUserLoginComponent } from '../../../../../temp/test-users/components/test-user-login/test-user-login.component';
// eslint-disable-next-line
import { TEST_USERS_PASSWORD } from '../../../../../temp/test-users/config/test-users-password.config';
import { getSafeReturnUrl } from '../../utils/safe-return-url.util';

@Component({
  imports: [
    ReactiveFormsModule,
    TuiAvatar,
    TuiButton,
    TuiCardLarge,
    TuiError,
    TuiForm,
    TuiIcon,
    TuiInput,
    TuiLoader,
    TuiNotification,
    TuiPassword,
    TuiTextfield,
    TestUserLoginComponent,
  ],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [LoginPageStore],
})
export class LoginPageComponent {
  private readonly router = inject(Router);
  private readonly loginPageStore = inject(LoginPageStore);

  // Имя совпадает с QueryParam.RETURN_URL: значение приходит из url
  readonly returnUrl = input<string>();
  readonly errorMessage = this.loginPageStore.errorMessage;
  readonly isLoading = this.loginPageStore.isLoading;

  readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', getRequiredValidator()],
    password: [
      // TODO: временные данные
      TEST_USERS_PASSWORD,
      [getRequiredValidator(), getLengthValidator({ max: 128 })],
    ],
  });

  // TODO: временные данные
  onTestUserSelect(username: User['username']): void {
    this.form.setValue({ username, password: TEST_USERS_PASSWORD });
    this.onFormSubmit();
  }

  onFormSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    const returnUrl = getSafeReturnUrl(this.returnUrl());

    this.loginPageStore.login({
      body: this.form.getRawValue(),
      callback: () => void this.router.navigateByUrl(returnUrl),
    });
  }
}

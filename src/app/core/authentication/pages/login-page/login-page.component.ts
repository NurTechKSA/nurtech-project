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

import { getLengthValidator } from '@shared/validators/length.util';
import { getRequiredValidator } from '@shared/validators/required.util';

import { LoginPageStore } from './login-page.store';
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
    password: ['', [getRequiredValidator(), getLengthValidator({ max: 128 })]],
  });

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

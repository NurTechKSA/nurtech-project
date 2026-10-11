import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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

import { AppPath } from '@core/enums/app-path.enum';
import { getLengthValidator } from '@shared/validators/length.util';
import { getRequiredValidator } from '@shared/validators/required.util';

import { LoginPageStore } from './login-page.store';

@Component({
  selector: 'app-login-page',
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

  readonly errorMessage = this.loginPageStore.errorMessage;
  readonly isLoading = this.loginPageStore.isLoading;

  readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', getRequiredValidator()],
    password: [
      '',
      [getRequiredValidator(), getLengthValidator({ min: 8, max: 128 })],
    ],
  });

  onFormSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    this.loginPageStore.login({
      body: this.form.getRawValue(),
      callback: () => void this.router.navigateByUrl(AppPath.ROOT),
    });
  }
}

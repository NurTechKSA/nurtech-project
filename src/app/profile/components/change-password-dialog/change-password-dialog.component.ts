import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  TuiButton,
  type TuiDialogContext,
  TuiError,
  TuiIcon,
  TuiInput,
  TuiLoader,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiPassword } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { NotificationService } from '@shared/services/notification.service';
import { applyFormServerError } from '@shared/utils/apply-form-server-error.util';
import { getCompareControlValidator } from '@shared/validators/compare-control.util';
import { getRequiredValidator } from '@shared/validators/required.util';

import { ProfileStore } from '../../+store/profile.store';

@Component({
  selector: 'app-change-password-dialog',
  imports: [
    ReactiveFormsModule,
    TuiButton,
    TuiError,
    TuiIcon,
    TuiInput,
    TuiLoader,
    TuiTextfield,
    TuiPassword
  ],
  templateUrl: './change-password-dialog.component.html',
  styleUrl: './change-password-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProfileStore],
})
export class ChangePasswordDialogComponent {
  private readonly profileStore = inject(ProfileStore);
  private readonly notificationService = inject(NotificationService);
  private readonly context = injectContext<TuiDialogContext<void, void>>();

  readonly isLoading = this.profileStore.isLoading;

  readonly changePasswordForm = inject(FormBuilder).nonNullable.group({
    currentPassword: ['', getRequiredValidator()],
    newPassword: [
      '',
      [
        getRequiredValidator(),
        getCompareControlValidator({
          targetControlName: 'currentPassword',
          match: false,
          message: 'Новый пароль должен отличаться от текущего',
        }),
      ],
    ],
    confirmPassword: [
      '',
      [
        getRequiredValidator(),
        getCompareControlValidator({
          targetControlName: 'newPassword',
          match: true,
          message: 'Пароли должны совпадать',
        }),
      ],
    ],
  });

  constructor() {
    this.initPasswordChangeEffect();
  }

  onCancel(): void {
    this.context.completeWith();
  }

  onSubmit(): void {
    this.changePasswordForm.controls.newPassword.updateValueAndValidity();
    this.changePasswordForm.controls.confirmPassword.updateValueAndValidity();

    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();

      return;
    }

    const { currentPassword, newPassword } =
      this.changePasswordForm.getRawValue();

    this.profileStore.changePassword({
      current: currentPassword,
      next: newPassword,
    });
  }

  private initPasswordChangeEffect(): void {
    effect(() => {
      if (this.profileStore.isLoaded()) {
        this.notificationService.showSuccess('Пароль изменён');
        this.context.completeWith();
      }

      if (this.profileStore.isError()) {
        applyFormServerError(
          this.changePasswordForm,
          this.profileStore.error(),
          {
            fieldMap: { current: 'currentPassword', next: 'newPassword' },
            fallbackField: 'currentPassword',
          }
        );
      }
    });
  }
}

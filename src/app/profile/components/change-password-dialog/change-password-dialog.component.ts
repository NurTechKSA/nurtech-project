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
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiPassword } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { NotificationService } from '@shared/services/notification.service';
import { applyFormServerError } from '@shared/validators/form-error.util';
import { getPasswordsMatchValidator } from '@shared/validators/passwords-match.util';
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
    TuiPassword,
    TuiTextfield,
  ],
  templateUrl: './change-password-dialog.component.html',
  styleUrl: './change-password-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProfileStore],
})
export class ChangePasswordDialogComponent {
  private readonly profileStore = inject(ProfileStore);
  private readonly notificationService = inject(NotificationService);
  private readonly context = injectContext<TuiDialogContext>();

  readonly isLoading = this.profileStore.isLoading;

  readonly changePasswordForm = inject(FormBuilder).nonNullable.group(
    {
      currentPassword: ['', getRequiredValidator()],
      newPassword: ['', getRequiredValidator()],
      confirmPassword: ['', getRequiredValidator()],
    },
    {
      validators: [
        getPasswordsMatchValidator(
          'newPassword',
          'confirmPassword',
          'Пароли не совпадают'
        ),
      ],
    }
  );

  constructor() {
    effect(() => {
      if (this.profileStore.isLoaded()) {
        this.notificationService.showSuccess('Пароль изменён');
        this.context.completeWith();
      }

      if (this.profileStore.isError()) {
        applyFormServerError(
          this.changePasswordForm,
          this.profileStore.error(),
          { current: 'currentPassword', next: 'newPassword' },
          this.changePasswordForm.controls.currentPassword
        );
      }
    });
  }

  onCancel(): void {
    this.context.completeWith();
  }

  onSubmit(): void {
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
}

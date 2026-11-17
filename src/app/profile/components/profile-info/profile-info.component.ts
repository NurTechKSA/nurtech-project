import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TuiButton, TuiError, TuiInput, TuiLoader } from '@taiga-ui/core';
import { TuiForm } from '@taiga-ui/layout';

import { UserStore } from '@core/user/+store/user.store';
import { getLengthValidator } from '@shared/validators/length.util';
import { getRequiredValidator } from '@shared/validators/required.util';

import { ProfileStore } from '../../+store/profile.store';

@Component({
  selector: 'app-profile-info',
  imports: [
    FormsModule,
    TuiInput,
    TuiButton,
    TuiError,
    TuiLoader,
    ReactiveFormsModule,
    TuiForm,
  ],
  templateUrl: './profile-info.component.html',
  styleUrl: './profile-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProfileStore],
})
export class ProfileInfoComponent {
  private readonly userStore = inject(UserStore);
  private readonly profileStore = inject(ProfileStore);

  readonly currentUser = this.userStore.currentUser;
  readonly isLoading = this.profileStore.isLoading;

  readonly form = inject(FormBuilder).nonNullable.group({
    name: [
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.currentUser()!.name,
      [getLengthValidator({ min: 1, max: 100 }), getRequiredValidator()],
    ],
    login: [{ value: this.currentUser()?.username, disabled: true }],
  });

  onSubmit(): void {
    this.profileStore.updateName({ name: this.form.controls.name.value });
  }
}

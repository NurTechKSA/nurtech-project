import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TuiButton, TuiError, TuiInput, TuiLoader } from '@taiga-ui/core';

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
  ],
  templateUrl: './profile-info.component.html',
  styleUrl: './profile-info.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProfileStore],
})
export class ProfileInfoComponent {
  private readonly userStore = inject(UserStore);
  private readonly profileStore = inject(ProfileStore);

  readonly isLoading = this.profileStore.isLoading;

  readonly form = inject(FormBuilder).nonNullable.group({
    name: [
      this.userStore.currentUser()?.name ?? '',
      [getLengthValidator({ min: 1, max: 100 }), getRequiredValidator()],
    ],
    login: [{ value: this.userStore.currentUser()?.username, disabled: true }],
  });
  readonly currentName = toSignal(this.form.controls.name.valueChanges, {
    initialValue: this.form.controls.name.value,
  });
  readonly isSaveDisabled: Signal<boolean> = computed(() => {
    const name = this.currentName();
    const initialName = this.userStore.currentUser()?.name;

    return !name || name === initialName || this.form.invalid;
  });

  onSubmit(): void {
    this.profileStore.updateName({ name: this.currentName() });
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TuiButton, TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { UserStore } from '@core/user/+store/user.store';

import { ChangePasswordDialogComponent } from '../../components/change-password-dialog/change-password-dialog.component';

@Component({
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TuiButton],
})
export class ProfilePageComponent {
  private readonly store = inject(UserStore);
  private readonly dialogService = inject(TuiDialogService);

  readonly user = this.store.currentUser;

  openChangePasswordDialog(): void {
    this.dialogService
      .open(new PolymorpheusComponent(ChangePasswordDialogComponent), {
        label: 'Смена пароля',
        size: 's',
      })
      .subscribe();
  }
}

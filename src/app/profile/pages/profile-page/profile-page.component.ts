import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TuiButton, TuiDialogService, TuiTitle } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { AuthStore } from '@core/authentication/+store/auth.store';
import { AppPath } from '@core/enums/app-path.enum';

import { ChangePasswordDialogComponent } from '../../components/change-password-dialog/change-password-dialog.component';
import { ProfileInfoComponent } from '../../components/profile-info/profile-info.component';

@Component({
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProfileInfoComponent, TuiTitle, TuiButton],
})
export class ProfilePageComponent {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly dialogService = inject(TuiDialogService);

  openChangePasswordDialog(): void {
    this.dialogService
      .open(new PolymorpheusComponent(ChangePasswordDialogComponent), {
        label: 'Смена пароля',
        size: 's',
      })
      .subscribe();
  }

  onLogoutButtonClick(): void {
    this.authStore.logout({
      callback: () => void this.router.navigateByUrl(`/${AppPath.LOGIN}`),
    });
  }
}

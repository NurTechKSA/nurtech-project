import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TuiButton, TuiTitle } from '@taiga-ui/core';

import { AuthStore } from '@core/authentication/+store/auth.store';
import { AppPath } from '@core/enums/app-path.enum';

import { ProfileInfoComponent } from '../../components/profile-info/profile-info.component';
import { ChangePasswordDialogService } from '../../services/change-password-dialog.service';

@Component({
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProfileInfoComponent, TuiTitle, TuiButton],
  providers: [ChangePasswordDialogService],
})
export class ProfilePageComponent {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly changePasswordDialogService = inject(
    ChangePasswordDialogService
  );

  openChangePasswordDialog(): void {
    this.changePasswordDialogService.open().subscribe();
  }

  onLogoutButtonClick(): void {
    this.authStore.logout({
      callback: () => void this.router.navigateByUrl(`/${AppPath.LOGIN}`),
    });
  }
}

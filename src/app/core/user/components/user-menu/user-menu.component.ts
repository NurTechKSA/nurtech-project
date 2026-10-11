import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TuiDataList, TuiDropdown } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';

import { AuthStore } from '@core/authentication/+store/auth.store';
import { AppPath } from '@core/enums/app-path.enum';
import { InitialsPipe } from '@shared/pipes/initials.pipe';
import { ShortNamePipe } from '@shared/pipes/short-name.pipe';

import { UserStore } from '../../+store/user.store';

@Component({
  selector: 'app-user-menu',
  imports: [
    InitialsPipe,
    RouterLink,
    ShortNamePipe,
    TuiAvatar,
    TuiDataList,
    TuiDropdown,
  ],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserMenuComponent {
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);
  private readonly userStore = inject(UserStore);

  readonly isOpen = signal(false);

  readonly currentUser = this.userStore.currentUser;

  readonly profilePath = `/${AppPath.PROFILE}`;

  onLogoutButtonClick(): void {
    this.isOpen.set(false);
    this.authStore.logout({
      callback: () => void this.router.navigateByUrl(`/${AppPath.LOGIN}`),
    });
  }
}

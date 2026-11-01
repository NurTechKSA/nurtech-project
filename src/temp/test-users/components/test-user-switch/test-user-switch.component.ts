import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { TuiDataList, TuiIcon } from '@taiga-ui/core';

import { UserStore } from '@core/user/+store/user.store';
import { User } from '@core/user/interfaces/user.interface';

import { TEST_USERS } from '../../config/test-users.config';
import { TestUserLoginService } from '../../services/test-user-login.service';

@Component({
  selector: 'app-test-user-switch',
  imports: [TuiDataList, TuiIcon],
  templateUrl: './test-user-switch.component.html',
  styleUrl: './test-user-switch.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestUserSwitchComponent {
  private readonly router = inject(Router);
  private readonly userStore = inject(UserStore);
  private readonly testUserLoginService = inject(TestUserLoginService);

  readonly testUsers = TEST_USERS;
  readonly currentUsername = computed(
    () => this.userStore.currentUser()?.username
  );

  onUserClick(username: User['username']): void {
    this.testUserLoginService.loginAs(username, this.router.url);
  }
}

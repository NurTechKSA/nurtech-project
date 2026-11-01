import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { TuiTitle } from '@taiga-ui/core';

import { User } from '@core/user/interfaces/user.interface';

import { TEST_USERS } from '../../config/test-users.config';

@Component({
  selector: 'app-test-user-login',
  imports: [TuiTitle],
  templateUrl: './test-user-login.component.html',
  styleUrl: './test-user-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestUserLoginComponent {
  readonly userSelect = output<User['username']>();

  readonly testUsers = TEST_USERS;

  onUserClick(username: User['username']): void {
    this.userSelect.emit(username);
  }
}

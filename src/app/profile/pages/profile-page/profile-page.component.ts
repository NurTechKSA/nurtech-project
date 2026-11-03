import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Signal,
} from '@angular/core';

import { UserStore } from '@core/user/+store/user.store';
import { User } from '@core/user/interfaces/user.interface';

@Component({
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [UserStore],
})
export class ProfilePageComponent {
  private readonly userStore = inject(UserStore);

  public readonly user: Signal<User | null> = this.userStore.currentUser;
}

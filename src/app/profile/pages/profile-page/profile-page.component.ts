import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { UserStore } from '@core/user/+store/user.store';

@Component({
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent {
  private readonly userStore = inject(UserStore);

  public readonly user = this.userStore.currentUser;
}

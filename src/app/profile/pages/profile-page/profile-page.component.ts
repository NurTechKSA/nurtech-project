import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { profileStore } from '../../store/profile.store';

@Component({
  selector: 'app-profile-page',
  imports: [],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [profileStore],
})
export class ProfilePageComponent {
  store: InstanceType<typeof profileStore> = inject(profileStore);
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ProfileStore } from '../../+store/profile.store';

@Component({
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProfileStore],
})
export class ProfilePageComponent {
  private readonly store = inject(ProfileStore);
}

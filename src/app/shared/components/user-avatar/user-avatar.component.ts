import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TuiHint, TuiSizeS, TuiSizeXXL } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';

import { InitialsPipe } from '@shared/pipes/initials.pipe';

@Component({
  selector: 'app-user-avatar',
  imports: [InitialsPipe, TuiAvatar, TuiHint],
  templateUrl: './user-avatar.component.html',
  styleUrl: './user-avatar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAvatarComponent {
  readonly name = input.required<string>();
  readonly size = input<TuiSizeS | TuiSizeXXL>('s');
}

import { ChangeDetectionStrategy, Component } from '@angular/core';

import { UserMenuComponent } from '@core/user/components/user-menu/user-menu.component';

@Component({
  selector: 'app-header',
  imports: [UserMenuComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class HeaderComponent {}

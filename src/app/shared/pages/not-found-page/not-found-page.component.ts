import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiButton } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TuiBlockStatus, TuiCardLarge } from '@taiga-ui/layout';

@Component({
  imports: [RouterLink, TuiAvatar, TuiBlockStatus, TuiButton, TuiCardLarge],
  templateUrl: './not-found-page.component.html',
  styleUrl: './not-found-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class NotFoundPageComponent {}

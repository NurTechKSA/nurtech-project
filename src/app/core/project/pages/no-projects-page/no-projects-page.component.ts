import { ChangeDetectionStrategy, Component } from '@angular/core';

import { StatusCardComponent } from '@shared/components/status-card/status-card.component';

@Component({
  imports: [StatusCardComponent],
  templateUrl: './no-projects-page.component.html',
  styleUrl: './no-projects-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class NoProjectsPageComponent {}

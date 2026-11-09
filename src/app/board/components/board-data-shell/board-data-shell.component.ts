import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ProjectStore } from '@core/project/+store/project.store';

import { BoardStore } from '../../+store/board.store';
import { ProjectStatusesStore } from '../../../task/+store/project-statuses.store';

@Component({
  imports: [RouterOutlet],
  providers: [BoardStore, ProjectStatusesStore],
  template: '<router-outlet />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardDataShellComponent {
  private readonly projectStore = inject(ProjectStore);
  private readonly boardStore = inject(BoardStore);
  private readonly projectStatusesStore = inject(ProjectStatusesStore);

  constructor() {
    this.boardStore.loadBoards(this.projectStore.currentProjectId);
    this.projectStatusesStore.loadStatuses(this.projectStore.currentProjectId);
  }
}

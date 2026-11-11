import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ProjectStore } from '@core/project/+store/project.store';

import { BoardStore } from '../../+store/board.store';

@Component({
  imports: [RouterOutlet],
  providers: [BoardStore],
  template: '<router-outlet />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardDataShellComponent {
  private readonly projectStore = inject(ProjectStore);
  private readonly boardStore = inject(BoardStore);

  constructor() {
    this.boardStore.loadBoards(this.projectStore.currentProjectId);
  }
}

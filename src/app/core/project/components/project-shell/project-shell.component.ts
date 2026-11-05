import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnDestroy,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { PermissionStore } from '@core/permissions/+store/permission.store';

import { ProjectStore } from '../../+store/project.store';
import { BoardStore } from '../../../../board/+store/board.store';
import { Project } from '../../interfaces/project.interface';

@Component({
  imports: [RouterOutlet],
  providers: [BoardStore],
  templateUrl: './project-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectShellComponent implements OnDestroy {
  private readonly projectStore = inject(ProjectStore);
  private readonly permissionStore = inject(PermissionStore);
  private readonly boardStore = inject(BoardStore);

  // Имя совпадает с RouteParam.PROJECT_KEY: значение приходит из адреса
  readonly projectKey = input.required<Project['key']>();
  readonly isPermissionsLoaded = this.permissionStore.isLoaded;

  constructor() {
    this.projectStore.openProject(this.projectKey);
    this.boardStore.loadProjectData(this.projectStore.currentProjectId);
  }

  ngOnDestroy(): void {
    this.projectStore.closeProject();
  }
}

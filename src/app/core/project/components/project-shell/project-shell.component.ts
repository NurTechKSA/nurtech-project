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
import { Project } from '../../interfaces/project.interface';

@Component({
  imports: [RouterOutlet],
  templateUrl: './project-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectShellComponent implements OnDestroy {
  private readonly projectStore = inject(ProjectStore);
  private readonly permissionStore = inject(PermissionStore);

  // Имя совпадает с RouteParam.PROJECT_KEY: значение приходит из адреса
  readonly projectKey = input.required<Project['key']>();
  readonly isPermissionsLoaded = this.permissionStore.isLoaded;

  constructor() {
    this.projectStore.openProject(this.projectKey);
  }

  ngOnDestroy(): void {
    this.projectStore.closeProject();
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiButton, TuiDataList, TuiDropdown, TuiIcon } from '@taiga-ui/core';

import { AppPath } from '@core/enums/app-path.enum';

import { ProjectStore } from '../../+store/project.store';

@Component({
  selector: 'app-project-switcher',
  imports: [RouterLink, TuiButton, TuiDataList, TuiDropdown, TuiIcon],
  templateUrl: './project-switcher.component.html',
  styleUrl: './project-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectSwitcherComponent {
  private readonly projectStore = inject(ProjectStore);

  readonly isOpen = signal(false);

  readonly projects = this.projectStore.entities;
  readonly currentProject = this.projectStore.currentProject;
  readonly currentProjectKey = this.projectStore.currentProjectKey;
  readonly isLoaded = this.projectStore.isLoaded;

  readonly projectPath = `/${AppPath.PROJECT}`;

  constructor() {
    this.projectStore.loadProjects();
  }

  onProjectClick(): void {
    this.isOpen.set(false);
  }
}

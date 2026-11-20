import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';

import { ProjectStore } from '@core/project/+store/project.store';

import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { TaskDetail } from '../../interfaces/task-detail.interface';

@Component({
  imports: [TaskCardComponent],
  templateUrl: './task-page.component.html',
  styleUrl: './task-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskPageComponent {
  private readonly projectStore = inject(ProjectStore);

  readonly taskKey = input.required<TaskDetail['key']>();
  readonly project = this.projectStore.currentProject;
}

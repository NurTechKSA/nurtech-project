import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { Router } from '@angular/router';

import { AppPath } from '@core/enums/app-path.enum';

import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { TaskDetail } from '../../interfaces/task-detail.interface';

@Component({
  imports: [TaskCardComponent],
  templateUrl: './task-page.component.html',
  styleUrl: './task-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskPageComponent {
  private readonly router = inject(Router);

  readonly taskKey = input<TaskDetail['key']>();

  onTaskNotFound(): void {
    void this.router.navigate(['/', AppPath.NOT_FOUND], { replaceUrl: true });
  }
}

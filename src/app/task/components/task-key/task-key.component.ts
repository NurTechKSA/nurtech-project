import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { Router } from '@angular/router';
import { TuiLink } from '@taiga-ui/core';

import { TaskDetail } from '../../interfaces/task-detail.interface';
import { getTaskUrl } from '../../utils/task-url.util';

type ClickAction = (key: TaskDetail['key']) => void;

function isPlainLeftClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

@Component({
  selector: 'app-task-key',
  imports: [TuiLink],
  templateUrl: './task-key.component.html',
  styleUrl: './task-key.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskKeyComponent {
  private readonly router = inject(Router);

  readonly key = input.required<TaskDetail['key']>();
  readonly clickAction = input<ClickAction>();

  readonly taskHref = computed(() => getTaskUrl(this.key()));

  onLinkClick(event: MouseEvent): void {
    if (!isPlainLeftClick(event)) {
      return;
    }

    event.preventDefault();

    const customAction = this.clickAction();

    if (customAction) {
      customAction(this.key());

      return;
    }

    void this.router.navigateByUrl(this.taskHref());
  }
}

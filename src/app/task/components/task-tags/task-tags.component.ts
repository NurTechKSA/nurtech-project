import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { TuiHint } from '@taiga-ui/core';
import { TuiChip } from '@taiga-ui/kit';

import { IdName } from '../../interfaces/id-name.interface';

@Component({
  selector: 'app-task-tags',
  imports: [TuiChip, TuiHint],
  templateUrl: './task-tags.component.html',
  styleUrl: './task-tags.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskTagsComponent {
  readonly tags = input.required<readonly IdName[]>();
  readonly limit = input<number>();

  protected readonly visibleTags = computed(() =>
    this.tags().slice(0, this.limit())
  );
  protected readonly hiddenTags = computed(() => {
    const limit = this.limit();

    return limit === undefined ? [] : this.tags().slice(limit);
  });
  protected readonly hiddenCount = computed(() => this.hiddenTags().length);
}

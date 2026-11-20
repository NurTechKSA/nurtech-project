import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TuiError, TuiInput, TuiTextfield } from '@taiga-ui/core';
import { TuiEditor } from '@taiga-ui/editor';
import { TuiSegmented } from '@taiga-ui/kit';
import { startWith, switchMap } from 'rxjs';

import { MarkdownEditorDirective } from '@shared/directives/markdown-editor.directive';

import { TaskType } from '../../../../enums/task-type.enum';
import { CreateTaskForm } from '../../../../interfaces/create-task-form.interface';
import { TaskTypeIconComponent } from '../../../task-type-icon/task-type-icon.component';

const TASK_TYPES: readonly TaskType[] = [
  TaskType.TASK,
  TaskType.BUG,
  TaskType.SUBTASK,
];

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  [TaskType.TASK]: 'Task',
  [TaskType.BUG]: 'Bug',
  [TaskType.SUBTASK]: 'Subtask',
};

@Component({
  selector: 'app-create-task-main-fields',
  imports: [
    MarkdownEditorDirective,
    ReactiveFormsModule,
    TaskTypeIconComponent,
    TuiEditor,
    TuiError,
    TuiInput,
    TuiSegmented,
    TuiTextfield,
  ],
  templateUrl: './create-task-main-fields.component.html',
  styleUrl: './create-task-main-fields.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTaskMainFieldsComponent {
  readonly form = input.required<FormGroup<CreateTaskForm>>();

  protected readonly taskTypes = TASK_TYPES;
  protected readonly typeLabels = TASK_TYPE_LABELS;
  protected readonly selectedType = toSignal(
    toObservable(this.form).pipe(
      switchMap((form) =>
        form.controls.type.valueChanges.pipe(
          startWith(form.controls.type.value)
        )
      )
    )
  );
  protected readonly activeTypeIndex = computed(() => {
    const type = this.selectedType();

    return type ? TASK_TYPES.indexOf(type) : 0;
  });

  onTypeIndexChange(index: number): void {
    const nextType = TASK_TYPES.at(index);

    if (nextType) {
      this.form().controls.type.setValue(nextType);
    }
  }
}

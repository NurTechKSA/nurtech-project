import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { TuiValueTransformer } from '@taiga-ui/cdk';
import {
  provideTuiEditor,
  provideTuiEditorOptions,
  TUI_EDITOR_VALUE_TRANSFORMER,
  TuiEditor,
  TuiEditorTool,
  TuiMarkdown,
} from '@taiga-ui/editor';
import { TuiSegmented } from '@taiga-ui/kit';
import { filter, tap } from 'rxjs';

import { MarkdownViewerComponent } from '../markdown-viewer/markdown-viewer.component';

@Component({
  selector: 'app-markdown-editor',
  imports: [
    MarkdownViewerComponent,
    ReactiveFormsModule,
    TuiEditor,
    TuiSegmented,
  ],
  templateUrl: './markdown-editor.component.html',
  styleUrl: './markdown-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideTuiEditor(() =>
      Promise.resolve(TuiMarkdown.configure({ html: false }))
    ),
    provideTuiEditorOptions({
      tools: [
        TuiEditorTool.Bold,
        TuiEditorTool.Italic,
        TuiEditorTool.List,
        TuiEditorTool.Link,
        TuiEditorTool.Code,
      ],
    }),
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownEditorComponent),
      multi: true,
    },
    {
      provide: TUI_EDITOR_VALUE_TRANSFORMER,
      useExisting: forwardRef(() => MarkdownEditorComponent),
    },
  ],
})
export class MarkdownEditorComponent
  extends TuiValueTransformer<string | null, string | null>
  implements ControlValueAccessor
{
  private readonly editor = viewChild(TuiEditor);
  private readonly injector = inject(Injector);
  private isEditorLoaded = false;
  private isSyncingFromForm = false;
  private onChange?: (value: string) => void;
  private onTouched?: () => void;

  readonly placeholder = input<string>('');
  readonly readOnly = input(false, { transform: booleanAttribute });

  protected readonly editorControl = new FormControl('', { nonNullable: true });
  protected readonly activeTab = signal(0);
  protected readonly isDisabled = signal(false);
  protected readonly value = signal('');

  constructor() {
    super();

    // При загрузке и записи значения TuiEditor отдаёт нормализованный
    // markdown — это не ввод пользователя, форму помечать изменённой нельзя
    this.editorControl.valueChanges
      .pipe(
        filter(() => this.isEditorLoaded && !this.isSyncingFromForm),
        tap((value) => {
          this.value.set(value);
          this.onChange?.(value);
        }),
        takeUntilDestroyed()
      )
      .subscribe();
  }

  // Markdown из формы разбирает расширение TuiMarkdown
  override fromControlValue(markdown: string | null): string | null {
    return markdown;
  }

  // В форму уходит markdown вместо HTML редактора
  override toControlValue(): string {
    return (
      this.editor()
        ?.editorService.getOriginTiptapEditor()
        ?.storage.markdown.getMarkdown() ?? ''
    );
  }

  writeValue(value: string | null): void {
    const nextValue = value ?? '';

    this.value.set(nextValue);
    this.isSyncingFromForm = true;

    try {
      this.editorControl.setValue(nextValue, { emitEvent: false });
    } finally {
      this.isSyncingFromForm = false;
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);

    if (isDisabled) {
      this.editorControl.disable({ emitEvent: false });
    } else {
      this.editorControl.enable({ emitEvent: false });
    }
  }

  focus(): void {
    this.activeTab.set(0);
    afterNextRender(
      () => {
        this.editor()?.editorService.focus();
      },
      { injector: this.injector }
    );
  }

  protected onEditorLoaded(isLoaded: boolean): void {
    this.isEditorLoaded = isLoaded;
  }

  protected onTabChange(index: number): void {
    this.activeTab.set(index);
    this.onTouched?.();
  }

  protected onEditorBlur(): void {
    this.onTouched?.();
  }
}

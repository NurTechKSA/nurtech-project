import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
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

import { MarkdownViewerComponent } from '../markdown-viewer/markdown-viewer.component';

@Component({
  selector: 'app-markdown-editor',
  imports: [FormsModule, MarkdownViewerComponent, TuiEditor, TuiSegmented],
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
  private onChange?: (value: string) => void;
  private onTouched?: () => void;

  readonly placeholder = input<string>('');
  readonly readOnly = input(false, { transform: booleanAttribute });

  protected readonly activeTab = signal(0);
  protected readonly isDisabled = signal(false);
  protected readonly value = signal('');

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
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected onInput(value: string): void {
    this.value.set(value);
    this.onChange?.(value);
  }

  protected onTabChange(index: number): void {
    this.activeTab.set(index);
    this.onTouched?.();
  }

  protected onEditorBlur(): void {
    this.onTouched?.();
  }
}

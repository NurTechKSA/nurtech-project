import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { TuiEditor } from '@taiga-ui/editor';
import { TuiSegmented } from '@taiga-ui/kit';

import { MarkdownEditorDirective } from '../../directives/markdown-editor.directive';
import { MarkdownViewerComponent } from '../markdown-viewer/markdown-viewer.component';

@Component({
  selector: 'app-markdown-editor',
  imports: [
    FormsModule,
    MarkdownEditorDirective,
    MarkdownViewerComponent,
    TuiEditor,
    TuiSegmented,
  ],
  templateUrl: './markdown-editor.component.html',
  styleUrl: './markdown-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownEditorComponent),
      multi: true,
    },
  ],
})
export class MarkdownEditorComponent implements ControlValueAccessor {
  private onChange?: (value: string) => void;
  private onTouched?: () => void;

  readonly placeholder = input<string>('');

  protected readonly activeTab = signal<number>(0);
  protected readonly value = signal<string>('');

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
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

import { Directive, forwardRef, inject } from '@angular/core';
import { TuiValueTransformer } from '@taiga-ui/cdk';
import {
  provideTuiEditor,
  provideTuiEditorOptions,
  TUI_EDITOR_VALUE_TRANSFORMER,
  TuiEditorTool,
  TuiMarkdown,
  TuiTiptapEditorService,
} from '@taiga-ui/editor';

@Directive({
  selector: 'tui-editor[appMarkdownEditor]',
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
      provide: TUI_EDITOR_VALUE_TRANSFORMER,
      useExisting: forwardRef(() => MarkdownEditorDirective),
    },
  ],
})
export class MarkdownEditorDirective extends TuiValueTransformer<
  string | null,
  string | null
> {
  private readonly editor = inject(TuiTiptapEditorService);

  // Markdown из формы разбирает расширение TuiMarkdown
  override fromControlValue(markdown: string | null): string | null {
    return markdown;
  }

  // В форму уходит markdown вместо HTML редактора
  override toControlValue(): string {
    return (
      this.editor.getOriginTiptapEditor()?.storage.markdown.getMarkdown() ?? ''
    );
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import {
  provideTuiEditorOptions,
  TUI_EDITOR_SANITIZER,
  TuiEditorSocket,
} from '@taiga-ui/editor';
import MarkdownIt from 'markdown-it';

const SAFE_LINK_PROTOCOL = /^(https?:|mailto:)/i;

const markdownParser = new MarkdownIt({ html: false, linkify: true });
markdownParser.linkify.set({ fuzzyLink: false });

markdownParser.validateLink = (url: string): boolean =>
  SAFE_LINK_PROTOCOL.test(url.trim());

markdownParser.renderer.rules['link_open'] = (
  tokens,
  idx,
  options,
  _env,
  self
): string => {
  const token = tokens[idx];

  token.attrSet('target', '_blank');
  token.attrSet('rel', 'noopener noreferrer');

  return self.renderToken(tokens, idx, options);
};

@Component({
  selector: 'app-markdown-viewer',
  imports: [TuiEditorSocket],
  providers: [
    provideTuiEditorOptions({ enableDefaultStyles: false }),
    { provide: TUI_EDITOR_SANITIZER, useExisting: DomSanitizer },
  ],
  templateUrl: './markdown-viewer.component.html',
  styleUrl: './markdown-viewer.component.scss',
  // Сгенерированный HTML не получает атрибуты инкапсуляции Angular; стили ограничены .markdown-viewer.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownViewerComponent {
  readonly markdown = input.required<string>();

  protected readonly html = computed(() =>
    markdownParser.render(this.markdown())
  );
}

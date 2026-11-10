import {
  ChangeDetectionStrategy,
  Component,
  input,
  ViewEncapsulation,
} from '@angular/core';
import {
  MARKED_OPTIONS,
  MarkdownComponent,
  MarkedRenderer,
  provideMarkdown,
} from 'ngx-markdown';

const SAFE_LINK_PROTOCOL = /^(https?:|mailto:)/i;
const defaultRenderer = new MarkedRenderer();
const markdownRenderer = new MarkedRenderer();

markdownRenderer.link = function (this: MarkedRenderer, token): string {
  if (!SAFE_LINK_PROTOCOL.test(token.href.trim())) {
    return this.parser.parseInline(token.tokens);
  }

  return defaultRenderer.link
    .call(this, token)
    .replace('<a ', '<a target="_blank" rel="noopener noreferrer" ');
};

@Component({
  selector: 'app-markdown-viewer',
  imports: [MarkdownComponent],
  providers: [
    provideMarkdown({
      markedOptions: {
        provide: MARKED_OPTIONS,
        useValue: { renderer: markdownRenderer },
      },
    }),
  ],
  templateUrl: './markdown-viewer.component.html',
  styleUrl: './markdown-viewer.component.scss',
  // Сгенерированный HTML не получает атрибуты инкапсуляции Angular; стили ограничены .markdown-viewer.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkdownViewerComponent {
  readonly markdown = input.required<string>();
}

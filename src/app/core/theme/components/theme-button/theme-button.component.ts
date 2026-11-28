import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TUI_DARK_MODE, TuiButton } from '@taiga-ui/core';

@Component({
  selector: 'app-theme-button',
  imports: [TuiButton],
  templateUrl: './theme-button.component.html',
  styleUrl: './theme-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeButtonComponent {
  readonly darkMode = inject(TUI_DARK_MODE);

  onThemeButtonClick(): void {
    this.darkMode.update((isDark) => !isDark);
  }
}

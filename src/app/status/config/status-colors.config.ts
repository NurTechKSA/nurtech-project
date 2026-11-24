import { StatusColor } from '../enums/status-color.enum';

export const STATUS_COLORS: Record<StatusColor, string> = {
  [StatusColor.GREEN]: 'var(--tui-status-positive)',
  [StatusColor.RED]: 'var(--tui-status-negative)',
  [StatusColor.YELLOW]: 'var(--tui-status-warning)',
  [StatusColor.BLUE]: 'var(--tui-status-info)',
  [StatusColor.GRAY]: 'var(--tui-status-neutral)',
  [StatusColor.CYAN]: 'var(--tui-chart-categorical-16)',
  [StatusColor.ORANGE]: 'var(--tui-chart-categorical-09)',
  [StatusColor.PURPLE]: 'var(--tui-chart-categorical-10)',
};

import { UserRef } from '@core/user/interfaces/user-ref.interface';

import { HistoryField } from './history-field.interface';
import { HistoryKind } from './history-kind.interface';
import { HistoryValue } from './history-value.interface';
import { LinkType } from '../enums/link-type.enum';

export interface HistoryEvent {
  id: string;
  kind: HistoryKind;
  field: HistoryField | LinkType | null;
  oldValue: HistoryValue | null;
  newValue: HistoryValue | null;
  createdAt: string;
  actor: UserRef;
}

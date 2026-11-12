import { UserRef } from '@core/user/interfaces/user-ref.interface';

import { HistoryValue } from './history-value.interface';
import { HistoryField } from '../enums/history-field.enum';
import { HistoryKind } from '../enums/history-kind.enum';
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

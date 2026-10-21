import type { Q } from '../db/db.js';

export type HistoryKind =
  | 'created'
  | 'field_changed'
  | 'link_added'
  | 'link_removed'
  | 'url_added'
  | 'url_removed'
  | 'tag_added'
  | 'tag_removed';

export interface HistoryValue {
  id: string | null;
  label: string;
}

export interface HistoryInput {
  taskId: string;
  kind: HistoryKind;
  field?: string | null;
  oldValue?: HistoryValue | null;
  newValue?: HistoryValue | null;
}

/**
 * Пишет события истории. Момент - now() транзакции: все события одного запроса
 * получают общий createdAt. Подпись (label) фиксируется на момент события.
 */
export async function writeHistory(q: Q, actorId: string, events: HistoryInput[]) {
  if (!events.length) return;
  await q
    .insertInto('history_events')
    .values(
      events.map((e) => ({
        task_id: e.taskId,
        actor_id: actorId,
        kind: e.kind,
        field: e.field ?? null,
        old_value: e.oldValue ? JSON.stringify(e.oldValue) : null,
        new_value: e.newValue ? JSON.stringify(e.newValue) : null,
      })),
    )
    .execute();
}

export const scalar = (v: string | number | null | undefined): HistoryValue | null =>
  v === null || v === undefined ? null : { id: null, label: String(v) };

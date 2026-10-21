import { sql } from 'kysely';
import type { Q } from '../db/db.js';

/**
 * Порядок карточек внутри статуса - fractional indexing на base62. Строки сравниваются
 * побайтно (в базе COLLATE "C"); ключи не оканчиваются на '0', поэтому между любыми двумя
 * всегда найдётся третий.
 */
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const MAX_RANK_LENGTH = 64;

/** Ключ строго между a и b (null - край). Требует a < b. */
export function rankBetween(a: string | null, b: string | null): string {
  if (a !== null && b !== null && a >= b) throw new Error(`rankBetween: ${a} >= ${b}`);
  return midpoint(a ?? '', b);
}

function midpoint(a: string, b: string | null): string {
  if (b !== null) {
    let n = 0;
    while ((a[n] ?? '0') === b[n]) n++;
    if (n > 0) return b.slice(0, n) + midpoint(a.slice(n), b.slice(n));
  }
  const digitA = a ? DIGITS.indexOf(a[0]) : 0;
  const digitB = b !== null ? DIGITS.indexOf(b[0]) : DIGITS.length;
  if (digitB - digitA > 1) return DIGITS[Math.round((digitA + digitB) / 2)];
  if (b !== null && b.length > 1) return b.slice(0, 1);
  return DIGITS[digitA] + midpoint(a.slice(1), null);
}

/** n ключей с равными промежутками по возрастанию */
export function evenRanks(n: number): string[] {
  let width = 1;
  while (DIGITS.length ** width < (n + 1) * 64) width++;
  const space = DIGITS.length ** width;
  const step = Math.floor(space / (n + 1));
  const out: string[] = [];
  for (let i = 1; i <= n; i++) {
    let v = i * step;
    let s = '';
    for (let k = 0; k < width; k++) {
      s = DIGITS[v % DIGITS.length] + s;
      v = Math.floor(v / DIGITS.length);
    }
    out.push(s.replace(/0+$/, ''));
  }
  return out;
}

/** Блокировка строки статуса: расчёт позиций в одном статусе идёт по очереди */
export async function lockStatus(tx: Q, statusId: string) {
  await sql`SELECT id FROM statuses WHERE id = ${statusId} FOR UPDATE`.execute(tx);
}

export type Placement = { kind: 'end' } | { kind: 'after'; id: string } | { kind: 'before'; id: string };

/**
 * Ранг для задачи в статусе (под lockStatus): в конец, сразу после или сразу перед соседом.
 * Соседние ранги ищутся по всем задачам статуса, включая скрытые фильтрами доски.
 * Слишком длинный ключ - равномерная перенумерация статуса в той же транзакции.
 */
export async function computeRank(tx: Q, statusId: string, place: Placement, excludeTaskId: string | null): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const rank = await rankFor(tx, statusId, place, excludeTaskId);
    if (rank.length <= MAX_RANK_LENGTH || attempt === 1) return rank;
    await rebalance(tx, statusId, excludeTaskId);
  }
  throw new Error('unreachable');
}

async function rankFor(tx: Q, statusId: string, place: Placement, excludeTaskId: string | null): Promise<string> {
  const others = (q: any) => (excludeTaskId ? q.where('id', '<>', excludeTaskId) : q);
  if (place.kind === 'end') {
    const row = await others(tx.selectFrom('tasks').select(sql<string | null>`max(rank)`.as('max')).where('status_id', '=', statusId)).executeTakeFirst();
    return rankBetween(row?.max ?? null, null);
  }
  const neighbor = await tx.selectFrom('tasks').select('rank').where('id', '=', place.id).executeTakeFirstOrThrow();
  if (place.kind === 'after') {
    const next = await others(
      tx.selectFrom('tasks').select(sql<string | null>`min(rank)`.as('v')).where('status_id', '=', statusId).where('rank', '>', neighbor.rank),
    ).executeTakeFirst();
    return rankBetween(neighbor.rank, next?.v ?? null);
  }
  const prev = await others(
    tx.selectFrom('tasks').select(sql<string | null>`max(rank)`.as('v')).where('status_id', '=', statusId).where('rank', '<', neighbor.rank),
  ).executeTakeFirst();
  return rankBetween(prev?.v ?? null, neighbor.rank);
}

async function rebalance(tx: Q, statusId: string, excludeTaskId: string | null) {
  let q = tx.selectFrom('tasks').select('id').where('status_id', '=', statusId).orderBy('rank');
  if (excludeTaskId) q = q.where('id', '<>', excludeTaskId);
  const rows = await q.execute();
  const ranks = evenRanks(rows.length);
  // Ограничение (status_id, rank) отложенное - временные совпадения внутри транзакции допустимы
  for (let i = 0; i < rows.length; i++) {
    await tx.updateTable('tasks').set({ rank: ranks[i] }).where('id', '=', rows[i].id).execute();
  }
}

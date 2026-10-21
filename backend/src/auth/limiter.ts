import { tooManyAttempts } from '../http/errors.js';

const WINDOW_MS = 15 * 60 * 1000;
const LIMITS = { pair: 10, login: 20, ip: 30 } as const;

/**
 * Неудачные попытки входа и смены пароля за скользящие 15 минут:
 * 10 на пару (логин, IP), 20 на логин, 30 на IP. Хранится в памяти процесса.
 */
export class AttemptLimiter {
  private readonly hits = new Map<string, number[]>();

  /** Бросает 429, если хотя бы один счётчик исчерпан */
  check(username: string, ip: string, now = Date.now()) {
    let retryAfterMs = 0;
    for (const [key, limit] of this.keys(username, ip)) {
      const list = this.fresh(key, now);
      if (list.length >= limit) {
        retryAfterMs = Math.max(retryAfterMs, list[list.length - limit] + WINDOW_MS - now);
      }
    }
    if (retryAfterMs > 0) throw tooManyAttempts(retryAfterMs / 1000);
  }

  fail(username: string, ip: string, now = Date.now()) {
    for (const [key] of this.keys(username, ip)) {
      const list = this.fresh(key, now);
      list.push(now);
      this.hits.set(key, list);
    }
  }

  /** Успешный вход сбрасывает счётчик пары */
  succeed(username: string, ip: string) {
    this.hits.delete(`p:${username}|${ip}`);
  }

  reset() {
    this.hits.clear();
  }

  private keys(username: string, ip: string): Array<[string, number]> {
    return [
      [`p:${username}|${ip}`, LIMITS.pair],
      [`l:${username}`, LIMITS.login],
      [`i:${ip}`, LIMITS.ip],
    ];
  }

  private fresh(key: string, now: number): number[] {
    const list = (this.hits.get(key) ?? []).filter((t) => t > now - WINDOW_MS);
    if (list.length) this.hits.set(key, list);
    else this.hits.delete(key);
    return list;
  }
}

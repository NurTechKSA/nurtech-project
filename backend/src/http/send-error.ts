import type { Request, Response } from 'express';
import { ApiError } from './errors.js';

/** Единый формат ошибки: { error: { code, message, fields?, requestId? (только 5xx) } } */
export function sendError(req: Request, res: Response, err: unknown) {
  const requestId = (req as Request & { id?: string }).id ?? '';
  if (err instanceof ApiError) {
    for (const [k, v] of Object.entries(err.headers ?? {})) res.setHeader(k, v);
    const body: Record<string, unknown> = { code: err.code, message: err.message };
    if (err.fields && Object.keys(err.fields).length) body.fields = err.fields;
    res.status(err.status).json({ error: body });
    return;
  }
  // Стек и текст исключения наружу не отдаём; в журнал - с requestId
  console.error(JSON.stringify({ level: 'error', requestId, method: req.method, path: maskPath(req.path), error: String((err as Error)?.stack ?? err) }));
  res.status(500).json({ error: { code: 'internal_error', message: 'Что-то пошло не так. Попробуйте ещё раз', requestId } });
}

/** Токен приглашения в адресе в журнал не пишем */
export function maskPath(path: string): string {
  return path.replace(/\/invitations\/[^/]+/, '/invitations/***');
}

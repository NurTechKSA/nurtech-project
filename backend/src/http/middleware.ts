import { randomUUID } from 'node:crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Config } from '../config.js';
import { ApiError, badRequest, forbidden, notFound } from './errors.js';
import { sendError } from './send-error.js';

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** X-Request-Id (присланный клиентом или новый) и Referrer-Policy - в каждом ответе */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  const id = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  (req as Request & { id: string }).id = id;
  res.setHeader('X-Request-Id', id);
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
}

/** CORS только для разрешённых origin, с cookie */
export function cors(config: Config) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.header('origin');
    if (origin && config.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE');
        res.setHeader('Access-Control-Allow-Headers', req.header('access-control-request-headers') ?? 'Content-Type, X-Request-Id');
        res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id, Retry-After');
        res.setHeader('Access-Control-Max-Age', '600');
        res.status(204).end();
        return;
      }
      res.setHeader('Access-Control-Expose-Headers', 'X-Request-Id, Retry-After');
    }
    next();
  };
}

/** Не-GET: Origin (или Referer) из ALLOWED_ORIGINS; тело - только application/json */
export function originAndContentType(config: Config) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.header('origin') ?? refererOrigin(req.header('referer'));
    if (!origin || !config.allowedOrigins.includes(origin)) {
      return sendError(req, res, forbidden('Запрос с неразрешённого адреса'));
    }
    const hasBody = Number(req.header('content-length') ?? 0) > 0 || req.header('transfer-encoding') !== undefined;
    if (hasBody && !req.is('application/json')) {
      return sendError(req, res, badRequest('Нужен Content-Type: application/json'));
    }
    next();
  };
}

function refererOrigin(referer: string | undefined): string | undefined {
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}

/** JSON-парсер: битый JSON - 400 bad_request */
export function jsonBody() {
  const parser = express.json({ limit: '256kb', strict: true });
  return (req: Request, res: Response, next: NextFunction) => {
    parser(req, res, (err?: unknown) => {
      if (err) {
        const tooLarge = (err as { type?: string }).type === 'entity.too.large';
        return sendError(req, res, badRequest(tooLarge ? 'Слишком большой запрос' : 'Тело запроса - не корректный JSON'));
      }
      next();
    });
  };
}

export function notFoundFallback(req: Request, res: Response) {
  sendError(req, res, notFound('Такого адреса нет в API'));
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

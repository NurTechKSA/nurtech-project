import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { requestId } from '../src/http/middleware.js';
import { sendError } from '../src/http/send-error.js';

describe('00. Ошибка сервера', () => {
  it('5xx: internal_error, requestId в теле равен заголовку, без стека и текста исключения', async () => {
    const app = express();
    app.use(requestId);
    app.get('/boom', (req, res) => {
      const original = console.error;
      console.error = () => {};
      sendError(req, res, new Error('секретная деталь SQL'));
      console.error = original;
    });
    const r = await request(app).get('/boom');
    expect(r.status).toBe(500);
    expect(r.body.error.code).toBe('internal_error');
    expect(r.body.error.requestId).toBe(r.headers['x-request-id']);
    expect(JSON.stringify(r.body)).not.toContain('секретная');
  });
});

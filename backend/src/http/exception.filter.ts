import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiError, badRequest, notFound } from './errors.js';
import { sendError } from './send-error.js';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    let err = exception;
    if (exception instanceof HttpException && !(exception instanceof ApiError)) {
      const status = exception.getStatus();
      err = status === 404 ? notFound('Такого адреса нет в API') : status < 500 ? badRequest() : exception;
    }
    sendError(req, res, err);
  }
}

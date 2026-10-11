import { HttpInterceptorFn } from '@angular/common/http';

const API_URL = '/api';
const SKIPPED_URL_PATTERN = /^(https?:)?\/\/|^assets\//;

export const apiUrlInterceptor: HttpInterceptorFn = (request, next) => {
  if (SKIPPED_URL_PATTERN.test(request.url)) {
    return next(request);
  }

  return next(request.clone({ url: `${API_URL}/${request.url}` }));
};

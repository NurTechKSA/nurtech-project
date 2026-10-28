import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { User } from '@core/user/interfaces/user.interface';

import { LoginRequest } from '../interfaces/api/login-request.interface';
import { MeResponse } from '../interfaces/api/me-response.interface';
import { SKIP_UNAUTHORIZED } from '../tokens/skip-unauthorized.token';

@Injectable({ providedIn: 'root' })
export class ApiAuthService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'auth';

  getMe(): Observable<User> {
    return this.http
      .get<MeResponse>(`${this.endpoint}/me`, {
        context: new HttpContext().set(SKIP_UNAUTHORIZED, true),
      })
      .pipe(map(({ user }) => user));
  }

  login(body: LoginRequest): Observable<User> {
    return this.http
      .post<MeResponse>(`${this.endpoint}/login`, body, {
        context: new HttpContext().set(SKIP_UNAUTHORIZED, true),
      })
      .pipe(map(({ user }) => user));
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.endpoint}/logout`, null);
  }
}

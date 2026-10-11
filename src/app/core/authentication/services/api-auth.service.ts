import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { User } from '@core/user/interfaces/user.interface';

import { LoginRequest } from '../interfaces/api/login-request.interface';
import { UserResponse } from '../interfaces/api/user-response.interface';

@Injectable({ providedIn: 'root' })
export class ApiAuthService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'auth';

  getMe(): Observable<User> {
    return this.http
      .get<UserResponse>(`${this.endpoint}/me`)
      .pipe(map(({ user }) => user));
  }

  login(body: LoginRequest): Observable<User> {
    return this.http
      .post<UserResponse>(`${this.endpoint}/login`, body)
      .pipe(map(({ user }) => user));
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.endpoint}/logout`, null);
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';
import { UserRef } from '@core/user/interfaces/user-ref.interface';

import { MemberListResponse } from '../interfaces/api/member-list-response.interface';

@Injectable({ providedIn: 'root' })
export class ApiMemberService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly endpoint = 'projects';

  getMembers(projectId: Project['id']): Observable<UserRef[]> {
    return this.http
      .get<MemberListResponse>(`${this.endpoint}/${projectId}/members`)
      .pipe(map(({ items }) => items));
  }
}

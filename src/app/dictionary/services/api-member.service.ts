import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';

import { MemberListResponse } from '../interfaces/api/member-list-response.interface';
import { Member } from '../interfaces/member.interface';

@Injectable({ providedIn: 'root' })
export class ApiMemberService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'projects';

  getMembers(id: Project['id']): Observable<Member[]> {
    return this.http
      .get<MemberListResponse>(`${this.endpoint}/${id}/members`)
      .pipe(map(({ items }) => items));
  }
}

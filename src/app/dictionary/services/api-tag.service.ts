import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';
import { SKIP_ERROR_NOTIFICATION } from '@core/tokens/skip-error-notification.token';

import { TagCreateRequest } from '../interfaces/api/tag-create-request.interface';
import { TagListResponse } from '../interfaces/api/tag-list-response.interface';
import { Tag } from '../interfaces/tag.interface';

@Injectable({ providedIn: 'root' })
export class ApiTagService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'projects';

  getTags(id: Project['id']): Observable<Tag[]> {
    return this.http
      .get<TagListResponse>(`${this.endpoint}/${id}/tags`)
      .pipe(map(({ items }) => items));
  }

  createTag(id: Project['id'], payload: TagCreateRequest): Observable<Tag> {
    return this.http.post<Tag>(`${this.endpoint}/${id}/tags`, payload, {
      context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
    });
  }
}

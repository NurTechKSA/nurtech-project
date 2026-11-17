import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';
import { buildHttpParams } from '@shared/utils/build-http-params.util';

import { TaskCreateRequest } from '../interfaces/api/requests/task-create-request.interface';
import { TaskMoveRequest } from '../interfaces/api/requests/task-move-request.interface';
import { TaskSearchRequest } from '../interfaces/api/requests/task-search-request.interface';
import { TaskUpdateRequest } from '../interfaces/api/requests/task-update-request.interface';
import { HistoryListResponse } from '../interfaces/api/responses/history-list-response.interface';
import { TaskByKeyResponse } from '../interfaces/api/responses/task-by-key-response.interface';
import { TaskCreateResponse } from '../interfaces/api/responses/task-create-response.interface';
import { TaskSearchResponse } from '../interfaces/api/responses/task-search-response.interface';
import { HistoryEvent } from '../interfaces/history-event.interface';
import { TaskDetail } from '../interfaces/task-detail.interface';
import { TaskSearchItem } from '../interfaces/task-search-item.interface';

@Injectable({
  providedIn: 'root',
})
export class ApiTaskService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'tasks';

  getTaskByKey(
    id: Project['id'],
    key: TaskDetail['key']
  ): Observable<TaskByKeyResponse> {
    return this.http.get<TaskByKeyResponse>(
      `projects/${id}/${this.endpoint}/by-key/${key}`
    );
  }

  createTask(
    id: Project['id'],
    payload: TaskCreateRequest
  ): Observable<TaskCreateResponse> {
    return this.http.post<TaskCreateResponse>(
      `projects/${id}/${this.endpoint}`,
      payload
    );
  }

  updateTask(
    id: TaskDetail['id'],
    payload: TaskUpdateRequest
  ): Observable<TaskDetail> {
    return this.http.patch<TaskDetail>(`${this.endpoint}/${id}`, payload);
  }

  moveTask(
    id: TaskDetail['id'],
    payload: TaskMoveRequest
  ): Observable<TaskDetail> {
    return this.http.post<TaskDetail>(`${this.endpoint}/${id}/move`, payload);
  }

  getTaskHistory(id: TaskDetail['id']): Observable<HistoryEvent[]> {
    return this.http
      .get<HistoryListResponse>(`${this.endpoint}/${id}/history`)
      .pipe(map(({ items }) => items));
  }

  searchTasks(
    id: Project['id'],
    payload: TaskSearchRequest
  ): Observable<TaskSearchItem[]> {
    const params = buildHttpParams(payload);

    return this.http
      .get<TaskSearchResponse>(`projects/${id}/${this.endpoint}/search`, {
        params,
      })
      .pipe(map(({ items }) => items));
  }
}

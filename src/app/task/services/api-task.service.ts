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
  private readonly projectEndpoint = 'projects';
  private readonly taskEndpoint = 'tasks';

  getTaskByKey(
    projectId: Project['id'],
    taskKey: TaskDetail['key']
  ): Observable<TaskByKeyResponse> {
    return this.http.get<TaskByKeyResponse>(
      `${this.projectEndpoint}/${projectId}/${this.taskEndpoint}/by-key/${taskKey}`
    );
  }

  createTask(
    projectId: Project['id'],
    payload: TaskCreateRequest
  ): Observable<TaskCreateResponse> {
    return this.http.post<TaskCreateResponse>(
      `${this.projectEndpoint}/${projectId}/${this.taskEndpoint}`,
      payload
    );
  }

  updateTask(
    taskId: TaskDetail['id'],
    payload: TaskUpdateRequest
  ): Observable<TaskDetail> {
    return this.http.patch<TaskDetail>(
      `${this.taskEndpoint}/${taskId}`,
      payload
    );
  }

  moveTask(
    taskId: TaskDetail['id'],
    payload: TaskMoveRequest
  ): Observable<TaskDetail> {
    return this.http.post<TaskDetail>(
      `${this.taskEndpoint}/${taskId}/move`,
      payload
    );
  }

  getTaskHistory(taskId: TaskDetail['id']): Observable<HistoryEvent[]> {
    return this.http
      .get<HistoryListResponse>(`${this.taskEndpoint}/${taskId}/history`)
      .pipe(map(({ items }) => items));
  }

  searchTasks(
    projectId: Project['id'],
    payload: TaskSearchRequest
  ): Observable<TaskSearchItem[]> {
    const params = buildHttpParams(payload);

    return this.http
      .get<TaskSearchResponse>(
        `${this.projectEndpoint}/${projectId}/${this.taskEndpoint}/search`,
        { params }
      )
      .pipe(map(({ items }) => items));
  }
}

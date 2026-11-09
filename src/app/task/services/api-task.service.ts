import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { Project } from '@core/project/interfaces/project.interface';
import { buildHttpParams } from '@shared/utils/build-http-params.util';

import { TaskCreateRequest } from '../interfaces/api/task-create-request.interface';
import { TaskMoveRequest } from '../interfaces/api/task-move-request.interface';
import { TaskSearchRequest } from '../interfaces/api/task-search-request.interface';
import { TaskUpdateRequest } from '../interfaces/api/task-update-request.interface';
import { HistoryEvent } from '../interfaces/history-event.interface';
import { HistoryListResponse } from '../interfaces/history-list-response.interface';
import { TaskDetail } from '../interfaces/task-detail.interface';
import { TaskSearchItem } from '../interfaces/task-search-item.interface';
import { TaskSearchResult } from '../interfaces/task-search-result.interface';

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
  ): Observable<TaskDetail> {
    return this.http.get<TaskDetail>(
      `${this.projectEndpoint}/${projectId}/${this.taskEndpoint}/by-key/${taskKey}`
    );
  }

  createTask(
    projectId: Project['id'],
    payload: TaskCreateRequest
  ): Observable<TaskDetail> {
    return this.http.post<TaskDetail>(
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
      .get<TaskSearchResult>(
        `${this.projectEndpoint}/${projectId}/${this.taskEndpoint}/search`,
        { params }
      )
      .pipe(map(({ items }) => items));
  }
}

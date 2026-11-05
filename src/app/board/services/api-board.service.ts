import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { BoardCardsResponse } from '../interfaces/api/board-cards-response.interface';
import { BoardListResponse } from '../interfaces/api/board-list-response.interface';
import { StatusListResponse } from '../interfaces/api/status-list-response.interface';
import { BoardColumnCards } from '../interfaces/board-column-cards.interface';
import { Board } from '../interfaces/board.interface';
import { Status } from '../interfaces/status.interface';

@Injectable({ providedIn: 'root' })
export class ApiBoardService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'projects';

  getBoards(projectId: string): Observable<Board[]> {
    return this.http
      .get<BoardListResponse>(`${this.endpoint}/${projectId}/boards`)
      .pipe(map(({ items }) => items));
  }

  getStatuses(projectId: string): Observable<Status[]> {
    return this.http
      .get<StatusListResponse>(`${this.endpoint}/${projectId}/statuses`)
      .pipe(map(({ items }) => items));
  }

  getBoardCards(boardId: string): Observable<BoardColumnCards[]> {
    return this.http
      .get<BoardCardsResponse>(`boards/${boardId}/cards`)
      .pipe(map(({ columns }) => columns));
  }
}

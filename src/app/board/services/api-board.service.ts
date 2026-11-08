import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { BoardCardsResponse } from '../interfaces/api/board-cards-response.interface';
import { BoardListResponse } from '../interfaces/api/board-list-response.interface';
import { BoardColumn } from '../interfaces/board-column.interface';
import { Board } from '../interfaces/board.interface';

@Injectable({ providedIn: 'root' })
export class ApiBoardService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'projects';

  getBoards(projectId: string): Observable<Board[]> {
    return this.http
      .get<BoardListResponse>(`${this.endpoint}/${projectId}/boards`)
      .pipe(map(({ items }) => items));
  }

  getBoardCards(boardId: string): Observable<BoardColumn[]> {
    return this.http
      .get<BoardCardsResponse>(`boards/${boardId}/cards`)
      .pipe(map(({ columns }) => columns));
  }
}

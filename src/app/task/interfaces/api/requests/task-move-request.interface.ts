export interface TaskMoveRequest {
  statusId: string;
  prevId?: string | null;
  nextId?: string | null;
  reason?: string;
}

import type { ColumnType, Generated } from 'kysely';

type Ts = ColumnType<Date, Date | string | undefined, Date | string>;
type TsNull = ColumnType<Date | null, Date | string | null | undefined, Date | string | null>;
type Json = ColumnType<unknown, string, string>;

export interface UsersTable {
  id: Generated<string>;
  name: string;
  username: string | null;
  password_hash: string | null;
  created_at: Ts;
}

export interface InvitationsTable {
  id: Generated<string>;
  user_id: string;
  kind: 'new' | 'reissue';
  token_hash: Buffer;
  expires_at: Ts;
  used_at: TsNull;
  revoked_at: TsNull;
  created_at: Ts;
}

export interface SessionsTable {
  id: Generated<string>;
  user_id: string;
  token_hash: Buffer;
  created_at: Ts;
  expires_at: Ts;
  revoked_at: TsNull;
}

export interface ProjectsTable {
  id: Generated<string>;
  key: string;
  name: string;
  template: 'dev' | 'simple';
  task_seq: Generated<number>;
  created_at: Ts;
}

export interface MembershipsTable {
  project_id: string;
  user_id: string;
  role: Role;
  created_at: Ts;
}

export interface StatusesTable {
  id: Generated<string>;
  project_id: string;
  name: string;
  color: string;
  category: StatusCategory;
  requires_reason: boolean;
  position: number;
}

export interface SubsystemsTable {
  id: Generated<string>;
  project_id: string;
  name: string;
}

export interface BoardsTable {
  id: Generated<string>;
  project_id: string;
  name: string;
  done_window_days: Generated<number>;
  base_filter: ColumnType<BaseFilter, string | undefined, string>;
  position: number;
  created_at: Ts;
}

export interface BoardColumnsTable {
  board_id: string;
  status_id: string;
  position: number;
}

export interface TagsTable {
  id: Generated<string>;
  project_id: string;
  name: string;
  created_at: Ts;
}

export interface TasksTable {
  id: Generated<string>;
  project_id: string;
  number: number;
  parent_id: string | null;
  type: TaskType;
  title: string;
  description: string | null;
  status_id: string;
  priority: Priority;
  assignee_id: string | null;
  reviewer_id: string | null;
  subsystem_id: string | null;
  due_date: string | null;
  estimate_minutes: number | null;
  reporter_id: string;
  rank: string;
  created_at: Ts;
  updated_at: Ts;
  closed_at: TsNull;
}

export interface TaskTagsTable {
  task_id: string;
  tag_id: string;
}

export interface TaskLinksTable {
  id: Generated<string>;
  project_id: string;
  from_task_id: string;
  to_task_id: string;
  created_at: Ts;
}

export interface TaskUrlsTable {
  id: Generated<string>;
  task_id: string;
  url: string;
  title: string | null;
  created_at: Ts;
}

export interface CommentsTable {
  id: Generated<string>;
  task_id: string;
  author_id: string;
  kind: 'comment' | 'status_reason';
  body: string;
  created_at: Ts;
  edited_at: TsNull;
}

export interface WorklogsTable {
  id: Generated<string>;
  task_id: string;
  user_id: string;
  date: string;
  minutes: number;
  comment: string | null;
  created_at: Ts;
}

export interface HistoryEventsTable {
  id: Generated<string>;
  task_id: string;
  actor_id: string;
  kind: string;
  field: string | null;
  old_value: Json | null;
  new_value: Json | null;
  created_at: Ts;
  seq: Generated<string>;
}

export interface Database {
  users: UsersTable;
  invitations: InvitationsTable;
  sessions: SessionsTable;
  projects: ProjectsTable;
  memberships: MembershipsTable;
  statuses: StatusesTable;
  subsystems: SubsystemsTable;
  boards: BoardsTable;
  board_columns: BoardColumnsTable;
  tags: TagsTable;
  tasks: TasksTable;
  task_tags: TaskTagsTable;
  task_links: TaskLinksTable;
  task_urls: TaskUrlsTable;
  comments: CommentsTable;
  worklogs: WorklogsTable;
  history_events: HistoryEventsTable;
}

export type Role = 'owner' | 'admin' | 'member' | 'viewer';
export type StatusCategory = 'backlog' | 'todo' | 'in_progress' | 'done';
export type TaskType = 'task' | 'bug' | 'subtask';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

/** Базовый фильтр доски: те же значения, что и у пользовательских фильтров карточек */
export interface BaseFilter {
  assignee?: string[];
  reviewer?: string[];
  priority?: Priority[];
  type?: TaskType[];
  subsystem?: string[];
  tag?: string[];
}

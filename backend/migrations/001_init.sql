-- Схема MVP. Все моменты времени - timestamptz(3): миллисекунды, чтобы значение
-- без потерь проходило через JS Date (курсор комментариев, сравнения).

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  username      text UNIQUE CHECK (username ~ '^[a-z0-9_]{3,32}$'),
  password_hash text,
  created_at    timestamptz(3) NOT NULL DEFAULT now()
);

CREATE TABLE invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('new', 'reissue')),
  token_hash  bytea NOT NULL UNIQUE,
  expires_at  timestamptz(3) NOT NULL,
  used_at     timestamptz(3),
  revoked_at  timestamptz(3),
  created_at  timestamptz(3) NOT NULL DEFAULT now()
);
CREATE INDEX invitations_user_idx ON invitations (user_id);

CREATE TABLE sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   bytea NOT NULL UNIQUE,
  created_at   timestamptz(3) NOT NULL DEFAULT now(),
  expires_at   timestamptz(3) NOT NULL,
  revoked_at   timestamptz(3)
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE CHECK (key ~ '^[A-Z][A-Z0-9]{1,5}$'),
  name        text NOT NULL,
  template    text NOT NULL CHECK (template IN ('dev', 'simple')),
  task_seq    integer NOT NULL DEFAULT 0,
  created_at  timestamptz(3) NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at  timestamptz(3) NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX memberships_user_idx ON memberships (user_id);

CREATE TABLE statuses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name             text NOT NULL,
  color            text NOT NULL CHECK (color IN ('gray','blue','cyan','green','yellow','orange','red','purple')),
  category         text NOT NULL CHECK (category IN ('backlog','todo','in_progress','done')),
  requires_reason  boolean NOT NULL DEFAULT false,
  position         integer NOT NULL
);
CREATE INDEX statuses_project_idx ON statuses (project_id, position);

CREATE TABLE subsystems (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        text NOT NULL
);
CREATE INDEX subsystems_project_idx ON subsystems (project_id);

CREATE TABLE boards (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name              text NOT NULL,
  done_window_days  integer NOT NULL DEFAULT 14 CHECK (done_window_days BETWEEN 1 AND 365),
  -- Базовый фильтр: { assignee?, reviewer?, priority?, type?, subsystem?, tag? } - массивы значений
  base_filter       jsonb NOT NULL DEFAULT '{}'::jsonb,
  position          integer NOT NULL,
  created_at        timestamptz(3) NOT NULL DEFAULT now()
);
CREATE INDEX boards_project_idx ON boards (project_id, position);

CREATE TABLE board_columns (
  board_id   uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  status_id  uuid NOT NULL REFERENCES statuses(id) ON DELETE CASCADE,
  position   integer NOT NULL,
  PRIMARY KEY (board_id, status_id)
);

CREATE TABLE tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        text NOT NULL,
  created_at  timestamptz(3) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX tags_project_name_uq ON tags (project_id, lower(name));

CREATE TABLE tasks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number            integer NOT NULL,
  parent_id         uuid REFERENCES tasks(id),
  type              text NOT NULL CHECK (type IN ('task', 'bug', 'subtask')),
  title             text NOT NULL,
  description       text,
  status_id         uuid NOT NULL REFERENCES statuses(id),
  priority          text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  assignee_id       uuid REFERENCES users(id),
  reviewer_id       uuid REFERENCES users(id),
  subsystem_id      uuid REFERENCES subsystems(id),
  due_date          date,
  estimate_minutes  integer CHECK (estimate_minutes BETWEEN 1 AND 100000),
  reporter_id       uuid NOT NULL REFERENCES users(id),
  -- Порядок внутри статуса. COLLATE "C": base62 сравнивается побайтно, как в коде.
  rank              text COLLATE "C" NOT NULL,
  created_at        timestamptz(3) NOT NULL DEFAULT now(),
  updated_at        timestamptz(3) NOT NULL DEFAULT now(),
  closed_at         timestamptz(3),
  CONSTRAINT tasks_project_number_uq UNIQUE (project_id, number),
  CONSTRAINT tasks_status_rank_uq UNIQUE (status_id, rank) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT tasks_parent_only_subtask CHECK ((type = 'subtask') = (parent_id IS NOT NULL))
);
CREATE INDEX tasks_parent_idx ON tasks (parent_id);
CREATE INDEX tasks_project_updated_idx ON tasks (project_id, updated_at DESC);

CREATE TABLE task_tags (
  task_id  uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id   uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);
CREATE INDEX task_tags_tag_idx ON task_tags (tag_id);

-- «from блокирует to»
CREATE TABLE task_links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_task_id  uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  to_task_id    uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at    timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT task_links_pair_uq UNIQUE (from_task_id, to_task_id),
  CONSTRAINT task_links_not_self CHECK (from_task_id <> to_task_id)
);
CREATE INDEX task_links_to_idx ON task_links (to_task_id);

CREATE TABLE task_urls (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  url         text NOT NULL,
  title       text,
  created_at  timestamptz(3) NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX task_urls_task_idx ON task_urls (task_id, created_at);

CREATE TABLE comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES users(id),
  kind        text NOT NULL CHECK (kind IN ('comment', 'status_reason')),
  body        text NOT NULL,
  created_at  timestamptz(3) NOT NULL DEFAULT clock_timestamp(),
  edited_at   timestamptz(3)
);
CREATE INDEX comments_task_idx ON comments (task_id, created_at, id);

CREATE TABLE worklogs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id),
  date        date NOT NULL,
  minutes     integer NOT NULL CHECK (minutes BETWEEN 1 AND 1440),
  comment     text,
  created_at  timestamptz(3) NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX worklogs_task_idx ON worklogs (task_id);

CREATE TABLE history_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id    uuid NOT NULL REFERENCES users(id),
  kind        text NOT NULL,
  field       text,
  old_value   jsonb,
  new_value   jsonb,
  -- Все события одного запроса получают один момент (now() транзакции); seq задаёт порядок внутри него
  created_at  timestamptz(3) NOT NULL DEFAULT now(),
  seq         bigserial NOT NULL
);
CREATE INDEX history_task_idx ON history_events (task_id, created_at DESC, seq DESC);

import type { Db, Tx } from '../db/db.js';
import type { Priority, TaskType } from '../db/schema.js';
import { evenRanks } from '../tasks/rank.js';

/**
 * Задачи, связи, ссылки, комментарии и списания DEV_SEED (пакеты 2–4).
 * Даты считаются от момента сида: «закрыта 3 дня назад», «срок вчера» и т. п.
 */

type U = 'anna_owner' | 'boris_admin' | 'clara_member' | 'denis_member' | 'eva_viewer';

interface SeedTask {
  n: number;
  title: string;
  type?: TaskType;
  status: string;
  parent?: number;
  priority?: Priority;
  assignee?: U;
  reviewer?: U;
  reporter?: U;
  sub?: 'Frontend' | 'Backend';
  due?: number; // смещение от сегодня в днях
  estimate?: number;
  tags?: string[];
  closedDaysAgo?: number;
  createdDaysAgo: number;
  description?: string;
}

const DEMO: SeedTask[] = [
  { n: 1, title: 'Настроить CI для фронтенда', status: 'Done', sub: 'Frontend', assignee: 'denis_member', reporter: 'anna_owner', tags: ['release'], closedDaysAgo: 10, createdDaysAgo: 40, estimate: 240 },
  {
    n: 2,
    title: 'Экран входа и приглашения',
    status: 'In progress',
    sub: 'Frontend',
    assignee: 'clara_member',
    reviewer: 'boris_admin',
    reporter: 'anna_owner',
    priority: 'high',
    estimate: 480,
    tags: ['ux'],
    due: 5,
    createdDaysAgo: 38,
    description: '## Что сделать\n\n- форма входа по логину и паролю\n- экран принятия приглашения\n- обработка 401 и 429\n\nМакеты: `docs-short/wireframes/account/`',
  },
  { n: 3, title: 'Форма логина', type: 'subtask', parent: 2, status: 'Done', sub: 'Frontend', assignee: 'clara_member', reporter: 'clara_member', estimate: 120, closedDaysAgo: 3, createdDaysAgo: 37 },
  { n: 4, title: 'Обработка ошибок входа', type: 'subtask', parent: 2, status: 'In progress', sub: 'Frontend', assignee: 'clara_member', reporter: 'clara_member', estimate: 90, createdDaysAgo: 37 },
  { n: 5, title: 'Экран принятия приглашения', type: 'subtask', parent: 2, status: 'To do', sub: 'Frontend', reporter: 'clara_member', estimate: 120, createdDaysAgo: 36 },
  { n: 6, title: 'API задач', status: 'In review', sub: 'Backend', assignee: 'denis_member', reviewer: 'clara_member', reporter: 'boris_admin', estimate: 600, createdDaysAgo: 35 },
  { n: 7, title: 'Создание задачи', type: 'subtask', parent: 6, status: 'Done', sub: 'Backend', assignee: 'denis_member', reporter: 'denis_member', estimate: 180, closedDaysAgo: 1, createdDaysAgo: 34 },
  { n: 8, title: 'Поиск задач по ключу и названию', type: 'subtask', parent: 6, status: 'In test', sub: 'Backend', assignee: 'denis_member', reporter: 'denis_member', estimate: 120, createdDaysAgo: 34 },
  { n: 9, title: 'Доска: перетаскивание карточек', status: 'To do', sub: 'Frontend', assignee: 'clara_member', reporter: 'anna_owner', priority: 'high', due: -3, tags: ['ux'], estimate: 720, createdDaysAgo: 30 },
  { n: 10, title: 'Расчёт соседей при броске карточки', type: 'subtask', parent: 9, status: 'To do', sub: 'Frontend', assignee: 'clara_member', reporter: 'clara_member', createdDaysAgo: 29 },
  { n: 11, title: 'Диалог причины переноса', type: 'subtask', parent: 9, status: 'Reopened', sub: 'Frontend', assignee: 'clara_member', reporter: 'clara_member', createdDaysAgo: 29 },
  { n: 12, title: 'Карточка задачи', status: 'Plan', sub: 'Frontend', reporter: 'anna_owner', estimate: 900, tags: ['ux'], createdDaysAgo: 28 },
  { n: 13, title: 'Вкладка «Комментарии»', type: 'subtask', parent: 12, status: 'Plan', sub: 'Frontend', reporter: 'anna_owner', estimate: 240, createdDaysAgo: 28 },
  { n: 14, title: 'Вкладка «Время»', type: 'subtask', parent: 12, status: 'Backlog', sub: 'Frontend', reporter: 'anna_owner', estimate: 180, createdDaysAgo: 28 },
  { n: 15, title: 'История изменений', type: 'subtask', parent: 12, status: 'PBR', sub: 'Frontend', reporter: 'anna_owner', createdDaysAgo: 27 },
  { n: 16, title: 'Не сохраняется фильтр доски после перезагрузки', type: 'bug', status: 'Reopened', sub: 'Frontend', assignee: 'clara_member', reporter: 'boris_admin', priority: 'critical', due: -1, createdDaysAgo: 25 },
  { n: 17, title: '500 при пустом названии тега', type: 'bug', status: 'Done', sub: 'Backend', assignee: 'denis_member', reporter: 'clara_member', closedDaysAgo: 30, createdDaysAgo: 33 },
  { n: 18, title: 'Дубли номеров задач при параллельном создании', type: 'bug', status: 'For release', sub: 'Backend', assignee: 'denis_member', reporter: 'boris_admin', priority: 'high', tags: ['release'], createdDaysAgo: 22 },
  { n: 19, title: 'Неверный часовой пояс в истории', type: 'bug', status: 'Blocked', sub: 'Backend', assignee: 'denis_member', reporter: 'clara_member', createdDaysAgo: 20 },
  { n: 20, title: 'Съезжает вёрстка шапки на телефоне', type: 'bug', status: 'Cancelled', sub: 'Frontend', reporter: 'eva_viewer', priority: 'low', closedDaysAgo: 6, createdDaysAgo: 19 },
  { n: 21, title: 'Миграция на PostgreSQL 16', status: 'To do', sub: 'Backend', assignee: 'boris_admin', reporter: 'boris_admin', priority: 'high', estimate: 300, tags: ['tech-debt'], createdDaysAgo: 18 },
  { n: 22, title: 'Резервное копирование базы', status: 'In progress', sub: 'Backend', assignee: 'boris_admin', reporter: 'anna_owner', estimate: 240, createdDaysAgo: 17 },
  { n: 23, title: 'Настроить мониторинг', status: 'Backlog', sub: 'Backend', reporter: 'boris_admin', createdDaysAgo: 16 },
  { n: 24, title: 'Спроектировать схему уведомлений', status: 'PBR', sub: 'Backend', reporter: 'anna_owner', createdDaysAgo: 15 },
  { n: 25, title: 'Реализовать уведомления', status: 'Backlog', sub: 'Backend', reporter: 'anna_owner', createdDaysAgo: 15 },
  { n: 26, title: 'Документация по уведомлениям', status: 'Backlog', reporter: 'anna_owner', priority: 'low', createdDaysAgo: 14 },
  { n: 27, title: 'Обновить зависимости Angular', status: 'Backlog', sub: 'Frontend', reporter: 'clara_member', tags: ['tech-debt'], priority: 'low', createdDaysAgo: 12 },
  { n: 28, title: 'Рефакторинг сервиса сессий', status: 'Plan', sub: 'Backend', reporter: 'denis_member', tags: ['tech-debt'], estimate: 240, createdDaysAgo: 11 },
  { n: 29, title: 'Тёмная тема', status: 'PBR', sub: 'Frontend', reporter: 'eva_viewer', tags: ['ux'], priority: 'low', createdDaysAgo: 10 },
  { n: 30, title: 'Подготовить релиз 1.0', status: 'For release', assignee: 'anna_owner', reporter: 'anna_owner', tags: ['release'], due: 2, createdDaysAgo: 9 },
  { n: 31, title: 'Логи с X-Request-Id', status: 'In test', sub: 'Backend', assignee: 'boris_admin', reviewer: 'denis_member', reporter: 'boris_admin', estimate: 120, createdDaysAgo: 8 },
  { n: 32, title: 'Старый прототип доски', status: 'Cancelled', sub: 'Frontend', reporter: 'anna_owner', closedDaysAgo: 5, createdDaysAgo: 7 },
  { n: 33, title: 'Шапка приложения и переключатель проектов', status: 'Done', sub: 'Frontend', assignee: 'clara_member', reviewer: 'boris_admin', reporter: 'anna_owner', closedDaysAgo: 1, createdDaysAgo: 6, estimate: 300 },
  { n: 34, title: 'Пустая колонка: подсказка «Перетащите сюда»', status: 'In review', sub: 'Frontend', assignee: 'denis_member', reviewer: 'clara_member', reporter: 'clara_member', priority: 'low', createdDaysAgo: 4 },
];

/** Порядок на доске, отличный от порядка создания (номера задач сверху вниз) */
const ORDER: Record<string, number[]> = {
  Backlog: [26, 14, 23, 27, 25],
  PBR: [29, 15, 24],
  Plan: [28, 13, 12],
  'To do': [21, 9, 5, 10],
};

const REASONS: Record<number, string> = {
  19: 'Ждём ответа хостинга: на сервере не настроен часовой пояс базы',
  20: 'Дубль DEMO-16, исправим там',
  32: 'Прототип больше не нужен: делаем доску по новым макетам',
};

const LINKS: Array<[number, number]> = [
  [22, 21],
  [23, 21],
  [1, 21],
  [24, 25],
  [25, 26],
];

const URLS: Array<[number, string, string | null]> = [
  [2, 'https://github.com/RYAZHAPOVILNUR/nurtech-project/pull/12', 'MR: экран входа'],
  [2, 'https://www.figma.com/file/demo/account-screens', 'Макеты экранов входа'],
  [6, 'https://github.com/RYAZHAPOVILNUR/nurtech-project/pull/15', 'MR: API задач'],
  [18, 'https://github.com/RYAZHAPOVILNUR/nurtech-project/pull/21', null],
  [22, 'https://docs.example.com/backup-plan', 'План резервного копирования'],
  [30, 'https://docs.example.com/release-1-0', 'Чек-лист релиза'],
  [30, 'https://github.com/RYAZHAPOVILNUR/nurtech-project/milestone/1', 'Веха 1.0'],
  [31, 'https://github.com/RYAZHAPOVILNUR/nurtech-project/pull/24', 'MR: X-Request-Id'],
];

const WORKLOGS: Array<[number, U, number, number, string | null]> = [
  // задача, кто, дней назад, минут, комментарий
  [1, 'denis_member', 12, 180, 'Пайплайн сборки и линтер'],
  [1, 'denis_member', 11, 60, null],
  [3, 'clara_member', 5, 150, 'Вёрстка и валидация'],
  [4, 'clara_member', 2, 90, null],
  [4, 'boris_admin', 1, 30, 'Ревью'],
  [7, 'denis_member', 3, 200, 'Ручка и тесты'],
  [8, 'denis_member', 2, 120, null],
  [8, 'clara_member', 1, 45, 'Проверка поиска'],
  [22, 'boris_admin', 4, 240, 'Скрипт pg_dump и расписание'],
  [18, 'denis_member', 6, 90, 'Атомарный счётчик номеров'],
];

const COMMENT_AUTHORS: U[] = ['anna_owner', 'clara_member', 'boris_admin', 'denis_member', 'eva_viewer'];
const COMMENT_TEXTS = [
  'Начинаю, макеты посмотрела.',
  'Для ошибок 401 и 429 нужны разные тексты, см. `03-ui-rules.md`.',
  'Форма готова, осталось подключить API.',
  '@clara_member посмотри, пожалуйста, отступы на мобильном.',
  'Поправила, спасибо!',
  'Кнопка «Войти» блокируется на время запроса?',
  'Да, и повторно не отправляется.',
  'Тексты ошибок согласованы.',
  'Добавила экран «Ссылка недействительна».',
  'Нужен ли показ пароля по кнопке-глазу?',
  'Да, как в макете.',
  'Сделано.',
  'Проверил на Safari — всё ок.',
  'В Firefox поле логина не подхватывает автозаполнение.',
  'Исправлено атрибутом `autocomplete="username"`.',
  'Можно ревью.',
  'Пара замечаний в MR.',
  'Поправила замечания.',
  '**Важно:** логин приводим к нижнему регистру на фронте.',
  'Учла.',
  'Счётчик попыток показываем?',
  'Нет, только сообщение и время из `Retry-After`.',
  'Готово.',
  'Посмотрела, выглядит хорошо 👍',
  'Осталась подзадача про экран приглашения.',
  'Беру её после доски.',
  'Ок.',
];

export async function seedWork(db: Db, ctx: { demoId: string; simpleId: string; users: Record<string, string> }) {
  await db.transaction().execute(async (tx) => {
    await seedProject(tx, ctx.demoId, DEMO, ctx.users, true);
    await seedProject(
      tx,
      ctx.simpleId,
      [
        { n: 1, title: 'Купить домен', status: 'Done', assignee: 'boris_admin' as U, reporter: 'boris_admin' as U, closedDaysAgo: 2, createdDaysAgo: 10 },
        { n: 2, title: 'Настроить почту', status: 'In progress', assignee: 'clara_member' as U, reporter: 'boris_admin' as U, createdDaysAgo: 8 },
        { n: 3, title: 'Сверстать лендинг', status: 'In progress', assignee: 'clara_member' as U, reporter: 'boris_admin' as U, due: 3, createdDaysAgo: 7 },
        { n: 4, title: 'Подключить аналитику', status: 'To do', reporter: 'clara_member' as U, priority: 'low' as Priority, createdDaysAgo: 5 },
        { n: 5, title: 'Собрать отзывы клиентов', status: 'To do', type: 'bug' as TaskType, reporter: 'boris_admin' as U, createdDaysAgo: 3 },
      ],
      ctx.users,
      false,
    );
  });
}

async function seedProject(tx: Tx, projectId: string, tasks: SeedTask[], users: Record<string, string>, full: boolean) {
  const now = Date.now();
  const at = (daysAgo: number, minutes = 0) => new Date(now - daysAgo * 86_400_000 + minutes * 60_000);
  const day = (offset: number) => new Date(now + offset * 86_400_000).toISOString().slice(0, 10);
  const statuses = await tx.selectFrom('statuses').select(['id', 'name', 'category']).where('project_id', '=', projectId).orderBy('position').execute();
  const subs = await tx.selectFrom('subsystems').select(['id', 'name']).where('project_id', '=', projectId).execute();
  const tags = await tx.selectFrom('tags').select(['id', 'name']).where('project_id', '=', projectId).execute();
  const statusId = (name: string) => statuses.find((s) => s.name === name)!.id;
  const u = (name?: U) => (name ? users[name] : null);

  // Ранги: по статусам, в заданном порядке или в порядке создания
  const ranks = new Map<number, string>();
  for (const s of statuses) {
    const inStatus = tasks.filter((t) => t.status === s.name).map((t) => t.n);
    const order = ORDER[s.name] && full ? [...ORDER[s.name], ...inStatus.filter((n) => !ORDER[s.name].includes(n))] : inStatus;
    evenRanks(order.length).forEach((r, i) => ranks.set(order[i], r));
  }

  const ids = new Map<number, string>();
  for (const t of tasks) {
    const created = at(t.createdDaysAgo);
    const closed = t.closedDaysAgo !== undefined ? at(t.closedDaysAgo) : null;
    const row = await tx
      .insertInto('tasks')
      .values({
        project_id: projectId,
        number: t.n,
        parent_id: t.parent ? ids.get(t.parent)! : null,
        type: t.type ?? 'task',
        title: t.title,
        description: t.description ?? null,
        status_id: statusId(t.status),
        priority: t.priority ?? 'medium',
        assignee_id: u(t.assignee),
        reviewer_id: u(t.reviewer),
        subsystem_id: t.sub ? subs.find((s) => s.name === t.sub)!.id : null,
        due_date: t.due !== undefined ? day(t.due) : null,
        estimate_minutes: t.estimate ?? null,
        reporter_id: u(t.reporter ?? 'anna_owner')!,
        rank: ranks.get(t.n)!,
        created_at: created,
        updated_at: closed ?? at(Math.max(0, t.createdDaysAgo - 1)),
        closed_at: closed,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    ids.set(t.n, row.id);
    for (const name of t.tags ?? []) {
      await tx.insertInto('task_tags').values({ task_id: row.id, tag_id: tags.find((g) => g.name === name)!.id }).execute();
    }
    await history(tx, row.id, u(t.reporter ?? 'anna_owner')!, created, 'created', null, null, null);
    // Задача попала в текущий статус переносом из первого статуса workflow
    if (t.status !== statuses[0].name) {
      const s = statuses.find((x) => x.name === t.status)!;
      const first = statuses[0];
      await history(tx, row.id, u(t.assignee ?? t.reporter ?? 'anna_owner')!, closed ?? at(Math.max(0, t.createdDaysAgo - 1)), 'field_changed', 'status', { id: first.id, label: first.name }, { id: s.id, label: s.name });
    }
  }
  await tx.updateTable('projects').set({ task_seq: tasks.length }).where('id', '=', projectId).execute();
  if (!full) return;

  const name = async (id: string) => (await tx.selectFrom('users').select('name').where('id', '=', id).executeTakeFirstOrThrow()).name;
  // Изменения полей в истории
  await history(tx, ids.get(2)!, users.anna_owner, at(30), 'field_changed', 'priority', { id: null, label: 'medium' }, { id: null, label: 'high' });
  await history(tx, ids.get(16)!, users.boris_admin, at(20), 'field_changed', 'assignee', null, { id: users.clara_member, label: await name(users.clara_member) });
  await history(tx, ids.get(9)!, users.anna_owner, at(15), 'field_changed', 'dueDate', null, { id: null, label: day(-3) });
  await history(tx, ids.get(9)!, users.anna_owner, at(15), 'field_changed', 'estimateMinutes', { id: null, label: '480' }, { id: null, label: '720' });

  for (const [from, to] of LINKS) {
    await tx.insertInto('task_links').values({ project_id: projectId, from_task_id: ids.get(from)!, to_task_id: ids.get(to)!, created_at: at(10) }).execute();
    await history(tx, ids.get(from)!, users.boris_admin, at(10), 'link_added', 'blocks', null, { id: ids.get(to)!, label: `DEMO-${to}` });
    await history(tx, ids.get(to)!, users.boris_admin, at(10), 'link_added', 'blocked_by', null, { id: ids.get(from)!, label: `DEMO-${from}` });
  }
  let k = 0;
  for (const [n, url, title] of URLS) {
    const row = await tx.insertInto('task_urls').values({ task_id: ids.get(n)!, url, title, created_at: at(9, k++) }).returning('id').executeTakeFirstOrThrow();
    await history(tx, ids.get(n)!, users.anna_owner, at(9, k), 'url_added', null, null, { id: row.id, label: url });
  }

  // Комментарии: больше 25 у задачи с подзадачами, разные авторы, один изменён
  for (let i = 0; i < COMMENT_TEXTS.length; i++) {
    const created = at(30 - i, i);
    await tx
      .insertInto('comments')
      .values({
        task_id: ids.get(2)!,
        author_id: users[COMMENT_AUTHORS[i % COMMENT_AUTHORS.length]],
        kind: 'comment',
        body: COMMENT_TEXTS[i],
        created_at: created,
        edited_at: i === 2 ? new Date(created.getTime() + 3_600_000) : null,
      })
      .execute();
  }
  for (const [n, users2] of [
    [6, ['clara_member', 'denis_member']],
    [9, ['anna_owner', 'eva_viewer']],
  ] as const) {
    for (const [i, who] of users2.entries()) {
      await tx.insertInto('comments').values({ task_id: ids.get(n)!, author_id: users[who], kind: 'comment', body: i ? 'Принято, спасибо.' : 'Посмотрите, пожалуйста.', created_at: at(3, i) }).execute();
    }
  }
  for (const [n, reason] of Object.entries(REASONS)) {
    const t = tasks.find((x) => x.n === Number(n))!;
    await tx
      .insertInto('comments')
      .values({ task_id: ids.get(Number(n))!, author_id: u(t.assignee ?? t.reporter)!, kind: 'status_reason', body: reason, created_at: at(t.closedDaysAgo ?? 5) })
      .execute();
  }
  for (const [n, who, daysAgo, minutes, comment] of WORKLOGS) {
    await tx.insertInto('worklogs').values({ task_id: ids.get(n)!, user_id: users[who], date: day(-daysAgo), minutes, comment, created_at: at(daysAgo) }).execute();
  }
}

async function history(
  tx: Tx,
  taskId: string,
  actorId: string,
  createdAt: Date,
  kind: string,
  field: string | null,
  oldValue: { id: string | null; label: string } | null,
  newValue: { id: string | null; label: string } | null,
) {
  await tx
    .insertInto('history_events')
    .values({
      task_id: taskId,
      actor_id: actorId,
      kind,
      field,
      old_value: oldValue ? JSON.stringify(oldValue) : null,
      new_value: newValue ? JSON.stringify(newValue) : null,
      created_at: createdAt,
    })
    .execute();
}


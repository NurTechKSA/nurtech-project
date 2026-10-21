import { parseArgs } from 'node:util';
import { sql } from 'kysely';
import { addMember, AdminError, createBoard, createProject, createUser, findUser, issueInvitation } from './admin/admin.js';
import { loadConfig } from './config.js';
import type { Role } from './db/schema.js';
import { createDb, migrate } from './db/db.js';
import { devSeed } from './seed/dev-seed.js';

const HELP = `Служебные команды бэкенда (вне контракта):
  migrate                                         накатить миграции
  create-user --name "Имя"                        пользователь + ссылка-приглашение (печатается один раз)
  reissue --user <логин|id>                       новая ссылка: прежний пароль, ссылки и сессии перестают работать
  create-project --key KEY --name "Имя" --template dev|simple
  add-member --project KEY --user <логин|id> --role owner|admin|member|viewer
  create-board --project KEY --name "Имя" [--columns "To do,In progress,Done"]
               [--filter subsystem=Frontend] [--filter tag=ux,release] [--done-days 14]
  seed                                            тестовые данные DEV_SEED (нужен DEV_SEED_PASSWORD)
  reset-dev                                       удалить все данные и заново создать тестовые (не в продакшене)`;

const [command, ...rest] = process.argv.slice(2);
const { values } = parseArgs({
  args: rest,
  options: {
    name: { type: 'string' },
    user: { type: 'string' },
    key: { type: 'string' },
    template: { type: 'string' },
    project: { type: 'string' },
    role: { type: 'string' },
    columns: { type: 'string' },
    filter: { type: 'string', multiple: true },
    'done-days': { type: 'string' },
  },
});

const need = (v: string | undefined, flag: string): string => {
  if (!v) throw new AdminError(`Нужен параметр --${flag}`);
  return v;
};

const config = loadConfig();
const db = createDb(config.databaseUrl, 2);
try {
  await migrate(db);
  switch (command) {
    case 'migrate':
      console.log('Миграции применены');
      break;
    case 'create-user': {
      const r = await createUser(db, config, need(values.name, 'name'));
      console.log(`Пользователь ${r.user.name} (${r.user.id})\nСсылка-приглашение (действует ${config.invitationTtlDays} дн.):\n${r.link}`);
      break;
    }
    case 'reissue': {
      const u = await findUser(db, need(values.user, 'user'));
      const link = await db.transaction().execute((tx) => issueInvitation(tx, config, u.id));
      console.log(`Новая ссылка для ${u.name}${u.username ? ` (${u.username})` : ''}:\n${link}`);
      break;
    }
    case 'create-project': {
      const p = await createProject(db, {
        key: need(values.key, 'key'),
        name: need(values.name, 'name'),
        template: need(values.template, 'template') as 'dev' | 'simple',
      });
      console.log(`Проект ${p.key} «${p.name}» создан (${p.id})`);
      break;
    }
    case 'add-member': {
      const r = await addMember(db, { project: need(values.project, 'project'), user: need(values.user, 'user'), role: need(values.role, 'role') as Role });
      console.log(`${r.username} - ${r.role} в ${r.project}`);
      break;
    }
    case 'create-board': {
      const filter: Record<string, string[]> = {};
      for (const f of values.filter ?? []) {
        const [k, v] = f.split('=');
        if (!k || !v) throw new AdminError('Фильтр: --filter поле=значение1,значение2');
        filter[k.trim()] = v.split(',').map((x) => x.trim()).filter(Boolean);
      }
      const b = await createBoard(db, {
        project: need(values.project, 'project'),
        name: need(values.name, 'name'),
        columns: values.columns?.split(',').map((x) => x.trim()).filter(Boolean),
        filter,
        doneWindowDays: values['done-days'] ? Number(values['done-days']) : undefined,
      });
      console.log(`Доска «${b.name}» создана (${b.id})`);
      break;
    }
    case 'seed': {
      if (!config.devSeedPassword) throw new AdminError('Нужен DEV_SEED_PASSWORD');
      if (config.env === 'production') throw new AdminError('Тестовые данные в продакшене запрещены');
      const created = await devSeed(db, config, (l) => console.log(l));
      console.log(created ? 'Тестовые данные созданы' : 'Тестовые данные уже есть');
      break;
    }
    case 'reset-dev': {
      if (config.env === 'production') throw new AdminError('reset-dev запрещён в продакшене');
      if (!config.devSeedPassword) throw new AdminError('Нужен DEV_SEED_PASSWORD');
      await sql`TRUNCATE users, projects RESTART IDENTITY CASCADE`.execute(db);
      await devSeed(db, config, (l) => console.log(l));
      console.log('База очищена, тестовые данные созданы заново');
      break;
    }
    default:
      console.log(HELP);
      if (command && command !== 'help') process.exitCode = 1;
  }
} catch (err) {
  if (err instanceof AdminError) {
    console.error(`Ошибка: ${err.message}`);
    process.exitCode = 1;
  } else throw err;
} finally {
  await db.destroy();
}

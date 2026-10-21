import { hashPassword } from '../auth/passwords.js';
import { addMember, createBoard, createProject, createUser } from '../admin/admin.js';
import type { Config } from '../config.js';
import type { Db } from '../db/db.js';
import { seedWork } from './seed-work.js';

export const SEED_USERS = [
  { username: 'anna_owner', name: 'Анна Орлова' },
  { username: 'boris_admin', name: 'Борис Адамов' },
  { username: 'clara_member', name: 'Клара Миронова' },
  { username: 'denis_member', name: 'Денис Морозов' },
  { username: 'eva_viewer', name: 'Ева Викторова' },
  { username: 'hanna_free', name: 'Ханна Фролова' },
] as const;

/**
 * Тестовые данные DEV_SEED (разделы «Тестовые данные» пакетов 1–4). Повторный старт
 * дублей не создаёт: если пользователь anna_owner уже есть, сид пропускается.
 */
export async function devSeed(db: Db, config: Config, log: (line: string) => void): Promise<boolean> {
  const exists = await db.selectFrom('users').select('id').where('username', '=', 'anna_owner').executeTakeFirst();
  if (exists) return false;
  const passwordHash = await hashPassword(config.devSeedPassword!);

  const ids: Record<string, string> = {};
  for (const u of SEED_USERS) {
    const row = await db.insertInto('users').values({ name: u.name, username: u.username, password_hash: passwordHash }).returning('id').executeTakeFirstOrThrow();
    ids[u.username] = row.id;
  }
  const gleb = await createUser(db, config, 'Глеб Игнатьев');
  log(JSON.stringify({ level: 'info', msg: 'DEV_SEED: ссылка-приглашение gleb_invited (вид new)', link: gleb.link }));

  const demo = await createProject(db, { key: 'DEMO', name: 'Demo', template: 'dev' });
  for (const [user, role] of [
    ['anna_owner', 'owner'],
    ['boris_admin', 'admin'],
    ['clara_member', 'member'],
    ['denis_member', 'member'],
    ['eva_viewer', 'viewer'],
  ] as const) {
    await addMember(db, { project: 'DEMO', user, role });
  }
  for (const name of ['release', 'tech-debt', 'ux']) await db.insertInto('tags').values({ project_id: demo.id, name }).execute();
  await createBoard(db, { project: 'DEMO', name: 'Frontend', filter: { subsystem: ['Frontend'] } });

  const simple = await createProject(db, { key: 'SIMPLE', name: 'Simple', template: 'simple' });
  await addMember(db, { project: 'SIMPLE', user: 'boris_admin', role: 'owner' });
  await addMember(db, { project: 'SIMPLE', user: 'clara_member', role: 'member' });

  await seedWork(db, { demoId: demo.id, simpleId: simple.id, users: ids });
  log(JSON.stringify({ level: 'info', msg: 'DEV_SEED: тестовые данные созданы' }));
  return true;
}

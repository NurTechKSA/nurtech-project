# Бэкенд MVP таск-менеджера

Реализация контракта [`docs-short/backend/openapi/openapi.yaml`](../docs-short/backend/openapi/openapi.yaml) (0.1.0) и пакетов ТЗ 1–4 из [`docs-short/backend/`](../docs-short/backend/). Все 35 ручек.

Стек: Node.js 24, NestJS 12, PostgreSQL 16 (локально подходит ≥ 14), Kysely. Тела и query-параметры запросов проверяются по самому `openapi.yaml`, поэтому контракт и проверки не расходятся.

## Запуск локально
```bash
cd backend
npm ci
createdb nurtech_tasks
cp .env.example .env            # задайте DEV_SEED_PASSWORD
set -a; . ./.env; set +a
npm run dev                     # http://localhost:3000/api, Swagger - http://localhost:3000/api/docs
```
Миграции накатываются при старте. При `DEV_SEED=true` и пустой базе создаются тестовые данные. Ссылка-приглашение `gleb_invited` печатается в журнал.

Фронт (`ng serve`, http://localhost:4200) работает с API через proxy dev-сервера. Тогда для браузера всё на одном origin, и cookie `sid` работает. `http://localhost:4200` разрешён в `ALLOWED_ORIGINS` и локально, и на стенде. `proxy.conf.json` на стенд:
```json
{ "/api": { "target": "https://tasks.nurtech.dev", "secure": true, "changeOrigin": true } }
```
Для локального бэкенда вместо стенда - `"target": "http://localhost:3000"`.

## Служебные команды
Администрирования в интерфейсе нет: пользователей, проекты и участников заводят консольные команды.
```bash
npm run cli -- create-user --name "Имя Фамилия"          # печатает ссылку-приглашение (один раз)
npm run cli -- reissue --user <логин|id>                 # забыл пароль: новая ссылка, старый пароль и сессии не работают
npm run cli -- create-project --key WEB --name "Сайт" --template dev
npm run cli -- add-member --project WEB --user <логин> --role owner|admin|member|viewer
npm run cli -- create-board --project WEB --name "Frontend" --filter subsystem=Frontend
npm run cli -- seed                                      # тестовые данные, если их нет
npm run cli -- reset-dev                                 # очистить базу и создать тестовые данные заново (не в продакшене)
```
На стенде те же команды запускаются в контейнере: `docker exec -it tasks-api node dist/cli.js <команда> ...`

## Тестовые данные (`DEV_SEED=true`)
Пароль у всех - `DEV_SEED_PASSWORD`.

| Логин | DEMO | SIMPLE |
|---|---|---|
| `anna_owner` | owner | — |
| `boris_admin` | admin | owner |
| `clara_member` | member | member |
| `denis_member` | member | — |
| `eva_viewer` | viewer | — |
| `hanna_free` | — | — |
| `gleb_invited` | приглашение вида new, ссылка в журнале | |

В DEMO 34 задачи: все статусы шаблона, баги, подзадачи, связи (DEMO-21 заблокирована, цепочка DEMO-24 → 25 → 26), ссылки, просроченные задачи, окно Done (закрыты 1, 3, 10 и 30 дней назад), 27 комментариев у DEMO-2, причины у Blocked и Cancelled, списания времени. Дополнительная доска «Frontend» с фильтром по направлению. Даты считаются от момента сида, `reset-dev` обновляет их.

## Тесты
```bash
createdb nurtech_tasks_test
npm test
```
Тесты повторяют «Критерии приёмки» пакетов через HTTP, включая сценарии «20 одновременных запросов». Каждый ответ в тестах сверяется со схемой контракта: статус должен быть объявлен у операции, тело должно совпадать со схемой.

| Файл | Что проверяет |
|---|---|
| `test/p1-auth-projects.test.ts` | 00 (сквозные правила) и пакет 1, пп. 1–11 |
| `test/p2-tasks.test.ts` | пакет 2, пп. 1–16 |
| `test/p3-board.test.ts` | пакет 3, пп. 1–12 |
| `test/p4-comments-worklogs.test.ts` | пакет 4, пп. 1–7 |
| `test/errors.test.ts` | формат 5xx |

## Стенд
Фронт и API на одном домене за nginx-proxy сервера (SSL выпускает acme-companion): `https://<домен>/` отдаёт сборку фронта (index.html на все адреса), `https://<домен>/api` идёт в бэкенд. Файлы в [`deploy/`](deploy/).

- Первичная настройка (один раз): `ssh root@<сервер> 'bash -s' < backend/deploy/setup.sh tasks.nurtech.dev`. Создаёт `/opt/tasks-stand`, `.env` со случайными паролями и cron автовыкладки.
- Автовыкладка: раз в минуту `autodeploy.sh` проверяет две ветки (`/opt/tasks-stand/branches.env`):
  - новый коммит в `API_BRANCH` пересобирает бэкенд;
  - новый коммит в `WEB_BRANCH` (по умолчанию `main`) собирает фронт (`ng build`) и атомарно подменяет статику.
  - Журнал: `/opt/tasks-stand/autodeploy.log`.
- На стенде `APP_ENV=staging`: тестовые данные разрешены (при `APP_ENV=production` с `DEV_SEED=true` приложение не стартует), cookie с `Secure`, Swagger на `/api/docs`.

## Конфигурация
| Переменная | По умолчанию | Что |
|---|---|---|
| `APP_ENV` | `development` | `development` / `test` / `staging` / `production` |
| `PORT` | 3000 | |
| `DATABASE_URL` | `postgres://localhost:5432/nurtech_tasks` | |
| `APP_BASE_URL` | `http://localhost:4200` | для ссылок-приглашений `APP_BASE_URL/invite/<token>`; `https://` включает `Secure` у cookie |
| `ALLOWED_ORIGINS` | `http://localhost:4200` | через запятую; CORS и проверка `Origin`/`Referer` у не-GET |
| `SESSION_TTL_DAYS` | 7 | продление при активности, абсолютный предел 30 дней |
| `INVITATION_TTL_DAYS` | 7 | |
| `DEV_SEED`, `DEV_SEED_PASSWORD` | выкл. | тестовые данные |
| `OPENAPI_PATH` | `../docs-short/backend/openapi/openapi.yaml` | контракт, по которому проверяются запросы |

## Решения там, где ТЗ и контракт расходятся
Контракт не менялся. Ниже места, где документы допускают два прочтения, и что выбрано. Их стоит подтвердить у ментора.

1. **Комментарий длиной 2000 символов плюс отступы по краям.** ТЗ 04: длина считается по обрезанному тексту, хранится исходный. Но у `Comment.body` в ответе `maxLength: 2000`, и такой исходный текст нарушил бы контракт уже в ответе. Решение: исходный текст хранится, если сам укладывается в 2000 символов, иначе хранится обрезанный. То же для причины переноса.
2. **Ссылка: пустая или длиннее 2000.** Общее правило 00 (раздел 3) даёт `required` и `too_long`, ТЗ 02 (раздел 7 и п. 14 приёмки) даёт `invalid`. Выбрано `invalid`, как в критериях приёмки.
3. **Повтор значения в `types` поиска.** В контракте `uniqueItems` (то есть 422 `duplicate`), а 00 (раздел 5) говорит, что повтор в query-списке не ошибка и дубли отбрасываются. Выбрано правило 00: дубли отбрасываются.
4. **Поле вне схемы запроса.** 00 (раздел 3) требует `invalid` для любого лишнего поля, хотя `additionalProperties: false` в контракте стоит только у `UpdateTaskRequest`. Выбрано правило 00: лишнее поле даёт 422 `invalid` во всех ручках, кроме входа (там любая ошибка даёт 401).
5. **Вход с неполным телом.** У `login` в контракте нет ответа 422, поэтому нет логина или пароля, не строки, слишком длинные значения дают 401 `invalid_credentials`. Не JSON даёт 400.

## Учебный стенд (24 октября 2026)

Адрес: https://tasks.45.77.66.108.sslip.io — временный домен до настройки `tasks.nurtech.dev`.
Swagger: https://tasks.45.77.66.108.sslip.io/api/docs/.
На сервере: `/opt/tasks-stand`; API из `feat/backend-mvp`, фронт из `main`.
Автовыкладка проверяет ветки каждую минуту. Пароли находятся только в серверном `.env`.
Фронт публикуется в текущем состоянии репозитория: вход и каркас приложения; экраны задач добавляют ученики.
При этой выкладке тесты не запускались по указанию владельца.

# TaskManager

Управление задачами на Angular 21, Taiga UI 5 и `@ngrx/signals`.

Требования и макеты — в ветке `docs/mvp`, папка [`docs-short/`](https://github.com/RYAZHAPOVILNUR/nurtech-project/blob/docs/mvp/docs-short/README.md). Начните с [границ MVP](https://github.com/RYAZHAPOVILNUR/nurtech-project/blob/docs/mvp/docs-short/01-scope.md) и [правил интерфейса](https://github.com/RYAZHAPOVILNUR/nurtech-project/blob/docs/mvp/docs-short/03-ui-rules.md); роли и ключи прав — в [модели данных](https://github.com/RYAZHAPOVILNUR/nurtech-project/blob/docs/mvp/docs-short/08-data-model-and-permissions.md#4-роли-и-ключи-разрешений).

Контракт API — [`openapi.yaml`](https://github.com/RYAZHAPOVILNUR/nurtech-project/blob/feat/backend-mvp/docs-short/backend/openapi/openapi.yaml) в ветке бэкенда, его же показывает [Swagger](https://tasks.45.77.66.108.sslip.io/api/docs/). Где бэкенд выбрал одно из двух прочтений ТЗ — [решения бэкенда](https://github.com/RYAZHAPOVILNUR/nurtech-project/blob/feat/backend-mvp/backend/README.md#решения-там-где-тз-и-контракт-расходятся). Нашли расхождение с контрактом — сообщите.

## Запуск

Нужны Node.js `^20.19 || ^22.12 || >=24` и npm `>=11`.

```bash
npm ci
npm start
```

Приложение откроется на `http://localhost:4200`. Запросы на `/api` dev-сервер проксирует на стенд — адрес задан в `proxy.conf.json`.

Сессия хранится в httpOnly-cookie, поэтому фронт и `/api` всегда открываются с одного адреса: в разработке это делает прокси, на проде — веб-сервер.

| Команда                                   | Что делает                                                        |
| ----------------------------------------- | ----------------------------------------------------------------- |
| `npm start`                               | dev-сервер с прокси                                               |
| `npm run build`                           | продакшен-сборка                                                  |
| `npm run lint` / `lint:fix`               | ESLint для `.ts` и шаблонов                                       |
| `npm run lint:styles` / `lint:styles:fix` | stylelint для `.scss`, порядок свойств исправляется автоматически |
| `npm run format` / `format:check`         | Prettier                                                          |
| `npm run check`                           | все проверки CI, кроме сборки                                     |

CI на каждый PR запускает ESLint, stylelint, Prettier и сборку. PR с красным CI на ревью не берётся.

Перед `git push` хук husky запускает `npm run check` и не даёт запушить код с ошибками. Хук ставится сам при `npm ci`.

## Стенд

[tasks.45.77.66.108.sslip.io](https://tasks.45.77.66.108.sslip.io) — временный адрес до переезда на `tasks.nurtech.dev`. Раз в минуту стенд забирает свежий `main`, собирает фронт и выкладывает его.

Аккаунты и проекты заводит ментор — в интерфейсе их не создать. Тестовые логины и роли — в [README бэкенда](https://github.com/RYAZHAPOVILNUR/nurtech-project/blob/feat/backend-mvp/backend/README.md#тестовые-данные-dev_seedtrue), пароль — у ментора.

## Отладка

Состояние сторов и их экшены видны в расширении браузера [Redux DevTools](https://github.com/reduxjs/redux-devtools).

## Архитектура

```
core/       то, без чего приложение не стартует: аутентификация, layout, права, текущий пользователь
shared/     переиспользуемый код без доменной логики
<домен>/    экраны и логика одной предметной области: board/, task/, profile/ …
```

- Внутри домена файлы раскладываются по типу сущности. Как именно — видно по `core`.
- `shared` ни от чего не зависит, `core` — только от `shared`, домены — от `core` и `shared`. Страницы и компоненты чужого домена не импортируем.
- Состояние живёт в сторах: общее для приложения — в глобальных, состояние экрана — в сторе страницы. В сторе только состояние и работа с ним; навигация, диалоги и прочий UI остаются в компонентах или сервисах.
- Сетевые ошибки (401, 409, 5xx, нет сети) обрабатывают перехватчики. Страница отвечает только за ошибки, которые касаются её самой: 404, ошибки полей формы.

## Ветки и PR

- Ветка от `dev`: `feat/board-columns`, `fix/card-dialog-close`. PR — в `dev`; в `main` ментор вливает готовые релизы, они и попадают на стенд.
- Одна задача — один PR, задача не больше 6 часов. Чем меньше строк, тем быстрее ревью.
- Коммит — одна строка: `feat: Добавлен переключатель досок`, `fix: Исправлено закрытие карточки`.
- В описании PR — ссылка на задачу и скриншот/видео результата.
- Сначала перекрестное ревью (cross-review), потом финальное.

---
project: nurtech-project
public: false
backfilled: true
type: internal
audience: team
title: Права пользователя и проверка перед отправкой кода
summary: Добавлены инструменты проверки прав пользователя и защитный хук перед отправкой кода.
user_impact:
  - Меньше шансов отправить в репозиторий неработающий код.
screenshots: []
checks: []
deploy_url: https://tasks.nurtech.dev
commits: df61251..c0250b9
---

Notes for editor:
- What changed: Инструменты работы с правами, husky с pre-push хуком.
- Where to verify: Репозиторий nurtech-project.
- Risks: восстановлено по git log задним числом.

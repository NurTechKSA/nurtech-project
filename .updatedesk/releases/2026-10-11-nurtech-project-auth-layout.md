---
project: nurtech-project
public: true
backfilled: true
type: feature
audience: users
title: Вход в таск-менеджер и основной каркас интерфейса
summary: Появились страница входа, основной макет с меню пользователя и защита страниц: после входа человек возвращается туда, куда шёл.
user_impact:
  - Можно войти в приложение.
  - После входа открывается нужная страница.
  - При истёкшей сессии приложение само возвращает на вход.
  - Ошибки сервера показываются понятными уведомлениями.
screenshots: []
checks: []
deploy_url: https://tasks.nurtech.dev
commits: 8bd9015..50d63ff
---

Notes for editor:
- What changed: Страница аутентификации, layout и меню пользователя, authGuard с возвратом на исходный адрес, перехват 401 и общий перехватчик ошибок API.
- Where to verify: tasks.nurtech.dev, страница входа.
- Risks: восстановлено по git log задним числом.

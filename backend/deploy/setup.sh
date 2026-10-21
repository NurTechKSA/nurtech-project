#!/usr/bin/env bash
# Первичная настройка стенда на сервере (один раз):
#   ssh root@<сервер> 'bash -s' < backend/deploy/setup.sh tasks.nurtech.dev
# Создаёт /opt/tasks-stand, .env со случайными паролями, заглушку фронта и cron автовыкладки.
set -euo pipefail
DOMAIN=${1:?Укажите домен стенда, например tasks.nurtech.dev}
ROOT=/opt/tasks-stand
mkdir -p "$ROOT/www/releases/placeholder"
cd "$ROOT"
if [ ! -f .env ]; then
  umask 077
  cat > .env <<ENV
DOMAIN=$DOMAIN
DB_PASSWORD=$(openssl rand -hex 24)
DEV_SEED=true
DEV_SEED_PASSWORD=demo$(openssl rand -hex 4)
ENV
  echo "Создан $ROOT/.env"
fi
cat > www/releases/placeholder/index.html <<'HTML'
<!doctype html><html lang="ru"><meta charset="utf-8"><title>Таск-менеджер</title>
<body style="font-family:system-ui;padding:40px">Сборка фронта ещё не выложена. API: <a href="/api/docs">/api/docs</a></body></html>
HTML
[ -e www/current ] || ln -s releases/placeholder www/current
[ -f branches.env ] || printf 'API_BRANCH=feat/backend-mvp\nWEB_BRANCH=main\n' > branches.env
git clone -q --branch "$(. ./branches.env; echo "$API_BRANCH")" https://github.com/RYAZHAPOVILNUR/nurtech-project.git repo-api 2>/dev/null || true
cp repo-api/backend/deploy/autodeploy.sh "$ROOT/autodeploy.sh"
chmod +x "$ROOT/autodeploy.sh"
echo '* * * * * root /opt/tasks-stand/autodeploy.sh' > /etc/cron.d/tasks-stand
echo "Готово. Первая выкладка - в течение минуты; журнал: $ROOT/autodeploy.log"

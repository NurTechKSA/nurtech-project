#!/usr/bin/env bash
# Автовыкладка стенда (cron раз в минуту на сервере):
#  - новый коммит в API_BRANCH -> пересобрать и перезапустить бэкенд (миграции накатываются при старте);
#  - новый коммит в WEB_BRANCH -> собрать фронт (ng build) и атомарно подменить статику.
# Журнал: $ROOT/autodeploy.log. Выложенные коммиты: $ROOT/.deployed-api, $ROOT/.deployed-web.
set -euo pipefail
ROOT=${ROOT:-/opt/tasks-stand}
REPO=${REPO:-https://github.com/RYAZHAPOVILNUR/nurtech-project.git}
[ -f "$ROOT/branches.env" ] && . "$ROOT/branches.env"
API_BRANCH=${API_BRANCH:-feat/backend-mvp}
WEB_BRANCH=${WEB_BRANCH:-main}

exec 9>"$ROOT/.autodeploy.lock"
flock -n 9 || exit 0
log() { echo "$(date -Is) $*" >> "$ROOT/autodeploy.log"; }

# Обновляет checkout ветки; печатает SHA, если он отличается от выложенного
fresh_sha() {
  local dir=$1 branch=$2 mark=$3
  [ -d "$dir/.git" ] || git clone -q --branch "$branch" "$REPO" "$dir"
  git -C "$dir" fetch -q origin "$branch"
  local sha
  sha=$(git -C "$dir" rev-parse "origin/$branch")
  if [ "$sha" != "$(cat "$mark" 2>/dev/null || true)" ]; then
    git -C "$dir" checkout -q -f "$sha"
    echo "$sha"
  fi
}

cd "$ROOT"
if sha=$(fresh_sha "$ROOT/repo-api" "$API_BRANCH" "$ROOT/.deployed-api") && [ -n "$sha" ]; then
  log "api: $API_BRANCH @ $sha"
  cp repo-api/backend/deploy/docker-compose.yml repo-api/backend/deploy/nginx.conf repo-api/backend/deploy/autodeploy.sh "$ROOT/"
  if docker compose -p tasks up -d --build >> "$ROOT/autodeploy.log" 2>&1; then
    docker compose -p tasks exec -T web nginx -s reload >> "$ROOT/autodeploy.log" 2>&1 || true
    echo "$sha" > "$ROOT/.deployed-api"
    log "api: ok"
  else
    log "api: FAILED"
  fi
fi

if sha=$(fresh_sha "$ROOT/repo-web" "$WEB_BRANCH" "$ROOT/.deployed-web") && [ -n "$sha" ]; then
  log "web: $WEB_BRANCH @ $sha"
  if docker run --rm -v "$ROOT/repo-web:/app" -w /app node:24-alpine \
       sh -c 'npm ci --ignore-scripts --no-audit --no-fund && npx ng build --configuration production' >> "$ROOT/autodeploy.log" 2>&1; then
    mkdir -p "$ROOT/www/releases"
    rm -rf "$ROOT/www/releases/$sha"
    cp -r "$ROOT/repo-web/dist/nurtech-project/browser" "$ROOT/www/releases/$sha"
    ln -sfn "releases/$sha" "$ROOT/www/current.tmp" && mv -Tf "$ROOT/www/current.tmp" "$ROOT/www/current"
    # Храним три последние сборки
    ls -1t "$ROOT/www/releases" | grep -v '^placeholder$' | tail -n +4 | while read -r old; do rm -rf "$ROOT/www/releases/$old"; done
    echo "$sha" > "$ROOT/.deployed-web"
    log "web: ok"
  else
    echo "$sha" > "$ROOT/.deployed-web"
    log "web: FAILED (сборка фронта упала; следующая попытка - на новом коммите)"
  fi
fi

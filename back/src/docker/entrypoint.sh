#!/bin/bash

set -euo pipefail
IFS=$'\n\t'

######################## 0. 基础变量 ########################
EXTRA_BIN_DIR="${HOME}/.scc/bin"
ENV_FILE="/etc/profile.d/env.sh"
LINE="export PATH=\"\$PATH:${EXTRA_BIN_DIR}\""

######################## 1. 持久写入 env.sh #################
if ! grep -qxF "${LINE}" "${ENV_FILE}" 2>/dev/null; then
  install -Dm644 /dev/null "${ENV_FILE}"
  umask 022
  printf '%s\n' "${LINE}" >> "${ENV_FILE}"
fi

######################## 2. 立刻生效 ########################
# 避免重复追加
case ":$PATH:" in
  *":${EXTRA_BIN_DIR}:"*) ;;                     # 已有
  *) export PATH="${PATH}:${EXTRA_BIN_DIR}";;    # 追加
esac

######################## 3. 尝试直接执行 $@ #################
# 允许用户在 docker run 后面直接覆写命令
if [[ $# -gt 0 && "${1}" != "--" ]]; then
  exec "$@"
fi

######################## 4. 根据 MODE 启动 ###################
MODE=${MODE:-api}
MIGRATION_ENABLED=${MIGRATION_ENABLED:-false}
DEBUG=${DEBUG:-false}
CELERY_AUTO_SCALE=${CELERY_AUTO_SCALE:-false}

case "${MODE}" in
  ###########################################################
  api)

    flask init-db

    if [[ "${MIGRATION_ENABLED}" == "true" ]]; then
      echo "▶ Running DB migrations …"
      flask upgrade-db
      echo "✔ Migrations done."
    fi
    
    flask init-all

    echo "▶ Initializing static files …"
    python3 scripts/init_static_files.py
    echo "✔ Static files OK."

    if [[ "${DEBUG}" == "true" ]]; then
      exec flask run \
        --host="${BIND_ADDRESS:-0.0.0.0}" \
        --port="${BIND_PORT:-8087}" \
        --debug
    else
      exec gunicorn \
        --bind "${BIND_ADDRESS:-0.0.0.0}:${BIND_PORT:-8087}" \
        --workers "${SERVER_WORKER_AMOUNT:-1}" \
        --worker-class gthread \
        --threads 10 \
        --timeout "${GUNICORN_TIMEOUT:-200}" \
        --preload \
        app:app
    fi
    ;;

  ###########################################################
  worker)
    if [[ "${CELERY_AUTO_SCALE}" == "true" ]]; then
      CORES=$(nproc)
      MAX=${CELERY_MAX_WORKERS:-$CORES}
      MIN=${CELERY_MIN_WORKERS:-1}
      C_ARGS="--autoscale=${MAX},${MIN}"
    else
      C_ARGS="-c ${CELERY_WORKER_AMOUNT:-1}"
    fi
    exec celery -A app.celery worker \
      --loglevel INFO \
      --logfile "${LOG_FILE:-/app/logs/server.log}" \
      -Q dataset,mail,lazyllm,celery \
      ${C_ARGS}
    ;;

  ###########################################################
  beat)
    exec celery -A app.celery beat --loglevel INFO
    ;;

  ###########################################################
  *)
    echo "❌ Unknown MODE: ${MODE}" >&2
    exit 1
    ;;
esac

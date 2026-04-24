#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.backend.yml"
BACKEND_ENV_FILE="$ROOT_DIR/apps/backend/.env"
COMMAND="${1:-start}"
RUN_MODE="${2:-dev}"

case "$RUN_MODE" in
  dev)
    DEFAULT_SESSION_NAME="ihc-backend"
    DEFAULT_SOCKET_NAME="ihc-backend"
    BACKEND_RUN_COMMAND="npm run dev:backend"
    ;;
  stable)
    DEFAULT_SESSION_NAME="ihc-backend-stable"
    DEFAULT_SOCKET_NAME="ihc-backend-stable"
    BACKEND_RUN_COMMAND="npm run serve:backend"
    ;;
  *)
    echo "Unsupported run mode: $RUN_MODE" >&2
    echo "Supported modes: dev, stable" >&2
    exit 1
    ;;
esac

SESSION_NAME="${IHC_BACKEND_TMUX_SESSION:-$DEFAULT_SESSION_NAME}"
TMUX_SOCKET_NAME="${IHC_BACKEND_TMUX_SOCKET:-$DEFAULT_SOCKET_NAME}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [start|attach|status|stop|restart] [dev|stable]

Commands:
  start    Create the tmux session and boot the backend workflow.
  attach   Attach to the existing tmux session.
  status   Print tmux window status for the backend session.
  stop     Kill the tmux session only.
  restart  Recreate the tmux session.

Modes:
  dev      Run the hot-reload backend workflow via npm run dev:backend.
  stable   Run the compiled stable backend workflow via npm run serve:backend.

Environment:
  IHC_BACKEND_TMUX_SESSION   Override the tmux session name (default: $SESSION_NAME)
  IHC_BACKEND_TMUX_SOCKET    Override the tmux socket name (default: $TMUX_SOCKET_NAME)
EOF
}

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "Missing required command: $name" >&2
    exit 1
  fi
}

session_exists() {
  tmux -L "$TMUX_SOCKET_NAME" has-session -t "$SESSION_NAME" 2>/dev/null
}

start_session() {
  require_command tmux
  require_command docker
  require_command npm

  if ! docker compose version >/dev/null 2>&1; then
    echo "Docker Compose is not available via 'docker compose'." >&2
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "Docker daemon is not reachable for the current user." >&2
    echo "Ensure Docker is running and the current user can access /var/run/docker.sock." >&2
    exit 1
  fi

  if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo "Compose file not found: $COMPOSE_FILE" >&2
    exit 1
  fi

  if [[ ! -f "$BACKEND_ENV_FILE" ]]; then
    echo "Missing backend env file: $BACKEND_ENV_FILE" >&2
    echo "Create it first with: cp apps/backend/.env.example apps/backend/.env" >&2
    exit 1
  fi

  if session_exists; then
    echo "tmux session '$SESSION_NAME' is already running in $RUN_MODE mode."
    if [[ "$RUN_MODE" == "stable" ]]; then
      echo "Attach with: npm run serve:backend:tmux:attach"
    else
      echo "Attach with: npm run dev:backend:tmux:attach"
    fi
    echo "Manual attach: tmux -L $TMUX_SOCKET_NAME attach -t $SESSION_NAME"
    return 0
  fi

  tmux -L "$TMUX_SOCKET_NAME" new-session -d -s "$SESSION_NAME" -n backend -c "$ROOT_DIR"
  tmux -L "$TMUX_SOCKET_NAME" send-keys -t "$SESSION_NAME:backend" \
    "docker compose -f '$COMPOSE_FILE' up -d && $BACKEND_RUN_COMMAND" C-m

  tmux -L "$TMUX_SOCKET_NAME" new-window -t "$SESSION_NAME" -n infra -c "$ROOT_DIR"
  tmux -L "$TMUX_SOCKET_NAME" send-keys -t "$SESSION_NAME:infra" \
    "docker compose -f '$COMPOSE_FILE' ps" C-m

  tmux -L "$TMUX_SOCKET_NAME" select-window -t "$SESSION_NAME:backend"

  echo "Started tmux session '$SESSION_NAME' in $RUN_MODE mode."
  if [[ "$RUN_MODE" == "stable" ]]; then
    echo "Attach with: npm run serve:backend:tmux:attach"
  else
    echo "Attach with: npm run dev:backend:tmux:attach"
  fi
  echo "Manual attach: tmux -L $TMUX_SOCKET_NAME attach -t $SESSION_NAME"
  echo "Detach with: Ctrl+b then d"
}

attach_session() {
  require_command tmux

  if ! session_exists; then
    echo "tmux session '$SESSION_NAME' is not running." >&2
    echo "Start it with: $(basename "$0") start" >&2
    exit 1
  fi

  exec tmux -L "$TMUX_SOCKET_NAME" attach -t "$SESSION_NAME"
}

status_session() {
  require_command tmux

  if ! session_exists; then
    echo "tmux session '$SESSION_NAME' is not running."
    return 0
  fi

  echo "tmux session '$SESSION_NAME' is running."
  tmux -L "$TMUX_SOCKET_NAME" list-windows -t "$SESSION_NAME" \
    -F '#{window_index}:#{window_name} active=#{window_active} panes=#{window_panes}'
}

stop_session() {
  require_command tmux

  if ! session_exists; then
    echo "tmux session '$SESSION_NAME' is not running."
    return 0
  fi

  tmux -L "$TMUX_SOCKET_NAME" kill-session -t "$SESSION_NAME"
  echo "Stopped tmux session '$SESSION_NAME'."
}

case "$COMMAND" in
  start)
    start_session
    ;;
  attach)
    attach_session
    ;;
  status)
    status_session
    ;;
  stop)
    stop_session
    ;;
  restart)
    stop_session
    start_session
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    echo "Unsupported command: $COMMAND" >&2
    usage >&2
    exit 1
    ;;
esac

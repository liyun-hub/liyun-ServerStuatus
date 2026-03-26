#!/bin/sh
set -eu

BASE_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BIN_DIR="$BASE_DIR/bin"
CONF_DIR="$BASE_DIR/conf"
LOG_DIR="$BASE_DIR/logs"
RUN_DIR="$BASE_DIR/run"
DATA_DIR="$BASE_DIR/data"

SERVER_BIN="$BIN_DIR/server"
AGENT_BIN="$BIN_DIR/agent"
SERVER_ENV="$BASE_DIR/server.env"
AGENT_ENV="$BASE_DIR/agent.env"

usage() {
  echo "Usage: sh deploy.sh [start|stop|restart|status]"
}

ensure_files() {
  [ -x "$SERVER_BIN" ] || { echo "missing executable: $SERVER_BIN"; exit 1; }
  [ -x "$AGENT_BIN" ] || { echo "missing executable: $AGENT_BIN"; exit 1; }
  [ -f "$CONF_DIR/server.env.example" ] || { echo "missing file: $CONF_DIR/server.env.example"; exit 1; }
  [ -f "$CONF_DIR/agent.env.example" ] || { echo "missing file: $CONF_DIR/agent.env.example"; exit 1; }

  mkdir -p "$LOG_DIR" "$RUN_DIR" "$DATA_DIR"

  if [ ! -f "$SERVER_ENV" ]; then
    cp "$CONF_DIR/server.env.example" "$SERVER_ENV"
    echo "created $SERVER_ENV"
  fi
  if [ ! -f "$AGENT_ENV" ]; then
    cp "$CONF_DIR/agent.env.example" "$AGENT_ENV"
    echo "created $AGENT_ENV"
  fi
}

check_agent_token() {
  agent_token=$(grep '^AGENT_TOKEN=' "$AGENT_ENV" 2>/dev/null | tail -n 1 | cut -d '=' -f 2- || true)

  if [ -z "$agent_token" ]; then
    echo "AGENT_TOKEN is empty in agent.env"
    exit 1
  fi
}

start_proc() {
  name="$1"
  bin_file="$2"
  env_file="$3"
  pid_file="$RUN_DIR/$name.pid"
  log_file="$LOG_DIR/$name.log"

  if [ -f "$pid_file" ]; then
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      echo "$name already running (pid=$pid)"
      return
    fi
    rm -f "$pid_file"
  fi

  (
    cd "$BASE_DIR"
    set -a
    . "$env_file"
    set +a
    nohup "$bin_file" >>"$log_file" 2>&1 &
    echo $! >"$pid_file"
  )

  echo "$name started"
}

stop_proc() {
  name="$1"
  pid_file="$RUN_DIR/$name.pid"

  if [ ! -f "$pid_file" ]; then
    echo "$name not running"
    return
  fi

  pid=$(cat "$pid_file")
  if ! kill -0 "$pid" 2>/dev/null; then
    rm -f "$pid_file"
    echo "$name not running"
    return
  fi

  kill "$pid" 2>/dev/null || true

  i=0
  while [ "$i" -lt 10 ]; do
    if ! kill -0 "$pid" 2>/dev/null; then
      rm -f "$pid_file"
      echo "$name stopped"
      return
    fi
    i=$((i + 1))
    sleep 1
  done

  kill -9 "$pid" 2>/dev/null || true
  rm -f "$pid_file"
  echo "$name stopped (forced)"
}

status_proc() {
  name="$1"
  pid_file="$RUN_DIR/$name.pid"

  if [ ! -f "$pid_file" ]; then
    echo "$name: stopped"
    return
  fi

  pid=$(cat "$pid_file")
  if kill -0 "$pid" 2>/dev/null; then
    echo "$name: running (pid=$pid)"
  else
    echo "$name: stopped"
  fi
}

start_all() {
  ensure_files
  check_agent_token
  start_proc "server" "$SERVER_BIN" "$SERVER_ENV"
  start_proc "agent" "$AGENT_BIN" "$AGENT_ENV"
  status_all
}

stop_all() {
  stop_proc "agent"
  stop_proc "server"
  status_all
}

status_all() {
  status_proc "server"
  status_proc "agent"
  echo "logs: $LOG_DIR"
}

cmd="${1:-start}"
case "$cmd" in
  start)
    start_all
    ;;
  stop)
    stop_all
    ;;
  restart)
    stop_all
    start_all
    ;;
  status)
    ensure_files
    status_all
    ;;
  *)
    usage
    exit 1
    ;;
esac

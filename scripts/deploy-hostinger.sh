#!/usr/bin/env bash
# Simple one-command deployment for Hostinger KVM + Cloudflare
# Usage:
#   sudo bash scripts/deploy-hostinger.sh
# Notes:
# - Runs from repo root on the VPS
# - Uses docker-compose.simple.yml
# - Generates self-signed certs if none exist (works with Cloudflare SSL mode "Full").
#   For "Full (strict)", replace with valid Origin Certificates later.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE="docker compose -f ${REPO_ROOT}/docker-compose.simple.yml"
DOMAINS=(
  "grsdeliver.com"
  "api.grsdeliver.com"
  "admin.grsdeliver.com"
  "business.grsdeliver.com"
  "driver.grsdeliver.com"
)

log() { echo -e "\033[0;32m[DEPLOY]\033[0m $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m  $*"; }
err() { echo -e "\033[0;31m[ERROR]\033[0m $*"; }
need_root() { if [[ $EUID -ne 0 ]]; then err "Run with sudo/root"; exit 1; fi }

install_docker_stack() {
  if ! command -v docker >/dev/null 2>&1; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
  else
    log "Docker already installed"
  fi
  if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
    log "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose || true
  else
    log "Docker Compose available"
  fi
  usermod -aG docker "${SUDO_USER:-$USER}" || true
}

setup_firewall() {
  if ! command -v ufw >/dev/null 2>&1; then
    apt-get update && apt-get install -y ufw
  fi
  log "Configuring UFW..."
  ufw --force reset
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
}

ensure_env() {
  cd "$REPO_ROOT"
  if [[ ! -f .env ]]; then
    if [[ -f .env.production ]]; then
      cp .env.production .env
      warn "Created .env from .env.production. Review secrets/URLs later."
    else
      err ".env.production not found; please add environment variables."; exit 1
    fi
  fi
}

ensure_ssl() {
  local ssl_dir="$REPO_ROOT/nginx/ssl"
  mkdir -p "$ssl_dir"
  for d in "${DOMAINS[@]}"; do
    local crt="$ssl_dir/$d.crt"
    local key="$ssl_dir/$d.key"
    if [[ ! -f "$crt" || ! -f "$key" ]]; then
      warn "No cert for $d. Generating self-signed (1 year)..."
      openssl req -x509 -nodes -newkey rsa:2048 \
        -keyout "$key" -out "$crt" -days 365 \
        -subj "/C=US/ST=NA/L=NA/O=SelfSigned/OU=IT/CN=$d" >/dev/null 2>&1 || true
    fi
  done
  warn "If using Cloudflare: set SSL mode to 'Full' (not 'Full strict') when using self-signed."
}

stop_host_nginx() {
  if systemctl is-active --quiet nginx 2>/dev/null; then
    warn "Stopping host nginx to avoid port conflicts..."
    systemctl stop nginx || true
    systemctl disable nginx || true
  fi
}

build_and_start() {
  cd "$REPO_ROOT"
  log "Building images (simple compose)..."
  ${COMPOSE} build --no-cache

  log "Starting databases..."
  ${COMPOSE} up -d mongodb redis
  sleep 20

  log "Starting backend..."
  ${COMPOSE} up -d backend
  sleep 10

  log "Starting PWAs..."
  ${COMPOSE} up -d public-pwa admin-pwa business-pwa driver-pwa

  log "Starting nginx..."
  ${COMPOSE} up -d nginx
}

health_check() {
  log "Containers status:"
  ${COMPOSE} ps
  echo
  log "Backend last 50 lines:"
  ${COMPOSE} logs --tail=50 backend || true
  echo
  log "Try API health:"
  if command -v curl >/dev/null 2>&1; then
    curl -sS http://localhost:3000/health || true
    echo
  fi
}

main() {
  need_root
  install_docker_stack
  setup_firewall
  stop_host_nginx
  ensure_env
  ensure_ssl
  build_and_start
  health_check
  log "Done. Point Cloudflare A records to this VPS."
  warn "If using self-signed certs, set Cloudflare SSL mode to 'Full' (not 'Full strict')."
}

main "$@"
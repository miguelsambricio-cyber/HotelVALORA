#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  HOTEL VALORA — Development Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Copy env file
if [ ! -f "$ROOT_DIR/.env" ]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  echo "✓ .env created from .env.example — edit it with your secrets"
else
  echo "✓ .env already exists"
fi

# 2. Start infrastructure containers
echo "→ Starting infrastructure containers..."
docker compose -f "$ROOT_DIR/infrastructure/docker/docker-compose.dev.yml" \
  up -d postgres redis minio
echo "✓ Containers started"

# 3. Wait for PostgreSQL
echo "→ Waiting for PostgreSQL to be ready..."
until docker exec valora_postgres pg_isready -U valora 2>/dev/null; do
  sleep 1
done
echo "✓ PostgreSQL ready"

# 4. Run migrations
bash "$SCRIPT_DIR/migrate.sh"

# 5. Install web deps
echo "→ Installing frontend dependencies..."
cd "$ROOT_DIR/apps/web"
pnpm install
echo "✓ Frontend dependencies installed"

# 6. Install API deps
echo "→ Installing API dependencies..."
cd "$ROOT_DIR/apps/api"
python3 -m venv .venv
source .venv/bin/activate || source .venv/Scripts/activate
pip install -r requirements-dev.txt
echo "✓ API dependencies installed"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Setup complete!"
echo ""
echo "  Start all services:"
echo "    docker compose -f infrastructure/docker/docker-compose.dev.yml up"
echo ""
echo "  Or start services individually:"
echo "    cd apps/web  && pnpm dev          → http://localhost:3000"
echo "    cd apps/api  && uvicorn app.main:app --reload  → http://localhost:8000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

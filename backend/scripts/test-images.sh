#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TAG=${1:-latest}
export API_IMAGE="ghcr.io/mifunedev/orchestra-api:$TAG"
export WORKER_IMAGE="ghcr.io/mifunedev/orchestra-worker:$TAG"

echo "=== Testing images: API=$API_IMAGE, Worker=$WORKER_IMAGE ==="

# Start test environment
docker compose -f "$PROJECT_ROOT/docker-compose.test.yml" up -d

# Wait for health
echo "Waiting for services..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8000/api/info > /dev/null 2>&1; then
    echo "API is healthy!"
    break
  fi
  sleep 2
  if [ "$i" -eq 30 ]; then
    echo "FAIL: API did not become healthy"
    docker compose -f "$PROJECT_ROOT/docker-compose.test.yml" logs
    docker compose -f "$PROJECT_ROOT/docker-compose.test.yml" down -v
    exit 1
  fi
done

# Validate Worker is running
echo "Checking worker..."
sleep 5
docker compose -f "$PROJECT_ROOT/docker-compose.test.yml" exec worker pgrep -f taskiq || {
  echo "FAIL: Worker process not found"
  docker compose -f "$PROJECT_ROOT/docker-compose.test.yml" logs worker
  docker compose -f "$PROJECT_ROOT/docker-compose.test.yml" down -v
  exit 1
}
echo "Worker is running!"

# Basic API smoke tests
echo "=== Smoke Tests ==="
curl -sf http://localhost:8000/api/info | python3 -m json.tool
echo "GET /api/info: PASS"

# Cleanup
docker compose -f "$PROJECT_ROOT/docker-compose.test.yml" down -v
echo "=== All tests passed ==="

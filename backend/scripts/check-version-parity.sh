#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
pyproject="${PYPROJECT_FILE:-$root/backend/pyproject.toml}"
package_json="${PACKAGE_JSON_FILE:-$root/frontend/package.json}"

backend_version="$(python3 -c 'import sys, tomllib; print(tomllib.load(open(sys.argv[1], "rb"))["project"]["version"])' "$pyproject")"
frontend_version="$(python3 -c 'import json, sys; print(json.load(open(sys.argv[1]))["version"])' "$package_json")"

if [[ "$backend_version" != "$frontend_version" ]]; then
  echo "Version mismatch: $pyproject has $backend_version, $package_json has $frontend_version" >&2
  exit 1
fi

echo "Version parity OK: $backend_version"

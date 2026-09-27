#!/usr/bin/env bash
set -euo pipefail

version="${1:?usage: changelog-section.sh <version> [changelog]}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
changelog="${2:-${CHANGELOG:-$root/Changelog.md}}"

section() {
  awk -v heading="$1" '
    index($0, heading) == 1 { found = 1; next }
    found && /^## / { exit }
    found { print }
  ' "$changelog"
}

body="$(section "## [$version] - ")"
if [[ -z "${body//[[:space:]]/}" ]]; then
  body="$(section "## [Unreleased]")"
fi
printf '%s\n' "$body" | sed -e '/./,$!d'

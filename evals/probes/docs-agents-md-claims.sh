#!/usr/bin/env bash
# tier: docs
# source: AGENTS.md claim table
# desc: every factual claim in AGENTS.md still holds against the repository
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"   # evals/probes/<id>.sh -> evals/ -> repo root
cd "$ROOT" || { echo "FAILED: repo-root - cannot enter $ROOT" >&2; exit 1; }

AGENTS="$ROOT/AGENTS.md"

FAILURES=()

# check <label> <what-the-repo-says-now> <predicate...>
# The predicate runs exactly once. Its stdout is discarded; its stderr is
# appended to the recorded message when it fails, so a predicate can report the
# detail the static message cannot carry.
check() {
  local label="$1"; shift
  local now="$1"; shift
  if [ "$#" -eq 0 ]; then
    FAILURES+=("check-wiring:$label - predicate missing; the label and message were probably concatenated")
    return
  fi
  local detail rc
  detail="$("$@" 2>&1 1>/dev/null)"
  rc=$?
  if [ "$rc" -ne 0 ]; then
    [ -n "$detail" ] && now="$now (${detail%%$'\n'*})"
    FAILURES+=("$label - $now")
  fi
}

absent_in_agents() { ! grep -qiF "$1" "$AGENTS"; }
absent_word_in_agents() { ! grep -qiE "\\b$1\\b" "$AGENTS"; }
present_in_agents() { grep -qF "$1" "$AGENTS"; }
file_has() { grep -qF "$2" "$1"; }
file_has_line() { grep -qxF "$2" "$1"; }
tracked() { git ls-files --error-unmatch "$1"; }
no_root_tooling() { ! grep -nE '^ *entry: +(npx|uvx) ' .pre-commit-config.yaml; }
no_unpinned_ruff() { ! grep -nE '^\s*uvx ruff' backend/Makefile; }
no_seam() { [ "$(grep -c '^---$' "$AGENTS")" = "0" ]; }
no_deployment_host() { ! grep -qE '[a-z0-9-]+\.mifune\.dev' "$AGENTS"; }
imports_at_least_one() { [ "$(grep -rhoE "from src\.$1" backend/src/routes/ | wc -l)" -gt 0 ]; }

commit_exists() {
  [ "$(git rev-parse --is-shallow-repository 2>/dev/null)" = "true" ] && return 0
  git cat-file -e "$1^{commit}" 2>/dev/null
}

workflow_is_dispatch_only() {
  grep -q 'workflow_dispatch:' "$1" && ! grep -qE '^\s*(push|pull_request|schedule):' "$1"
}

default_branch_is_development() {
  local head
  head="$(git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null)" || return 0
  [ -z "$head" ] && return 0
  [ "$head" = "refs/remotes/origin/development" ]
}

# Every root-relative repository path AGENTS.md names in an inline-code span
# must exist. Prose is told from a path by SHAPE, never by existence: deciding
# with [ -e ] would skip exactly the fabricated top-level directory this check
# has to catch.
#
# The extraction strips a trailing slash BEFORE requiring a "/", so a span of
# one segment plus a trailing slash drops out on its own. That is the whole
# prose filter, and it needs no list of names: "src/" and "migrations/" are
# directory names written relative to the directory named in the same sentence,
# and a name has no root to resolve against. What survives holds an internal
# "/" — a container and something inside it — and is a root-relative claim.
#
# Four exclusions, each anchored to the file itself:
#   glob metacharacter  a pattern quoted from .gitignore, not a path
#   basename .env*      non-negotiable 1 — gitignored, absent by design
#   backend/src/public  non-negotiable 3 — generated output
#   leading ..          outside the repository root
agents_md_paths_exist() {
  local missing=() p
  while read -r p; do
    [ -z "$p" ] && continue
    case "$p" in
      ..*) continue ;;
      backend/src/public) continue ;;
      *[][*?]*) continue ;;
    esac
    case "${p##*/}" in .env*) continue ;; esac
    [ -e "$ROOT/$p" ] || missing+=("$p")
  done < <(grep -oE '`[A-Za-z0-9_.*/-]+`' "$AGENTS" | tr -d '`' | sed 's:/*$::' | grep '/' | sort -u)
  [ "${#missing[@]}" -eq 0 ] || { printf 'missing: %s\n' "${missing[*]}" >&2; return 1; }
}

named_paths_exist() {
  local missing=()
  local p
  for p in \
    README.md DCO Changelog.md Makefile \
    backend/Makefile backend/main.py backend/pyproject.toml \
    backend/src/routes backend/src/controllers backend/src/services backend/src/repos \
    backend/src/common backend/src/utils backend/src/schemas \
    backend/migrations backend/seeds backend/scripts \
    backend/tests/unit backend/tests/integration \
    backend/src/services/db.py backend/src/workers/state.py backend/src/services/schedule.py \
    backend/CLAUDE.md \
    backend/uv.lock \
    frontend/package.json frontend/package-lock.json frontend/vite.config.ts \
    frontend/src/tests frontend/src/tests/styles/destructive-usage.test.ts frontend/CLAUDE.md \
    docs/README.md docs/environment-variables.md docs/img \
    infra/docker-compose.yml \
    evals/run.sh evals/README.md evals/probes evals/probes/docs-agents-md-claims.sh \
    decks/AGENTS.md examples \
    .gitignore .pre-commit-config.yaml .github/workflows/test.yml
  do
    [ -e "$ROOT/$p" ] || missing+=("$p")
  done
  [ "${#missing[@]}" -eq 0 ] || { printf 'missing: %s\n' "${missing[*]}" >&2; return 1; }
}

# --- the file itself ---------------------------------------------------------
check "agents-md-present" "AGENTS.md is missing at the repository root" \
  test -f "$AGENTS"
check "claude-md-symlink" "CLAUDE.md is not a symlink to AGENTS.md" \
  test -L "$ROOT/CLAUDE.md"
check "claude-md-symlink-target" "CLAUDE.md points at $(readlink "$ROOT/CLAUDE.md" 2>/dev/null), not AGENTS.md" \
  test "$(readlink "$ROOT/CLAUDE.md" 2>/dev/null)" = "AGENTS.md"
check "no-seam" "AGENTS.md contains a '---' seam; the file was patched, not rewritten" \
  no_seam

# --- directories the file must never describe --------------------------------
check "no-website-dir" "a website/ directory now exists; the claim that it does not is stale" \
  test ! -e "$ROOT/website"
check "no-cli-dir" "a cli/ directory now exists; the claim that it does not is stale" \
  test ! -e "$ROOT/cli"
check "no-deployment-dir" "a deployment/ directory now exists; the claim that it does not is stale" \
  test ! -e "$ROOT/deployment"
check "no-llm-txt-file" "an llm.txt now exists; AGENTS.md must not have been silent about it" \
  test ! -e "$ROOT/website/public/llm.txt"

# --- defects AGENTS.md must never carry again --------------------------------
check "agents-md-no-website" "AGENTS.md names website/, which does not exist" \
  absent_in_agents "website/"
check "agents-md-no-cli-component" "AGENTS.md names cli/, which does not exist" \
  absent_in_agents "cli/"
check "agents-md-no-deployment" "AGENTS.md names deployment/, which does not exist" \
  absent_in_agents "deployment/"
check "agents-md-no-llm-txt" "AGENTS.md names llm.txt, which does not exist" \
  absent_in_agents "llm.txt"
check "agents-md-no-npm-run-docs" "AGENTS.md names 'npm run docs', whose target script was deleted" \
  absent_in_agents "npm run docs"
check "agents-md-no-mkdocs" "AGENTS.md names MkDocs, which this repository does not use" \
  absent_in_agents "mkdocs"
check "agents-md-no-docusaurus-sync" "AGENTS.md names the retired wiki repository" \
  absent_in_agents "mifunedev/wiki"
check "agents-md-no-build-yml-path" "AGENTS.md names .github/build.yml; the workflow is .github/workflows/build.yml" \
  absent_in_agents ".github/build.yml"
check "agents-md-no-claude-plans" "AGENTS.md names .claude/plans/ as a plan destination; that path is gitignored" \
  absent_in_agents ".claude/plans"
check "agents-md-no-foramt-typo" "AGENTS.md carries the 'Foramt' typo" \
  absent_in_agents "Foramt"
check "agents-md-no-ruska" "AGENTS.md names Ruska, a retired product name" \
  absent_word_in_agents "ruska"
check "agents-md-no-enso" "AGENTS.md names Enso, a retired product name" \
  absent_word_in_agents "enso"
check "agents-md-no-deployment-host" "AGENTS.md names a *.mifune.dev host; Orchestra deploys nothing" \
  no_deployment_host
check "agents-md-no-fabricated-backend-test" "AGENTS.md names tests/routes/test_agents.py, which does not exist" \
  absent_in_agents "tests/routes/test_agents.py"
check "agents-md-no-fabricated-frontend-test" "AGENTS.md names AgentFlow.test.tsx, which does not exist" \
  absent_in_agents "AgentFlow.test.tsx"
check "agents-md-no-make-test" "AGENTS.md names the Make target 'make test'; backend/Makefile owns it" \
  absent_in_agents "make test"
check "agents-md-no-make-format" "AGENTS.md names the Make target 'make format'; backend/Makefile owns it" \
  absent_in_agents "make format"
check "agents-md-no-make-lint" "AGENTS.md names the Make target 'make lint'; backend/Makefile owns it" \
  absent_in_agents "make lint"
check "agents-md-no-make-dev" "AGENTS.md names the Make target 'make dev'; backend/Makefile owns it" \
  absent_in_agents "make dev"
check "agents-md-no-make-seeds" "AGENTS.md names the Make target 'make seeds.user'; backend/Makefile owns it" \
  absent_in_agents "make seeds.user"
check "agents-md-no-image-pin" "AGENTS.md transcribes a pgvector image pin; infra/docker-compose.yml owns it" \
  absent_in_agents "pgvector/pgvector"

# --- claims AGENTS.md makes, asserted against their owning files -------------
check "backend-env-default" "backend/Makefile no longer defaults ENV_FILE to ../.env" \
  file_has_line backend/Makefile 'ENV_FILE ?= ../.env'
check "precommit-test-env" ".pre-commit-config.yaml no longer runs the backend suite against ../.env.test" \
  file_has .pre-commit-config.yaml 'ENV_FILE=../.env.test'
check "frontend-env" "frontend/package.json no longer loads the dev server env with 'dotenv -e ../.env'" \
  file_has frontend/package.json 'dotenv -e ../.env'
check "compose-env-file" "infra/docker-compose.yml no longer loads the root .env" \
  file_has infra/docker-compose.yml '../.env'
check "env-template-tracked" ".example.env is no longer tracked at the repository root; AGENTS.md sends agents to it" \
  tracked .example.env
check "precommit-runs-from-component-dir" ".pre-commit-config.yaml invokes npx or uvx from the repository root; AGENTS.md says component checks run from their own directory" \
  no_root_tooling
check "backend-formatter-pinned" "backend/Makefile still invokes ruff through uvx, which resolves the newest release at run time" \
  no_unpinned_ruff
check "gitignore-env" ".gitignore no longer ignores **/.env*" \
  file_has_line .gitignore '**/.env*'
check "gitignore-public" ".gitignore no longer ignores **/backend/src/public" \
  file_has_line .gitignore '**/backend/src/public'
check "gitignore-claude" ".gitignore no longer ignores **/.claude/" \
  file_has_line .gitignore '**/.claude/'
check "gitignore-tasks" ".gitignore no longer ignores tasks/" \
  file_has_line .gitignore 'tasks/'
check "api-port-8000" "infra/docker-compose.yml no longer publishes 8000:8000" \
  file_has infra/docker-compose.yml '"8000:8000"'
check "swagger-path-api" "backend/main.py no longer serves the Swagger UI at /api" \
  file_has backend/main.py 'docs_url="/api"'
check "agents-md-api-url" "AGENTS.md no longer names http://localhost:8000/api" \
  present_in_agents "http://localhost:8000/api"
check "vite-out-dir" "frontend/vite.config.ts no longer builds into ../backend/src/public" \
  file_has frontend/vite.config.ts '"../backend/src/public"'
check "vite-empty-out-dir" "frontend/vite.config.ts no longer sets emptyOutDir" \
  file_has frontend/vite.config.ts 'emptyOutDir'
check "backend-tests-unit" "backend/tests/unit no longer exists" \
  test -d "$ROOT/backend/tests/unit"
check "backend-tests-integration" "backend/tests/integration no longer exists" \
  test -d "$ROOT/backend/tests/integration"
check "frontend-tests" "frontend/src/tests no longer exists" \
  test -d "$ROOT/frontend/src/tests"
check "default-branch-development" "origin/HEAD no longer resolves to development" \
  default_branch_is_development
check "docs-source-of-truth" "docs/README.md no longer declares itself the source of truth" \
  file_has docs/README.md 'Source of truth'
check "docs-tree-url" "AGENTS.md no longer carries the GitHub docs tree URL" \
  present_in_agents "https://github.com/mifunedev/orchestra/tree/development/docs"
check "decks-agents-md-tracked" "decks/AGENTS.md is no longer tracked" \
  tracked decks/AGENTS.md
check "backend-claude-md-tracked" "backend/CLAUDE.md is no longer tracked" \
  tracked backend/CLAUDE.md
check "frontend-claude-md-tracked" "frontend/CLAUDE.md is no longer tracked" \
  tracked frontend/CLAUDE.md
check "backend-no-agents-sibling" "backend/AGENTS.md now exists; backend/CLAUDE.md is no longer Claude-only" \
  test ! -e "$ROOT/backend/AGENTS.md"
check "frontend-no-agents-sibling" "frontend/AGENTS.md now exists; frontend/CLAUDE.md is no longer Claude-only" \
  test ! -e "$ROOT/frontend/AGENTS.md"
check "evals-runner" "evals/run.sh no longer exists" \
  test -f "$ROOT/evals/run.sh"
check "evals-contract" "evals/README.md no longer exists" \
  test -f "$ROOT/evals/README.md"
check "evals-oracle-pass" "evals/README.md no longer documents exit 0 as PASS" \
  file_has evals/README.md '**PASS**'
check "evals-oracle-regression" "evals/README.md no longer documents exit 1 as REGRESSION" \
  file_has evals/README.md '**REGRESSION**'
check "evals-oracle-skipped" "evals/README.md no longer documents exit 2 as SKIPPED" \
  file_has evals/README.md '**SKIPPED**'
check "shared-store-singleton" "get_shared_store is gone from backend/src/services/db.py" \
  file_has backend/src/services/db.py 'def get_shared_store'
check "destructive-usage-gate" "frontend/src/tests/styles/destructive-usage.test.ts no longer exists" \
  test -f "$ROOT/frontend/src/tests/styles/destructive-usage.test.ts"
check "routes-import-services" "backend/src/routes no longer imports src.services directly" \
  imports_at_least_one services
check "routes-import-repos" "backend/src/routes no longer imports src.repos directly; a layer order may now hold" \
  imports_at_least_one repos
check "docs-sh-absent" "backend/scripts/docs.sh exists again; the #623 defect entry is stale" \
  test ! -e "$ROOT/backend/scripts/docs.sh"
check "docs-sh-deletion-commit" "commit 26d646fa is unreachable; the #623 defect entry cites it" \
  commit_exists 26d646fa
check "uv-lock-tracked" "backend/uv.lock is no longer tracked at that path" \
  tracked backend/uv.lock
check "package-lock-tracked" "frontend/package-lock.json is no longer tracked at that path" \
  tracked frontend/package-lock.json
check "build-workflow-on-tag" ".github/workflows/build.yml is no longer triggered by a tag push" \
  file_has .github/workflows/build.yml 'tags:'
check "deploy-docker-dispatch-only" ".github/workflows/deploy-docker.yml now has a non-dispatch trigger" \
  workflow_is_dispatch_only .github/workflows/deploy-docker.yml
check "deploy-vm-dispatch-only" ".github/workflows/deploy-vm.yml now has a non-dispatch trigger" \
  workflow_is_dispatch_only .github/workflows/deploy-vm.yml
check "docs-claims-workflow" ".github/workflows/docs-claims.yml is gone; no workflow runs this guard on push" \
  test -f "$ROOT/.github/workflows/docs-claims.yml"
check "docs-claims-workflow-runs-probe" ".github/workflows/docs-claims.yml no longer names evals/probes/docs-agents-md-claims.sh" \
  file_has .github/workflows/docs-claims.yml 'evals/probes/docs-agents-md-claims.sh'
check "agents-md-paths-exist" "AGENTS.md names a repository path that does not exist" \
  agents_md_paths_exist
check "named-paths-exist" "a structural path this guard depends on does not exist" \
  named_paths_exist

# --- verdict -----------------------------------------------------------------
if [ "${#FAILURES[@]}" -gt 0 ]; then
  for f in "${FAILURES[@]}"; do
    echo "FAILED: $f" >&2
  done
  echo "REGRESSION: ${#FAILURES[@]} AGENTS.md claim(s) no longer hold" >&2
  exit 1
fi

echo "PASS: every AGENTS.md claim holds against the repository" >&2
exit 0

# PRD: SemVer releases for Orchestra

Status: DRAFT

## User Stories

### US-001: One release version for the whole repository

**Description:** As a maintainer, I want one file to hold the release version. Then the API, the client, the images, and the tag report the same version.

**Acceptance Criteria:**

- [ ] `backend/pyproject.toml` `[project] version` holds the release version in `MAJOR.MINOR.PATCH` form.
- [ ] `frontend/package.json` `version` equals the `backend/pyproject.toml` version.
- [ ] `backend/scripts/check-version-parity.sh` exits 0 when the two versions match and exits 1 with a message that names both files when they differ.
- [ ] The `test-backend` job in `.github/workflows/test.yml` runs `backend/scripts/check-version-parity.sh`.
- [ ] If `APP_VERSION` is unset, `src.constants.APP_VERSION` equals the `backend/pyproject.toml` version.
- [ ] If `VITE_APP_VERSION` is unset, the client build uses the `frontend/package.json` version.
- [ ] `backend/tests/unit/test_app_version.py` passes under `make test` and covers the default and the override.

### US-002: Keep a Changelog format

**Description:** As a reader of release notes, I want `Changelog.md` in Keep a Changelog form with an `[Unreleased]` section. Then each release has a section that the release workflow can publish.

**Acceptance Criteria:**

- [ ] The `Changelog.md` header states Keep a Changelog 1.1.0 and SemVer, and names `backend/pyproject.toml` as the version source.
- [ ] `Changelog.md` holds `## [Unreleased]` above every version section.
- [ ] `## [Unreleased]` uses only the categories `### Added`, `### Changed`, `### Deprecated`, `### Removed`, `### Fixed`, and `### Security`.
- [ ] The `## 2026.9.27` entries move under `## [Unreleased]` as one sentence each, with a PR link, at 250 characters or less.
- [ ] The CalVer sections from `## 2026.9.14` and older stay unchanged below a `## Legacy CalVer releases` heading.
- [ ] The `## Planned` section moves to a GitHub issue or to `docs/`, and `Changelog.md` no longer holds it.
- [ ] `CONTRIBUTING.md` states the entry rule: one imperative sentence, 250 characters or less, a PR or issue link, under `## [Unreleased]`.

### US-003: Release workflow on push to main

**Description:** As a maintainer, I want a push to `main` to validate the commit, reserve the `v<version>` tag, publish the images, and publish a GitHub Release. Then no person creates a tag by hand.

**Acceptance Criteria:**

- [ ] `.github/workflows/release.yml` runs on each push to `main`.
- [ ] The workflow runs the backend tests, the frontend tests, the frontend build, and `backend/scripts/check-version-parity.sh` before any tag, image, or release changes.
- [ ] The workflow reads the version from `backend/pyproject.toml`.
- [ ] If tag `v<version>` exists on a different commit, the workflow reports the version as released, skips each publish job, and ends green.
- [ ] If tag `v<version>` exists on the same commit, a rerun completes without a duplicate tag or a duplicate release.
- [ ] The workflow pushes `ghcr.io/mifunedev/orchestra-api` and `ghcr.io/mifunedev/orchestra-worker` with the tags `<version>`, `sha-<full sha>`, and `latest`.
- [ ] The workflow keeps `ghcr.io/mifunedev/orchestra` as an alias of the API image with the same three tags.
- [ ] The GitHub Release body is the `Changelog.md` section for `<version>`, or the `## [Unreleased]` body when that section does not exist.
- [ ] Image tags and the release name use the bare version. Only the git tag and the release title use the `v` prefix.

### US-004: Retire CalVer tooling

**Description:** As a maintainer, I want the date-based tooling removed. Then no command creates a CalVer tag or a CalVer changelog header.

**Acceptance Criteria:**

- [ ] The root `Makefile` targets `changelog` and `tag` no longer exist.
- [ ] `backend/scripts/tag.sh` no longer exists.
- [ ] `.github/workflows/build.yml` no longer runs on `push: tags: ["*"]`. `release.yml` owns image publication.
- [ ] `.github/workflows/deploy-docker.yml` and `.github/workflows/deploy-vm.yml` accept a SemVer tag, and the input description shows a SemVer example.
- [ ] `git grep -n -E 'YYYY\.M\.D|date-based' -- ':!Changelog.md'` prints no line.

### US-005: Release branch and release procedure

**Description:** As a maintainer, I want a `main` branch and one documented procedure to promote `development` to `main`. Then each release comes from a validated commit.

**Acceptance Criteria:**

- [ ] Branch `main` exists on `origin` and starts at the `development` commit that bumps the first SemVer version.
- [ ] `docs/releasing.md` states the procedure: bump the version in both files, move `[Unreleased]` to `## [<version>] - <YYYY-MM-DD>`, merge to `development`, fast-forward `main`, and monitor `release.yml`.
- [ ] `docs/README.md` links `docs/releasing.md`.
- [ ] The first push to `main` publishes release `v4.0.0` with the images and the GitHub Release.
- [ ] `gh release view v4.0.0 --repo mifunedev/orchestra` exits 0.
- [ ] `git ls-remote --heads origin master` prints no line.
- [ ] `docker manifest inspect ghcr.io/mifunedev/orchestra-api:4.0.0` exits 0.

## Summary

Orchestra uses CalVer today. `backend/scripts/tag.sh` creates `YYYY.M.D[-N]` tags, and the root `Makefile` target `changelog` writes CalVer headings. The `changelog` target has a known defect: it prints `[: Illegal number` and chooses a `-2` suffix on a day with no entry. `.github/workflows/build.yml` publishes images on each tag push. The repository holds 359 tags, and the three latest GitHub Releases are `0.0.2-rc` pre-releases.

The version values disagree. `backend/pyproject.toml` holds `4.0.0`, `frontend/package.json` holds `0.0.0`, `src.constants.APP_VERSION` defaults to `0.1.0`, and `.example.env` sets `VITE_APP_VERSION=0.0.1`.

The operator selected the `mifunedev/agro` process: SemVer, Keep a Changelog, `v`-prefixed tags, a version read from one file, and a release workflow on push to `main`. This plan applies that process to Orchestra. The default branch stays `development`. `origin/master` has no commit after 2024-11-17, and no `main` branch exists.

## Key Integration Points

| File | Function(s) / Symbol(s) | Role |
|---|---|---|
| `backend/pyproject.toml` | `[project] version` | Release version source. |
| `frontend/package.json` | `version` | Client version. Must equal the backend version. |
| `backend/src/constants/__init__.py` | `APP_VERSION` | API version default. |
| `backend/main.py` | `FastAPI(version=APP_VERSION)` | API version in the OpenAPI document. |
| `frontend/vite.config.ts` | `define` | Client version default. |
| `Changelog.md` | whole file | Release notes source. |
| `Makefile` | `changelog`, `tag` | Delete. |
| `backend/scripts/tag.sh` | whole file | Delete. |
| `.github/workflows/build.yml` | tag trigger, image push steps | Replace with `release.yml`. |
| `.github/workflows/release.yml` | new | Validate, reserve, publish. |
| `.github/workflows/deploy-docker.yml`, `.github/workflows/deploy-vm.yml` | `inputs.tag` | SemVer tag input. |
| `/home/sandbox/harness/.github/workflows/release.yml` | `reserve`, `publish-image`, `finalize` | Reference implementation. |
| `/home/sandbox/harness/.agro/scripts/reserve-github-release.mjs` | tag reservation | Reference for the same-SHA and different-SHA rules. |

## Interface Integration Points

| Surface | Change Type | Description |
|---|---|---|
| Git tags | Changed | New tags are `v<MAJOR.MINOR.PATCH>`. Existing CalVer tags stay. |
| GHCR images | Changed | Tags `<version>`, `sha-<sha>`, `latest`. Publication moves from tag push to push to `main`. |
| GitHub Releases | Changed | One non-draft release per version, body from `Changelog.md`. |
| `GET /api` OpenAPI `info.version` | Changed | Reports the `backend/pyproject.toml` version by default. |
| Client version display | Changed | Reports the `frontend/package.json` version by default. |
| Root `Makefile` | Breaking | `make changelog` and `make tag` removed. |

## Storage

N/A. This task changes files, tags, images, and releases. No database or store schema changes.

## Architectural Decisions

- Source of truth: `backend/pyproject.toml` holds the version, because the backend is the release artifact. `frontend/package.json` mirrors the value, and a parity check enforces the mirror.
- Release trigger: a push to `main` releases. A push to `development` never releases.
- A version bump is a deliberate commit. The workflow never derives a version from the date or from commit messages.
- Tag reservation follows `mifunedev/agro`: a tag on a different commit is a green no-op, and a tag on the same commit is a safe rerun.
- Existing CalVer tags and releases stay. The plan deletes no tag and no release.

## Test Plan (TDD)

| Test File | Case(s) | Validates |
|---|---|---|
| `backend/tests/unit/test_app_version.py` | default from `pyproject.toml`, `APP_VERSION` override | US-001 |
| `backend/scripts/check-version-parity.sh` | match exits 0, mismatch exits 1 | US-001 |
| `frontend/src/tests/config/app-version.test.ts` | default from `package.json`, `VITE_APP_VERSION` override | US-001 |
| `.github/workflows/release.yml` on a test branch `experiment/semver-dry-run` | reserve, no-op on existing tag | US-003 |
| `gh release view v4.0.0` | release exists | US-005 |

Run backend tests with `make test` from `backend/`. Run frontend tests with `npm test` from `frontend/`.

## Design Principles

- One source of truth for the version, with one check that enforces the mirror.
- Deliberate releases: a person bumps the version, and the workflow does the rest.
- Follow `mifunedev/agro` where the two repositories match. Diverge only where Orchestra differs: Python and a client, two images, no npm package.
- Keep history: existing tags, releases, and changelog sections stay readable.

## Out of Scope

- An automated changelog-entry check on pull requests.
- An npm package or a CLI release.
- Deletion or rename of the 359 existing CalVer tags or the `0.0.2-rc` pre-releases.
- The per-user Cloudflare sandbox work in `.agro/tasks/per-user-cloudflare-sandbox/prd.md`.

## Open Questions

None. The operator selected these decisions on 2026-09-27:

1. The first SemVer version is `4.0.0`.
2. `backend/pyproject.toml` holds the version, and `frontend/package.json` mirrors the version.
3. The operator deletes `origin/master` after `main` exists.
4. `release.yml` keeps `ghcr.io/mifunedev/orchestra` as an alias of the API image.

## Acceptance Criteria

- [ ] Each story acceptance criterion above passes.
- [ ] `make test` in `backend/` exits 0.
- [ ] `npm test` and `npm run build` in `frontend/` exit 0.
- [ ] Release `v4.0.0` exists with images `orchestra-api`, `orchestra-worker`, and `orchestra` at `4.0.0`.
- [ ] No file in the repository creates a CalVer tag or a CalVer changelog heading.

## Lessons

1. Claim: `release.yml` reports a green no-op when tag creation fails for a reason other than an existing tag. Evidence: the `reserve` step ignores the exit status of the tag-create call. The step compares an empty commit with `GITHUB_SHA`. Outcome: proposed issue, pending operator approval.
2. Claim: the deploy workflows carry shellcheck findings (SC2086, SC2140). Evidence: actionlint with shellcheck reports 5 findings in `deploy-docker.yml` and 3 in `deploy-vm.yml`, the same counts as before this PR. Outcome: proposed issue, pending operator approval.
3. Claim: tag pushes no longer deploy to the Dev VM. Evidence: this PR deletes `build.yml`, which held the automatic deploy job. `deploy-docker.yml` remains for manual deploys. Outcome: fixed in this PR. The PR body states the change.

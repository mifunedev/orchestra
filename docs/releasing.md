# Releasing

Orchestra uses SemVer (`MAJOR.MINOR.PATCH`). `backend/pyproject.toml` owns the version. A push to `main` runs `.github/workflows/release.yml`. The workflow tests the commit, tags it, pushes the images to GHCR, and publishes the GitHub Release.

## Procedure

1. Set the new version in `backend/pyproject.toml` (`[project] version`).
2. Set the same version in `frontend/package.json` (`version`).
3. Set the same version in the two top-level `version` fields of `frontend/package-lock.json`: the root `version` and `packages[""].version`.
4. Run the parity check. The check must print `Version parity OK: <version>`.

   ```bash
   backend/scripts/check-version-parity.sh
   ```

5. In `Changelog.md`, move the entries under `## [Unreleased]` to a new section `## [<version>] - <YYYY-MM-DD>`.
6. Keep an empty `## [Unreleased]` section above the new section.
7. Merge the change to `development` through a pull request.
8. Fast-forward `main` to the merged `development` commit. Use one of these commands. Do not force-push.

   ```bash
   git push origin <sha>:main
   ```

   ```bash
   git fetch origin && git push origin origin/development:main
   ```

9. Monitor the release workflow.

   ```bash
   gh run list --workflow release.yml
   gh run watch <run-id>
   ```

## Tags and images

The git tag and the release title use `v<version>`, for example `v1.2.3`. The image tags use the bare version, for example `1.2.3`.

The workflow pushes these images:

| Image | Tags |
| --- | --- |
| `ghcr.io/mifunedev/orchestra-api` | `<version>`, `sha-<sha>`, `latest` |
| `ghcr.io/mifunedev/orchestra-worker` | `<version>`, `sha-<sha>`, `latest` |
| `ghcr.io/mifunedev/orchestra` (alias of the API image) | `<version>`, `sha-<sha>`, `latest` |

The release notes come from the `## [<version>] - ` section of `Changelog.md`. If that section is empty, the notes come from `## [Unreleased]`.

## No-op runs

If the tag `v<version>` already points to a different commit, that version is already released. The workflow writes `v<version> is already released at <sha>; skipping publish.` to the run summary. It then skips the image and release jobs. To publish again, bump the version and repeat the procedure.

## Verify a release

```bash
gh release view v<version>
docker manifest inspect ghcr.io/mifunedev/orchestra-api:<version>
```

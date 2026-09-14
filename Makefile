.PHONY: setup tag changelog benchmark.images

ENV ?= dev

# Install pre-commit hooks
setup:
	pre-commit install

# Add a changelog entry for the current branch (YYYY.M.D[-N] format)
changelog:
	@YEAR=$$(date -u +%Y) && MONTH=$$(date -u +%-m) && DAY=$$(date -u +%-d) && \
	TODAY="$${YEAR}.$${MONTH}.$${DAY}" && \
	BRANCH=$$(git rev-parse --abbrev-ref HEAD) && \
	EXISTING=$$(grep -cP "^## $${TODAY}($$|-)" Changelog.md 2>/dev/null || echo "0") && \
	if [ "$$EXISTING" -eq 0 ]; then VERSION="$${TODAY}"; \
	else \
		MAX=$$(grep -oP "^## $${TODAY}-\K\d+" Changelog.md 2>/dev/null | sort -rn | head -1 || echo "1") && \
		if [ "$$MAX" -gt 1 ]; then VERSION="$${TODAY}-$$((MAX+1))"; else VERSION="$${TODAY}-2"; fi; \
	fi && \
	HEADER="## $${VERSION}" && \
	ENTRY="  - $${BRANCH}" && \
	FIRST_ENTRY=$$(grep -n '^## ' Changelog.md | head -1 | cut -d: -f1) && \
	if [ -z "$$FIRST_ENTRY" ]; then \
		printf "%s\n\n### Changed\n%s\n" "$$HEADER" "$$ENTRY" >> Changelog.md; \
	else \
		sed -i "$${FIRST_ENTRY}i\\$${HEADER}\n\n### Changed\n$${ENTRY}\n" Changelog.md; \
	fi && \
	echo "📝 Added $${VERSION} entry for $${BRANCH}"

# Create and push a YYYY.MM.DD-RR git tag
tag:
	@bash backend/scripts/tag.sh $(TAG)

# Image benchmarks — build both targets and report sizes
benchmark.images:
	bash backend/scripts/benchmark-images.sh

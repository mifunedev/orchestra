---
name: Bug Report
about: Report a bug with enough detail for autonomous agent diagnosis and fix
title: "fix: "
labels: ["bug"]
assignees: ""
---

## Metadata

> **IMPORTANT**: The very first step should _ALWAYS_ be validating this metadata section to maintain a **CLEAN** development workflow.

```yml
pull_request_title: "FROM fix/[issue#]-[shortdesc] TO development"
branch: "fix/[issue#]-[shortdesc]"
worktree_path: "$WORKSPACE/.worktrees/fix-[issue#]"
```

---

## User Stories

<!-- Define the broken experience from the user's perspective FIRST. Every story follows the format:
     "As a [role], I expect [expected behavior] when [action], but instead [actual behavior]."
     These stories ground the bug in real user impact and guide the fix toward the right outcome. -->

- As a **[role]**, I expect **[expected behavior]** when **[action]**, but instead **[actual behavior]**.
- As a **[role]**, I expect **[expected behavior]** when **[action]**, but instead **[actual behavior]**.

---

## Summary

<!-- Brief additional context beyond the user stories. What's broken at a technical level? -->



### Severity

<!-- How impactful is this bug? -->

- [ ] **Critical** — Blocks core functionality, data loss, or security issue
- [ ] **High** — Major feature broken, no workaround
- [ ] **Medium** — Feature partially broken, workaround exists
- [ ] **Low** — Cosmetic, minor inconvenience

---

## Steps to Reproduce

<!-- Numbered steps an agent or human can follow to trigger the bug deterministically. -->

1. 
2. 
3. 

### Expected Behavior

<!-- What SHOULD happen? -->



### Actual Behavior

<!-- What ACTUALLY happens? Include error messages, stack traces, or screenshots. -->



### Visual Evidence

<!-- Screenshots, screen recordings, or logs. Paste error output in a code block. -->

```
# Error output / stack trace
```

---

## Environment

| Detail | Value |
|--------|-------|
| Branch / Commit | <!-- e.g., `development @ abc1234` --> |
| Browser | <!-- e.g., Chrome 120, Firefox 121, N/A for backend --> |
| OS | <!-- e.g., macOS 15, Ubuntu 24.04 --> |
| Node version | <!-- e.g., 22.x --> |
| Python version | <!-- e.g., 3.12.x --> |

---

## Affected Files

<!-- Files/functions where the bug likely originates. Describe the ROLE each plays. -->

| File | Function(s) | Role / Relevance |
|------|-------------|------------------|
| `backend/src/...` | `function_name()` | _e.g., Route handler that returns malformed response_ |

---

## Root Cause Hypothesis

<!-- Best guess at what's causing the bug. If unknown, say so — the agent will investigate. -->



---

## Architectural Context

<!-- Any relevant context about how the broken feature is wired up. Prevents the agent from making incorrect assumptions during the fix. -->

- **Source of truth**: <!-- e.g., Backend store, NOT localStorage -->
- **State flow**: <!-- e.g., API → React Query cache → component -->
- **Related services**: <!-- e.g., MemoryService, LangGraph Store -->

---

## Development Setup

### Dependencies

| Service | Address | Notes |
|---------|---------|-------|
| Redis | `localhost:6379` | Docker container |
| Postgres | `localhost:5432` | Docker container |

### Commands

```bash
# See package.json for scripts
```

### Documentation

> **⚠️ IMPORTANT:** If the fix requires documentation updates, edit the Markdown under [`docs/`](../../docs/README.md) in this repo — it ships in the same PR as the fix.
>
> The published documentation site is retired. Read the documentation at [https://github.com/mifunedev/orchestra/tree/development/docs](https://github.com/mifunedev/orchestra/tree/development/docs). The Docusaurus app in [`mifunedev/wiki`](https://github.com/mifunedev/wiki) still keeps its own copy of this Markdown. Until that repo is retired, a change that must reach the wiki has to be applied there too.

---

## Design Principles

- Fix the root cause, not the symptom.
- _ALWAYS_ look at the current codebase first — achieve the fix in the **least amount of changes**.
- TDD-first: write a failing test that reproduces the bug, then fix it.
- No regressions — existing tests must continue to pass.

---

## Validation Tools

<!-- Explicit tool callouts for verifying the fix. -->

- [ ] Load `agent-browser` skill with screenshots to validate E2E. This validates test assumptions for completion promise.

---

## Acceptance Criteria

<!-- Every criterion must be binary — testable by an agent with a pass/fail outcome. -->

- [ ] Bug is no longer reproducible following the steps above
- [ ] A regression test is added that covers this specific bug
- [ ] All previous & new tests pass, validated using `agent-browser` CLI
- [ ] Fix follows existing repo/service/route patterns (e.g., BaseRepo, ServiceContext)
- [ ] No new dependencies added beyond what's already in the project (or justified in PR description)
- [ ] Related documentation updated under `docs/` if applicable (and mirrored to the wiki repo if it must reach the published wiki)
- [ ] <!-- Add bug-specific criteria -->
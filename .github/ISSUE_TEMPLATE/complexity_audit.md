---
name: Complexity Audit
about: Request a four-phase complexity audit — measure, identify patterns, benchmark, and deliver a draft PR
title: "audit: "
labels: ["tech-debt", "complexity-audit"]
assignees: ""
---

## Metadata

> **IMPORTANT**: The very first step should _ALWAYS_ be validating this metadata section to maintain a **CLEAN** development workflow.

```yml
pull_request_title: "FROM refactor/[issue#]-complexity-audit TO development"
branch: "refactor/[issue#]-complexity-audit"
worktree_path: "$WORKSPACE/.worktrees/refactor-[issue#]"
```

---

## Scope

<!-- Define which areas of the codebase to audit. Be specific — entire repo, single service, or specific modules. -->

- **Target**: <!-- e.g., `backend/src/services/`, `frontend/src/components/`, or entire repo -->
- **Language(s)**: <!-- e.g., Python, TypeScript, both -->
- **Reason for audit**: <!-- e.g., Frequent bugs in module X, slow onboarding, pre-refactor assessment -->

---

## Four Mandatory Phases

### Phase 1 — Study & Measure

Scan the project structure, compute complexity metrics, and produce a ranked table normalized across all scanned files.

| Metric | Purpose | Tools |
|--------|---------|-------|
| **Cyclomatic Complexity** | Branch density measurement | `radon cc` (Python), `escomplex` (JS/TS) |
| **Cognitive Complexity** | Nesting/readability cost | `radon cc -s`, SonarQube rules |
| **Coupling (Ca/Ce)** | Module entanglement | Manual dependency graph analysis |
| **Lines of Logic** | Excluding blanks/comments | SLOC tools, AST parsing |
| **Churn × Complexity** | Volatility hot-spots | Git history cross-referenced with CC scores |
| **Duplication Index** | Copy-paste debt | `jscpd`, `pylint` |

**Composite Scoring Formula:**

```
Score = (CC × 0.30) + (Cognitive × 0.25) + (Coupling × 0.20)
       + (Churn×CC × 0.15) + (Duplication × 0.10)
```

All metrics normalized to 0–100 before weighting.

**Deliverable:** `.audit/complexity_ranking.md`

---

### Phase 2 — Identify Patterns

Match root causes to design patterns using the decision matrix below, then output structured recommendations with estimated impact.

| Root Cause | Recommended Pattern(s) |
|------------|----------------------|
| God-class complexity | Extract Class + Facade |
| Long if/switch chains | Strategy Pattern or State Machine |
| Deep nesting | Guard Clauses + Chain of Responsibility |
| High coupling | Mediator or Event Bus / Pub-Sub |
| Code duplication | Template Method or shared utilities |
| Complex construction | Builder Pattern |
| Callback/async tangles | Pipeline/Middleware or async-iterator |
| Global mutable state | Dependency Injection + Repository |
| Scattered feature flags | Feature Toggle abstraction + Abstract Factory |

**Deliverable:** `.audit/pattern_recommendations.yaml`

---

### Phase 3 — Benchmark

Create a runnable suite comparing current state against a frozen baseline snapshot.

**Benchmark gates (regression tolerance):**

- Total CC, avg CC, cognitive complexity: ≤ 5%
- Duplication: ≤ 2%
- Test pass rate: 0% tolerance (no failures allowed)

**Deliverable:** Baseline and post-refactor snapshots in `.audit/benchmarks/`

---

### Phase 4 — Draft PR

Create a branch, apply isolated commits for each pattern, run benchmarks, and push a draft pull request.

- One pattern per commit (atomic commits)
- Benchmark numbers included in PR body
- All tests must pass

---

## Non-Negotiable Rules

1. **Measure before opining** — every claim requires a metric
2. **Rank all modules** — no cherry-picking complexity analysis
3. **Minimum intervention** — simplest pattern addressing root cause
4. **Benchmarks mandatory** — recommendations without data are opinions
5. **Tests sacred** — zero tolerance for coverage loss or test failure
6. **Git-aware** — analyze churn history for volatility signals
7. **Language-adaptive** — use language-specific complexity tools
8. **Branch-isolated** — all refactoring on dedicated `refactor/[issue#]-complexity-audit` branch
9. **Transparent** — print all commands, metrics, calculations
10. **PR is deliverable** — audit incomplete without draft PR
11. **Atomic commits** — one pattern per commit
12. **Proof over prose** — benchmark numbers in PR body

---

## Development Setup

### Dependencies

| Service | Address | Notes |
|---------|---------|-------|
| Redis | `localhost:6379` | Docker container |
| Postgres | `localhost:5432` | Docker container |

### Commands

```bash
# See README.md, backend/Makefile, and frontend/package.json for build, test, and dev commands
```

---

## Design Principles

- Simplicity is beauty, complexity is pain.
- _ALWAYS_ look at the current codebase first — achieve the goal in the **least amount of changes**.
- TDD-first: write tests before implementation.
- Fix the root cause, not the symptom.

---

## Acceptance Criteria

- [ ] Phase 1 ranking complete (`.audit/complexity_ranking.md`)
- [ ] Phase 2 recommendations (`.audit/pattern_recommendations.yaml`) with estimated deltas
- [ ] Phase 3 benchmark suite with baseline/current snapshots and PASS/FAIL report
- [ ] Phase 4 draft PR created with full benchmark data in body
- [ ] Test count ≥ baseline; pass rate = 100%
- [ ] `make test` (backend) and `npm run test` (frontend) both pass
- [ ] All refactoring follows existing repo patterns (BaseRepo, ServiceContext, etc.)
- [ ] No new dependencies added beyond what's already in the project (or justified in PR description)

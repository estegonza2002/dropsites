---
title: Documentation Index
owner: all
version: "1.0"
last_updated: 2026-03-27
---

# DropSites Documentation

> **Reading order for new contributors:** CLAUDE.md (root) → PRD → Design System → Components → Implementation Plan → Task Cards

## Document Map

| Document | Path | Owner | Purpose | Version |
|----------|------|-------|---------|---------|
| **Agent Operating Manual** | [`/CLAUDE.md`](../CLAUDE.md) | all | Root entry point for every agent/human session. Tech stack, architecture rules, current milestone. | 2.0 |
| **Product Requirements** | [`prd/PRD.md`](prd/PRD.md) | product | All functional requirements, NFRs, test surface, resource limits, deployment phases. | 2.0 |
| **Design System** | [`design/design-system.md`](design/design-system.md) | design | Colour tokens, typography, spacing, motion, enterprise theming, verification checklist. | 2.0 |
| **Component Specification** | [`design/components.md`](design/components.md) | design | 40+ component APIs — props, states, variants, accessibility, mobile behaviour. | 1.0 |
| **Implementation Plan** | [`implementation/PLAN.md`](implementation/PLAN.md) | engineering | Every phase, milestone, and task. 358 tasks across 61 milestones. | 1.0 |
| **Progress Tracker** | [`implementation/PROGRESS.md`](implementation/PROGRESS.md) | engineering | Session-by-session completion tracking. Updated after each work session. | 1.0 |
| **Task Cards** | [`implementation/TASK_CARDS.md`](implementation/TASK_CARDS.md) | engineering | 44 self-contained agent session prompts for Phase 1 (S01–S44). | 1.0 |
| **Feature Contract Schema** | [`feature-contracts/SCHEMA.md`](feature-contracts/SCHEMA.md) | engineering | YAML spec format for feature contracts. Five Lenses testing framework. | 1.0 |
| **Coverage Validator** | [`feature-contracts/COVERAGE-VALIDATOR.md`](feature-contracts/COVERAGE-VALIDATOR.md) | engineering | Automated validator spec for feature contract completeness. | 1.0 |

## Reference Artifacts

| File | Path | Purpose |
|------|------|---------|
| Marketing page (HTML) | [`reference/dropsites_marketing.html`](reference/dropsites_marketing.html) | Design reference for the marketing/landing page |
| App prototype (HTML) | [`reference/dropsites_prototype.html`](reference/dropsites_prototype.html) | Interactive prototype of dashboard and key flows |

## Directory Structure

```
docs/
  README.md                          ← this file (index)
  prd/
    PRD.md                           ← product requirements (authoritative)
  design/
    design-system.md                 ← tokens, colours, typography, motion, theming
    components.md                    ← component APIs and specs
  architecture/
    (reserved for system architecture, database, serving docs)
  implementation/
    PLAN.md                          ← full implementation plan
    PROGRESS.md                      ← session completion tracker
    TASK_CARDS.md                    ← agent session prompts
  feature-contracts/
    SCHEMA.md                        ← contract format spec
    COVERAGE-VALIDATOR.md            ← validator spec
    features/                        ← .yaml contracts (populated during implementation)
  milestones/
    (reserved for M1.md, M2.md, M3.md milestone gate docs)
  reference/
    dropsites_marketing.html         ← design reference
    dropsites_prototype.html         ← prototype reference
```

## Ownership Model

| Owner | Scope | Docs |
|-------|-------|------|
| **product** | What to build, why, for whom | PRD |
| **design** | How it looks, how it behaves | Design System, Components |
| **engineering** | How to build it, progress, validation | Plan, Progress, Task Cards, Feature Contracts |
| **all** | Cross-cutting guidance | CLAUDE.md, this index |

## Rules

1. **If a doc isn't in this index, it doesn't exist.** Add it here before creating it.
2. **One source of truth per concern.** If two docs disagree, the one with the higher `version` wins. If versions are equal, escalate — do not guess.
3. **Frontmatter is mandatory.** Every `.md` file in `docs/` must have YAML frontmatter with `title`, `owner`, `version`, `last_updated`, and `depends_on`.
4. **Update `last_updated` on every edit.** This is how staleness is detected.
5. **Internal links must be relative paths** from the doc's location. The doc link validator checks these on every commit.
6. **Reserved directories** (`architecture/`, `milestones/`) are placeholders for docs that will be created during implementation. Do not delete them.

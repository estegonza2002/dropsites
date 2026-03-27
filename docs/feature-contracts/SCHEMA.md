---
title: Feature Contract Schema
owner: engineering
version: "1.0"
last_updated: 2026-03-26
depends_on:
  - prd/PRD.md
---

# Feature Contract Schema — DropSites

**Version:** 1.0
**Date:** March 2026
**Status:** Active

---

## Overview

A feature contract is a YAML file that serves as the single authoritative specification for a DropSites feature. It replaces the traditional workflow where a product requirement document describes *what* to build, a separate implementation brief describes *how*, and a test plan describes *how to verify*. In DropSites, one YAML file does all three jobs simultaneously.

The PRD (`docs/PRD.md` / `DropSites_PRD_v2.0.md`) remains the narrative layer — it explains *why* DropSites exists, who the users are, and what the product strategy is. Feature contracts are the authoritative layer — they define *exactly what DropSites does*, scenario by scenario, with no ambiguity. When the PRD and a feature contract disagree on behaviour, the feature contract wins.

Every scenario in a feature contract maps one-to-one to a test case. The scenario's `id` field corresponds to a test ID in PRD Section 11. The `given`/`when`/`then` structure is directly translatable to a Vitest or Playwright test. This means the feature contract is simultaneously the test specification — writing the contract *is* writing the test plan.

Feature contracts are versioned in git alongside the code they describe. The git history of a feature file is the audit trail of every product decision made about that feature — when a boundary was changed, when a security scenario was added, when a behaviour was deprecated. No separate decision log is needed.

---

## File Naming & Location

All feature contract files live under the `features/` directory at the repository root. Files are organised by domain:

```
features/
  auth/
  limits/
  serving/
  upload/
  workspace/
  analytics/
  notifications/
  api/
  billing/
  editor/
  abuse/
  sharing/
  admin/
```

### Naming Rules

- **Format:** kebab-case, descriptive, no abbreviations.
- **Extension:** `.yaml` (not `.yml`).
- **One feature per file.** A feature may span multiple FRs but must represent a single cohesive capability.
- **No generic names.** `upload.yaml` is not acceptable. `upload-zip-extraction.yaml` is.

### Examples

```
features/auth/magic-link-auth.yaml
features/auth/google-oauth.yaml
features/auth/github-oauth.yaml
features/auth/session-management.yaml
features/limits/upload-size-enforcement.yaml
features/limits/bandwidth-enforcement.yaml
features/limits/deployment-count-enforcement.yaml
features/serving/password-protection.yaml
features/serving/auto-navigation-widget.yaml
features/serving/robots-header-control.yaml
features/upload/zip-extraction.yaml
features/upload/single-file-publish.yaml
features/workspace/member-invite.yaml
features/workspace/member-removal-handoff.yaml
features/analytics/view-event-recording.yaml
features/analytics/bot-filtering.yaml
features/notifications/bandwidth-quota-alerts.yaml
features/notifications/abuse-report-admin-alert.yaml
features/sharing/share-sheet.yaml
features/sharing/qr-code-generation.yaml
features/api/deployment-create.yaml
features/api/rate-limiting.yaml
features/billing/stripe-subscription.yaml
features/billing/failed-payment-dunning.yaml
features/editor/in-browser-edit.yaml
features/editor/conflict-resolution.yaml
features/abuse/posture-a-reactive.yaml
features/abuse/posture-b-scanning.yaml
features/admin/deployment-takedown.yaml
features/admin/account-suspension.yaml
```

---

## Top-Level Fields

Every feature contract file must contain the following top-level fields unless marked optional.

### `feature`

- **Type:** string
- **Required:** yes
- **Description:** A unique, human-readable name for the feature. Must match the filename (without extension) in title form.
- **Example:** `"ZIP Upload Extraction"`

### `version`

- **Type:** integer
- **Required:** yes
- **Description:** Monotonically incrementing version number. Starts at 1. Increments on any behaviour change (scenario added, modified, or removed). Schema-only changes (fixing a typo in a note) do not require a version bump.
- **Example:** `3`

### `status`

- **Type:** enum
- **Required:** yes
- **Allowed values:** `draft` | `active` | `deprecated` | `superseded`
- **Description:** Lifecycle state of the feature contract.
  - `draft` — under development, not yet implemented or tested.
  - `active` — implemented, tested, and live in production.
  - `deprecated` — scheduled for removal; still functional but no new development.
  - `superseded` — replaced by another feature contract; no longer the authoritative spec.
- **Example:** `active`

### `phase`

- **Type:** integer
- **Required:** yes
- **Allowed values:** `1`, `2`, or `3`
- **Description:** The delivery phase this feature belongs to, corresponding to the PRD delivery plan (Section 7).
- **Example:** `1`

### `milestone`

- **Type:** string
- **Required:** yes
- **Description:** The milestone this feature ships in. Must match the pattern `M{phase}.{n}` where `{phase}` matches the `phase` field and `{n}` is a positive integer. Valid milestones are M1.1–M1.25, M2.1–M2.31, and M3.1–M3.5.
- **Example:** `"M1.2"`

### `owner`

- **Type:** string
- **Required:** yes
- **Allowed values:** `auth-system` | `limit-profile-system` | `serving-layer` | `upload-system` | `workspace-system` | `analytics-system` | `notification-system` | `api-layer` | `billing-system` | `abuse-system` | `editor-system` | `sharing-system` | `admin-system`
- **Description:** The system domain that owns the primary implementation of this feature. Used for routing code review and identifying domain experts.
- **Example:** `"upload-system"`

### `frs`

- **Type:** list of strings
- **Required:** yes
- **Description:** The Functional Requirements from the PRD that this feature contract covers. Each entry must match the pattern `FR-{number}` where `{number}` is a valid FR ID from the PRD. A feature contract must reference at least one FR. An FR may appear in multiple feature contracts if the feature spans domains, but this should be flagged by the validator as a warning.
- **Example:**
  ```yaml
  frs:
    - FR-02
    - FR-03
    - FR-04
    - FR-199
  ```

### `description`

- **Type:** string (multi-line allowed)
- **Required:** yes
- **Description:** A plain-language summary of what this feature does, why it exists, and what user problem it solves. Must be at least two sentences. This is the first thing a developer reads — it should give them enough context to understand the scenarios that follow without reading the PRD.
- **Example:**
  ```yaml
  description: >
    When a user uploads a ZIP archive, DropSites extracts its contents and
    identifies the entry point HTML file. This enables publishing of multi-file
    static sites (React builds, multi-page HTML sites, JS apps with assets)
    through a single upload action. The extraction must handle malformed
    archives, path traversal attacks, and deeply nested directory structures
    without compromising the server or other deployments.
  ```

### `behaviour`

- **Type:** list of [Scenario](#scenario-structure) objects
- **Required:** yes
- **Description:** The complete set of behavioural scenarios for this feature, structured using the Five Lenses framework. Every scenario maps to a test case. This list must be non-empty and must satisfy the minimum coverage requirements defined in the [Coverage Requirements](#coverage-requirements) section.
- **Example:** See [Full Example](#full-example) below.

### `constraints`

- **Type:** list of strings
- **Required:** yes
- **Description:** Architectural constraints and invariants that the implementation must respect. These are rules that, if violated, would make the implementation incorrect regardless of whether the scenarios pass. Reference the architectural rules from CLAUDE.md where applicable.
- **Example:**
  ```yaml
  constraints:
    - "Uploaded source files are never modified — extraction writes to a clean deployment directory"
    - "All storage operations use the S3-compatible abstraction — no direct R2 SDK calls"
    - "File count and total size checked before extraction begins — fail fast, not mid-extraction"
    - "ZIP extraction runs in a sandboxed temp directory — never writes directly to the serving path"
  ```

### `implementation`

- **Type:** object
- **Required:** yes
- **Description:** Maps the feature to its implementation files in the Next.js project structure. Must contain at least one of `handler`, `api_route`, or `lib`. All file paths must follow the project structure conventions defined in CLAUDE.md.
- **Fields:**
  - `handler` (string, optional) — The Next.js route handler file.
  - `api_route` (string, optional) — The API route file if different from handler.
  - `lib` (string, optional) — The business logic module.
  - `component` (string, optional) — The UI component, if applicable.
  - `middleware` (string, optional) — Middleware file, if applicable.
  - `migration` (string, optional) — The Supabase migration file, if applicable.
- **Example:**
  ```yaml
  implementation:
    api_route: src/app/api/v1/deployments/route.ts
    lib: src/lib/upload/zip-extractor.ts
    component: src/components/app/upload-zone.tsx
    migration: supabase/migrations/003_deployment_files.sql
  ```

### `tests`

- **Type:** object
- **Required:** yes
- **Description:** Maps the feature to its test files. All three layers are required for every feature contract. File names must match the feature contract filename (kebab-case).
- **Fields:**
  - `unit` (string, required) — Path pattern: `tests/unit/{domain}/{feature}.test.ts`
  - `integration` (string, required) — Path pattern: `tests/integration/{domain}/{feature}.test.ts`
  - `e2e` (string, required) — Path pattern: `tests/e2e/{domain}/{feature}.spec.ts`
- **Example:**
  ```yaml
  tests:
    unit: tests/unit/upload/zip-extraction.test.ts
    integration: tests/integration/upload/zip-extraction.test.ts
    e2e: tests/e2e/upload/zip-extraction.spec.ts
  ```

### `ui` (optional)

- **Type:** object
- **Required:** no
- **Description:** UI-specific behaviour requirements beyond what the component spec in `docs/design-system.md` defines. Use this when the feature has unique UI states, transitions, or responsive behaviour that must be tested.
- **Fields:**
  - `states` (list of objects, optional) — UI state definitions with `name` and `description`.
  - `responsive` (object, optional) — Breakpoint-specific behaviour with keys `mobile` (375px), `tablet` (768px), `desktop` (1280px).
  - `accessibility` (list of strings, optional) — Feature-specific WCAG requirements beyond the baseline.
- **Example:**
  ```yaml
  ui:
    states:
      - name: extracting
        description: "Spinner with label 'Unpacking and deploying…' — replaces the progress bar after upload completes"
      - name: extraction-error
        description: "Red border, specific error message (e.g. 'No index.html found in ZIP'), retry button"
    responsive:
      mobile: "Upload zone uses tap-to-browse as primary action"
      desktop: "Drag-and-drop is the primary action, click-to-browse secondary"
    accessibility:
      - "Extraction progress announced via aria-live region"
      - "Error messages associated with upload zone via aria-describedby"
  ```

### `rls_policies` (optional)

- **Type:** list of objects
- **Required:** no
- **Description:** Supabase Row-Level Security policies required by this feature. Each policy object must have `table`, `operation` (SELECT | INSERT | UPDATE | DELETE), `policy_name`, and `rule` (the SQL predicate). Use this when the feature introduces or modifies RLS policies.
- **Example:**
  ```yaml
  rls_policies:
    - table: deployments
      operation: INSERT
      policy_name: publishers_can_create_deployments
      rule: >
        auth.uid() IN (
          SELECT user_id FROM workspace_members
          WHERE workspace_id = NEW.workspace_id
          AND role IN ('owner', 'publisher')
        )
  ```

### `roles` (optional)

- **Type:** object
- **Required:** no
- **Description:** A role-permission matrix defining which roles can perform which actions in this feature. Used to generate permission lens scenarios and validate completeness.
- **Fields:**
  - `actions` (list of strings) — The actions defined by this feature.
  - `matrix` (object) — Keys are role names, values are objects mapping action names to `allow` or `deny`.
- **Example:**
  ```yaml
  roles:
    actions:
      - upload_zip
      - view_extraction_status
      - retry_extraction
    matrix:
      owner:
        upload_zip: allow
        view_extraction_status: allow
        retry_extraction: allow
      publisher:
        upload_zip: allow
        view_extraction_status: allow
        retry_extraction: allow
      viewer:
        upload_zip: deny
        view_extraction_status: allow
        retry_extraction: deny
      non-member:
        upload_zip: deny
        view_extraction_status: deny
        retry_extraction: deny
      unauthenticated:
        upload_zip: deny
        view_extraction_status: deny
        retry_extraction: deny
  ```

### `tracking_strategy` (optional)

- **Type:** object
- **Required:** no
- **Description:** Defines how counters, aggregates, or time-series data are tracked for this feature. Use when the feature involves resource accounting (bandwidth, storage, view counts) or any numeric tracking that affects limit enforcement.
- **Fields:**
  - `counters` (list of objects, optional) — Each with `name`, `table`, `column`, `increment_on`, `reset_on`.
  - `aggregates` (list of objects, optional) — Each with `name`, `query`, `schedule`.
- **Example:**
  ```yaml
  tracking_strategy:
    counters:
      - name: deployment_storage_bytes
        table: deployments
        column: storage_bytes
        increment_on: "file extracted and written to storage"
        reset_on: "deployment deleted"
  ```

### `domain_rules` (optional)

- **Type:** list of strings
- **Required:** no
- **Description:** Business logic constraints that do not fit in `constraints` (which are architectural) or `behaviour` (which are scenario-based). These are rules like "ZIP files containing another ZIP are rejected" or "Maximum directory depth is 10 levels". Each rule should be a single, testable statement.
- **Example:**
  ```yaml
  domain_rules:
    - "Nested ZIP files are rejected — ZIPs within ZIPs are not extracted"
    - "Maximum directory depth after extraction is 10 levels"
    - "Maximum file count per ZIP is 1,000 files"
    - "Empty directories are not preserved after extraction"
    - "Symlinks within ZIP archives are ignored — not followed, not created"
    - "File permissions from the ZIP are discarded — all extracted files get standard read permissions"
  ```

### `supersedes` (optional)

- **Type:** string
- **Required:** no (required when `status` is `superseded` on the *new* file)
- **Description:** The path to the feature contract that this one replaces. Only present on the new feature contract, pointing back to the old one.
- **Example:** `"features/upload/zip-extraction-v1.yaml"`

---

## The Behaviour Block — Five Lenses

Every feature is analysed through five lenses. Together they produce a complete behavioural specification. Omitting any lens means the feature has blind spots that will surface as bugs in production.

### LENS 1 — Happy Path

**Tag:** `happy-path`

The simplest successful case. One user, one action, everything works. Every feature has **exactly one** happy path scenario. If you find yourself writing two happy paths, the feature is too broad — split it.

The happy path establishes the baseline expectation. Every other lens is a variation on "what if the happy path conditions aren't met?"

**Example:**
```yaml
- id: T-UPL-02
  lens: happy-path
  given: "Authenticated publisher with storage quota available"
  when: "POST /api/v1/deployments with a valid ZIP containing index.html at root"
  then:
    - "HTTP 201 returned with deployment URL"
    - "All files extracted to deployment storage directory"
    - "index.html served at the deployment URL"
    - "Deployment appears in publisher's dashboard list"
    - "storage_bytes on deployment record equals total extracted size"
  notes: "This is the core multi-file publish flow — the most common use case for ZIP uploads."
```

### LENS 2 — Boundary Conditions

**Tag:** `boundary`

Every numeric field, threshold, limit, or time value in a feature generates boundary scenarios. For each threshold, test three points:

1. **Exactly at the value** — the boundary itself.
2. **One unit below** — last value that should succeed (or last value in the "before" state).
3. **One unit above** — first value that should fail (or first value in the "after" state).

**Rules:**

- "One unit" means the smallest meaningful increment for that domain: 1 byte for file sizes, 1 second for time durations, 1 request for rate limits, 1 file for file counts.
- Both sides of every threshold must be tested. A boundary scenario that only tests "over the limit" is incomplete.
- Thresholds that trigger notifications need an additional scenario: the threshold is crossed again on the next event, and the notification must **not** re-fire. This prevents alert storms.
- If a feature has N numeric thresholds, it needs at minimum N × 2 boundary scenarios (at-limit and over-limit). The "under-limit" case is often covered by the happy path.

**Example:**
```yaml
- id: T-UPL-09
  lens: boundary
  given: "Publisher's deployment is exactly at the per-deployment size limit (25 MB on free profile)"
  when: "ZIP extraction completes with total extracted size = 25 MB exactly"
  then:
    - "Extraction succeeds"
    - "Deployment created with storage_bytes = 26214400"
  notes: "Boundary at exact limit — must succeed, not fail."

- id: T-UPL-10
  lens: boundary
  given: "Publisher's deployment would exceed per-deployment size limit by 1 byte"
  when: "ZIP extraction detects total extracted size = 25 MB + 1 byte"
  then:
    - "Extraction aborted before writing any files to serving path"
    - "HTTP 413 returned with message: 'Deployment size exceeds your plan limit of 25 MB'"
    - "No partial deployment created"
    - "No storage_bytes consumed"
  notes: "Boundary one byte over — must fail cleanly with no side effects."
```

### LENS 3 — Permission Matrix

**Tag:** `permission`

For every action in the feature, test every actor. The standard actor set is:

- `owner` — workspace owner
- `publisher` — workspace member with Publisher role
- `viewer` — workspace member with Viewer role
- `non-member` — authenticated user who is not a member of the workspace
- `unauthenticated` — no session token

For each actor × action combination:

- **Permitted actors:** scenario confirms the action succeeds with the expected outcome.
- **Forbidden actors (authenticated):** scenario confirms HTTP 403, zero side effects, and an audit log entry where applicable.
- **Forbidden actors (unauthenticated):** scenario confirms HTTP 401, zero side effects.

Every forbidden scenario must verify three things:
1. The correct HTTP status code (401 or 403).
2. Zero side effects — no writes to the database, no files created, no notifications sent.
3. An audit log entry where the action would normally be logged (failed permission attempts are security-relevant).

If the feature defines a `roles` block, the permission matrix in `roles.matrix` must have a corresponding scenario for every cell.

**Example:**
```yaml
- id: T-PERM-01
  lens: permission
  given: "Publisher is a member of workspace W with Publisher role"
  when: "POST /api/v1/deployments with workspace_id = W"
  then:
    - "HTTP 201 — deployment created"

- id: T-PERM-02
  lens: permission
  given: "Publisher is NOT a member of workspace W"
  when: "POST /api/v1/deployments with workspace_id = W"
  then:
    - "HTTP 403"
    - "NOT: deployment created"
    - "NOT: any file written to storage"

- id: T-PERM-06
  lens: permission
  given: "User has Viewer role in workspace W"
  when: "POST /api/v1/deployments with workspace_id = W"
  then:
    - "HTTP 403"
    - "NOT: deployment created"
```

### LENS 4 — Failure Modes

**Tag:** `failure`

Systematic questions to ask for every feature. Not every question will produce a scenario — but every question must be *asked*. If the answer is "not applicable", document why in a comment.

**EXTERNAL FAILURES:**
- What if Supabase is unreachable?
- What if R2 / storage write fails?
- What if Resend / Twilio fails to deliver a notification?
- What if an external API returns a malformed response?

**CONCURRENCY:**
- What if two users perform the same action simultaneously?
- What if a resource is modified while an operation is in flight?
- What if a counter is incremented by two processes at once?

**INTERRUPTION:**
- What if the connection drops mid-operation?
- What if the server restarts during processing?
- What if disk / storage fills up mid-write?

**UNEXPECTED STATE:**
- What if the resource was deleted between validation and action?
- What if the user's profile changed mid-request?
- What if a dependency record (workspace, deployment) no longer exists?

Every feature must have **at minimum 3** failure mode scenarios. Complex features (upload, serving, billing) will typically have 5–10.

**Example:**
```yaml
- id: T-UPL-12
  lens: failure
  given: "Publisher uploads a 20 MB ZIP"
  when: "Connection drops at 60% of extraction"
  then:
    - "No partial deployment created in serving path"
    - "Temporary extraction directory cleaned up within 60 seconds"
    - "No storage_bytes consumed on the user's quota"
    - "NOT: orphaned files in R2 bucket"
  notes: "Interruption mid-extraction — the system must be atomic. Either the full deployment exists or nothing does."

- id: T-UPL-16
  lens: failure
  given: "Publisher uploads a file that appears to be a ZIP (correct magic bytes) but is corrupt internally"
  when: "POST /api/v1/deployments with the corrupt ZIP"
  then:
    - "HTTP 422 with message: 'The uploaded ZIP archive is corrupt and cannot be extracted'"
    - "NOT: partial deployment created"
    - "NOT: crash or unhandled exception"
```

### LENS 5 — Security Attack Surface

**Tag:** `security`

Systematic questions to ask for every feature. Security scenarios are adversarial — they assume the caller is hostile.

**INPUT MANIPULATION:**
- Path traversal in any string field that becomes a file path.
- XSS in any string field that is rendered in HTML.
- SQL injection in any field used in a query.
- Type confusion (wrong MIME type, wrong file content despite correct extension).
- Oversized input (file, string, array beyond expected bounds).

**AUTHENTICATION BYPASS:**
- Valid token but wrong resource ownership.
- Expired token.
- Replayed token.
- Modified token payload.

**RATE LIMIT BYPASS:**
- Parallel requests sent before the rate limit counter updates.
- IP rotation to circumvent per-IP limits.
- Account rotation to circumvent per-account limits.

**INFORMATION LEAKAGE:**
- Error messages that reveal whether a resource exists.
- Timing attacks on comparison operations (e.g., password comparison).
- Response bodies that leak internal state (stack traces, file paths, database errors).

**RESOURCE EXHAUSTION:**
- Simultaneous requests at the quota boundary.
- Rapid resource creation (ZIP bomb, thousands of tiny files).
- Large payload arrays that consume memory.

Every feature must have **at minimum 2** security scenarios. Features that handle user input, file paths, or authentication will typically have 4–8.

**Example:**
```yaml
- id: T-UPL-07
  lens: security
  given: "Attacker uploads a ZIP containing a file named '../../etc/passwd'"
  when: "POST /api/v1/deployments with the malicious ZIP"
  then:
    - "HTTP 422 with message: 'ZIP contains invalid file paths'"
    - "NOT: any file written outside the deployment storage directory"
    - "NOT: crash or unhandled exception"
    - "Audit log entry: upload_rejected, reason: path_traversal"
  notes: "Classic zip-slip attack. The extractor must normalise all paths and reject any that escape the deployment root."

- id: T-UPL-11
  lens: security
  given: "Attacker uploads a file named 'script.js' whose actual content is a compiled ELF binary"
  when: "POST /api/v1/deployments with the disguised executable"
  then:
    - "HTTP 422 with message: 'File type validation failed — content does not match declared type'"
    - "NOT: file stored in deployment storage"
  notes: "MIME + magic byte check. Extension alone is not sufficient for type validation."
```

---

## Scenario Structure

Every scenario in the `behaviour` list is an object with the following fields:

### `id`

- **Type:** string
- **Required:** yes
- **Pattern:** `T-[A-Z]+-[0-9]+` (e.g., `T-UPL-07`, `T-PERM-16`, `T-SEC-03`)
- **Description:** Maps to a test ID in PRD Section 11. Must be unique across all feature files in the entire repository.

### `lens`

- **Type:** enum
- **Required:** yes
- **Allowed values:** `happy-path` | `boundary` | `permission` | `failure` | `security`
- **Description:** Which of the Five Lenses this scenario belongs to.

### `given`

- **Type:** string
- **Required:** yes
- **Description:** The precondition state, written in present tense. Describes the world *before* the action happens. Must be specific enough to reproduce in a test fixture.

### `when`

- **Type:** string
- **Required:** yes
- **Description:** The action taken. Must specify the HTTP method and endpoint for API actions, or the specific user interaction for UI actions. Vague descriptions like "the user uploads a file" are not acceptable — use "POST /api/v1/deployments with multipart/form-data containing a 10 MB ZIP".

### `then`

- **Type:** list of strings
- **Required:** yes (non-empty)
- **Description:** The expected outcomes. Each item is a single assertion.
  - Outcomes that **MUST happen** are written as plain statements: `"HTTP 201 returned with deployment URL"`
  - Outcomes that **must NOT happen** are prefixed with `"NOT:"`: `"NOT: partial deployment created"`
  - Include the HTTP status code where applicable.
  - Include database side effects where applicable: `"storage_bytes incremented by 26214400"`
  - Include notification side effects where applicable: `"Email sent to publisher with deployment URL"`
  - Include audit log effects where applicable: `"Audit log entry: action=upload_rejected"`

### `notes` (optional)

- **Type:** string
- **Required:** no
- **Description:** Implementation guidance or rationale for non-obvious behaviour. Explain *why* the system behaves this way if it would not be obvious to a developer reading the scenario for the first time. Notes are for humans — they do not affect test generation.

---

## Domain-Specific Optional Blocks

### When to Use `roles`

Use the `roles` block when the feature defines a role-permission matrix — i.e., the feature has actions that are permitted for some roles and forbidden for others. The `roles` block makes the matrix explicit and enables the validator to check that every cell in the matrix has a corresponding permission-lens scenario.

### When to Use `rls_policies`

Use the `rls_policies` block when the feature requires Supabase RLS SQL policies — either new policies or modifications to existing ones. The RLS policy SQL in this block is the authoritative spec; the migration file must implement exactly what is defined here.

### When to Use `tracking_strategy`

Use the `tracking_strategy` block when the feature involves counters, aggregates, or time-series data. This includes bandwidth tracking, storage usage accounting, view counts, rate limit counters, or any numeric value that is incremented, decremented, or reset as part of the feature's behaviour.

### When to Use `ui`

Use the `ui` block when the feature has specific UI behaviour requirements beyond what the component spec in `docs/design-system.md` and `docs/components.md` defines. This includes custom states (loading, error, empty), responsive behaviour differences between breakpoints, or feature-specific accessibility requirements.

### When to Use `domain_rules`

Use the `domain_rules` block when the feature has business logic constraints that do not fit cleanly into `constraints` (which are architectural) or into individual scenarios (which are test cases). Domain rules are standalone, testable statements about business logic — e.g., maximum file counts, forbidden file types, ordering rules.

---

## Coverage Requirements

Minimum scenario counts per feature, enforced by the validator:

| Lens | Minimum | Rule |
|---|---|---|
| `happy-path` | Exactly 1 | Every feature has one and only one happy path |
| `boundary` | ≥ 1 per numeric threshold | If the feature has N numeric thresholds in `description`, `domain_rules`, or `constraints`, minimum is N × 2 scenarios |
| `permission` | (actions × actors) cells covered | Every cell in the permission matrix must have a scenario. If `roles` block is defined, the matrix is explicit. Otherwise, the validator infers actions from the `when` fields |
| `failure` | ≥ 3 | Minimum three failure mode scenarios per feature |
| `security` | ≥ 2 | Minimum two security scenarios per feature |

**Total minimum per feature:** 8 scenarios. Most features will have 20–40 scenarios when all five lenses are applied thoroughly.

Features with fewer than 8 scenarios are flagged as `FAIL` by the validator — they are almost certainly missing coverage.

---

## Implementation & Tests Fields

### Implementation Block Rules

- Every referenced file path must be a real path in the Next.js project structure (the validator checks this).
- At least one of `handler`, `api_route`, or `lib` must be present.
- The `migration` field, when present, must point to a file under `supabase/migrations/`.
- The `component` field, when present, must point to a file under `src/components/`.
- No two feature contracts may claim the same implementation file for the same field (e.g., two features both listing `src/lib/upload/zip-extractor.ts` as their `lib`). Shared utilities are not listed in `implementation` — only the feature-specific entry points.

### Tests Block Rules

- All three layers (`unit`, `integration`, `e2e`) are required for every feature contract.
- File paths follow the convention:
  - `unit`: `tests/unit/{domain}/{feature}.test.ts`
  - `integration`: `tests/integration/{domain}/{feature}.test.ts`
  - `e2e`: `tests/e2e/{domain}/{feature}.spec.ts`
- Test file names must match the feature contract filename (kebab-case, same stem).
- No two feature contracts may claim the same test file.

---

## Versioning & Lifecycle

### Version Increments

The `version` field increments on any change to the `behaviour` block:
- Scenario added → version bump.
- Scenario modified (any field changed) → version bump.
- Scenario removed → version bump.
- `constraints` or `domain_rules` changed in a way that affects expected behaviour → version bump.

Changes that do **not** require a version bump: fixing typos in `notes`, updating `description` for clarity without changing meaning, adding optional metadata fields.

### Status Transitions

```
draft → active → deprecated
                → superseded
```

- `draft → active`: feature is implemented and all scenarios pass as tests.
- `active → deprecated`: feature is scheduled for removal. The feature file remains until the code is removed.
- `active → superseded`: a new feature contract replaces this one. The new contract includes a `supersedes` field pointing to this file.

There is no `deprecated → active` transition. If a deprecated feature is un-deprecated, create a new version.

### Breaking Changes

A breaking change is any behaviour modification that removes or restricts existing functionality — e.g., lowering a limit, removing a supported file type, tightening a permission. Breaking changes require:

1. A version bump.
2. A comment in the `notes` field of the affected scenario explaining the migration path for affected users.
3. A corresponding changelog entry (FR-295 through FR-298).

---

## Full Example

The following is a complete, correct feature contract for `upload-zip-extraction`. All five lenses are applied. Every field is populated. This is the reference implementation that all future feature contracts follow.

```yaml
feature: "ZIP Upload Extraction"
version: 1
status: active
phase: 1
milestone: "M1.2"
owner: upload-system

frs:
  - FR-02
  - FR-03
  - FR-04
  - FR-199

description: >
  When a user uploads a ZIP archive, DropSites extracts its contents, identifies
  the entry point HTML file, and creates a deployment serving the extracted files
  as a static site. This is the primary mechanism for publishing multi-file
  projects — React builds, multi-page HTML sites, JS apps with assets. The
  extraction must handle malformed archives, path traversal attacks, oversized
  payloads, and deeply nested directory structures without compromising the server
  or other deployments. Extraction is atomic: either the full deployment is created
  or nothing is — no partial state is ever visible to visitors.

behaviour:
  # ── LENS 1: Happy Path ────────────────────────────────────────────────
  - id: T-UPL-02
    lens: happy-path
    given: "Authenticated publisher with storage quota available in workspace W"
    when: "POST /api/v1/deployments with multipart/form-data containing a valid ZIP with index.html at root and 3 CSS/JS assets"
    then:
      - "HTTP 201 returned with deployment URL in response body"
      - "All 4 files extracted to deployment storage directory"
      - "index.html served at the deployment root URL with HTTP 200"
      - "CSS and JS assets served at their relative paths with correct MIME types"
      - "Deployment record created in database with correct storage_bytes"
      - "Deployment appears in publisher's dashboard list"
      - "Email notification sent to publisher with deployment URL"
    notes: "Core multi-file publish flow. The most common ZIP upload contains an index.html and a handful of assets."

  # ── LENS 2: Boundary Conditions ───────────────────────────────────────
  - id: T-UPL-09
    lens: boundary
    given: "Publisher on free profile (25 MB per-deployment limit). ZIP extracts to exactly 25 MB total."
    when: "POST /api/v1/deployments with the ZIP"
    then:
      - "Extraction succeeds"
      - "Deployment created with storage_bytes = 26214400"
    notes: "Exact boundary — 25 MB is the limit, not 25 MB minus 1."

  - id: T-UPL-10
    lens: boundary
    given: "Publisher on free profile. ZIP extracts to 25 MB + 1 byte total."
    when: "POST /api/v1/deployments with the ZIP"
    then:
      - "HTTP 413 returned with message: 'Deployment size (25.00 MB) exceeds your plan limit of 25 MB'"
      - "NOT: any files written to deployment storage"
      - "NOT: deployment record created"
      - "NOT: storage_bytes consumed on publisher's quota"
    notes: "One byte over — must fail cleanly with no side effects."

  - id: T-UPL-08
    lens: boundary
    given: "Publisher uploads a ZIP containing exactly 1,000 files (the maximum)"
    when: "POST /api/v1/deployments with the ZIP"
    then:
      - "Extraction succeeds"
      - "All 1,000 files extracted and served"

  - id: T-UPL-08b
    lens: boundary
    given: "Publisher uploads a ZIP containing 1,001 files"
    when: "POST /api/v1/deployments with the ZIP"
    then:
      - "HTTP 422 with message: 'ZIP contains 1,001 files — maximum is 1,000'"
      - "NOT: any files extracted"

  - id: T-UPL-03
    lens: boundary
    given: "Publisher uploads a ZIP with no index.html at root, but index.html nested in a single subdirectory"
    when: "POST /api/v1/deployments with the ZIP"
    then:
      - "Nested index.html detected and set as entry_path"
      - "Deployment serves correctly from the nested directory"
    notes: "Common pattern with framework builds that output to a dist/ or build/ directory."

  - id: T-UPL-04
    lens: boundary
    given: "Publisher uploads a ZIP with no index.html at any level, but a single .html file (report.html)"
    when: "POST /api/v1/deployments with the ZIP"
    then:
      - "report.html set as entry_path"
      - "Deployment serves report.html at root URL"
    notes: "FR-194 fallback: single HTML file becomes the entry point regardless of name."

  # ── LENS 3: Permission Matrix ─────────────────────────────────────────
  - id: T-PERM-01
    lens: permission
    given: "User has Owner role in workspace W"
    when: "POST /api/v1/deployments with a valid ZIP, workspace_id = W"
    then:
      - "HTTP 201 — deployment created"

  - id: T-PERM-01b
    lens: permission
    given: "User has Publisher role in workspace W"
    when: "POST /api/v1/deployments with a valid ZIP, workspace_id = W"
    then:
      - "HTTP 201 — deployment created"

  - id: T-PERM-06
    lens: permission
    given: "User has Viewer role in workspace W"
    when: "POST /api/v1/deployments with a valid ZIP, workspace_id = W"
    then:
      - "HTTP 403"
      - "NOT: deployment created"
      - "NOT: files written to storage"

  - id: T-PERM-02
    lens: permission
    given: "Authenticated user is NOT a member of workspace W"
    when: "POST /api/v1/deployments with a valid ZIP, workspace_id = W"
    then:
      - "HTTP 403"
      - "NOT: deployment created"
      - "NOT: files written to storage"

  - id: T-PERM-02b
    lens: permission
    given: "Request has no authentication token"
    when: "POST /api/v1/deployments with a valid ZIP"
    then:
      - "HTTP 401"
      - "NOT: deployment created"
      - "NOT: files written to storage"

  # ── LENS 4: Failure Modes ─────────────────────────────────────────────
  - id: T-UPL-16
    lens: failure
    given: "Publisher uploads a file that has .zip extension and correct ZIP magic bytes but is internally corrupt"
    when: "POST /api/v1/deployments with the corrupt ZIP"
    then:
      - "HTTP 422 with message: 'The uploaded ZIP archive is corrupt and cannot be extracted'"
      - "NOT: partial deployment created"
      - "NOT: crash or unhandled exception logged"
    notes: "Corrupt archives are surprisingly common — downloaded over flaky connections, truncated transfers."

  - id: T-UPL-12
    lens: failure
    given: "Publisher uploads a 20 MB ZIP. Server begins extraction."
    when: "Client connection drops at approximately 60% of extraction"
    then:
      - "No partial deployment visible at any URL"
      - "Temporary extraction directory cleaned up within 60 seconds"
      - "No storage_bytes consumed on the publisher's quota"
      - "NOT: orphaned files in storage bucket"
    notes: "Atomicity guarantee — extraction happens to a temp directory, then a single atomic move makes it live."

  - id: T-UPL-13
    lens: failure
    given: "Two publishers in the same workspace upload ZIPs simultaneously, both requesting the same custom slug"
    when: "Both POST /api/v1/deployments arrive within 50ms of each other"
    then:
      - "Exactly one request succeeds with HTTP 201"
      - "The other request fails with HTTP 409 Conflict"
      - "NOT: two deployments created with the same slug"
      - "NOT: data corruption in either deployment"
    notes: "Slug uniqueness enforced at database level via UNIQUE constraint — application code does not need a distributed lock."

  - id: T-UPL-12b
    lens: failure
    given: "Publisher uploads a valid ZIP. Storage backend (R2) returns a 503 during file write."
    when: "Extraction attempts to write the third of five files to storage"
    then:
      - "HTTP 502 returned to publisher with message: 'Storage temporarily unavailable — please retry'"
      - "NOT: partial deployment created"
      - "All previously written files for this extraction cleaned up"
      - "NOT: storage_bytes consumed on publisher's quota"
    notes: "Storage failure mid-write must trigger full rollback of the extraction."

  - id: T-UPL-12c
    lens: failure
    given: "Publisher's workspace is deleted by the workspace owner between the moment the upload is validated and the moment extraction begins"
    when: "Extraction attempts to write deployment record to database"
    then:
      - "HTTP 404 or 409 returned — workspace no longer exists"
      - "Extracted files cleaned up"
      - "NOT: orphaned deployment record"
    notes: "Race condition between workspace deletion and in-flight upload."

  # ── LENS 5: Security Attack Surface ───────────────────────────────────
  - id: T-UPL-07
    lens: security
    given: "Attacker uploads a ZIP containing a file named '../../etc/passwd'"
    when: "POST /api/v1/deployments with the malicious ZIP"
    then:
      - "HTTP 422 with message: 'ZIP contains invalid file paths'"
      - "NOT: any file written outside the deployment storage directory"
      - "NOT: any file written to the filesystem at all"
      - "Audit log entry: action=upload_rejected, reason=path_traversal"
    notes: "Classic zip-slip attack (CVE-2018-1002200). The extractor normalises all paths and rejects any that resolve outside the deployment root after normalisation."

  - id: T-UPL-11
    lens: security
    given: "Attacker uploads a file named 'app.js' whose actual content is a compiled ELF binary"
    when: "POST /api/v1/deployments with the disguised executable"
    then:
      - "HTTP 422 with message: 'File type validation failed — content does not match declared type'"
      - "NOT: file stored in deployment storage"
    notes: "MIME + magic byte check. Extension alone is not sufficient. The validator reads the first N bytes and compares against known signatures."

  - id: T-UPL-06
    lens: security
    given: "Attacker uploads a ZIP bomb — a 1 KB ZIP that expands to 10 GB"
    when: "POST /api/v1/deployments with the ZIP bomb"
    then:
      - "Extraction aborted when expanded size exceeds per-deployment limit"
      - "HTTP 413 returned with message: 'Deployment size exceeds your plan limit'"
      - "NOT: memory exhaustion or OOM kill on the server"
      - "NOT: disk space exhaustion"
      - "Extraction temp directory cleaned up"
    notes: "The extractor tracks cumulative extracted size during streaming extraction — it does not expand the full archive into memory. Abort threshold is the user's per-deployment limit from getProfile()."

  - id: T-UPL-20
    lens: security
    given: "A deployment was previously removed by admin for abuse. Attacker re-uploads the exact same content (byte-for-byte identical files)."
    when: "POST /api/v1/deployments with the previously-removed content"
    then:
      - "HTTP 403 with message: 'This content has been previously removed and cannot be re-uploaded'"
      - "NOT: deployment created"
      - "Matched by content hash registry (SHA-256)"
    notes: "FR-229 content hash registry. Every file's SHA-256 is checked against the blocked content hash list before the deployment is created."

constraints:
  - "Uploaded source files are never modified — extraction writes to a clean deployment directory"
  - "All storage operations use the S3-compatible abstraction — no direct R2 or Supabase Storage SDK calls"
  - "File count and total size checked during extraction (streaming) — fail fast, not after full expansion"
  - "ZIP extraction runs in a sandboxed temp directory — atomic move to serving path only on success"
  - "All limit checks call getProfile(userId) — no hardcoded size limits anywhere"

implementation:
  api_route: src/app/api/v1/deployments/route.ts
  lib: src/lib/upload/zip-extractor.ts
  component: src/components/app/upload-zone.tsx
  migration: supabase/migrations/003_deployments.sql

tests:
  unit: tests/unit/upload/zip-extraction.test.ts
  integration: tests/integration/upload/zip-extraction.test.ts
  e2e: tests/e2e/upload/zip-extraction.spec.ts

ui:
  states:
    - name: extracting
      description: "Spinner with label 'Unpacking and deploying…' — replaces the upload progress bar after upload completes"
    - name: extraction-error
      description: "Red border on upload zone, specific error message (e.g. 'No index.html found in ZIP'), retry button visible"
    - name: extraction-success
      description: "Green checkmark, deployment URL displayed prominently, copy-to-clipboard button highlighted"
  responsive:
    mobile: "Upload zone uses tap-to-browse as primary action; drag-and-drop still functional where supported"
    desktop: "Drag-and-drop is the primary action with dashed border visual; click-to-browse is secondary"
  accessibility:
    - "Extraction progress announced via aria-live='polite' region"
    - "Error messages associated with upload zone via aria-describedby"
    - "Success URL is focusable and announced to screen readers"

rls_policies:
  - table: deployments
    operation: INSERT
    policy_name: workspace_publishers_can_create
    rule: >
      auth.uid() IN (
        SELECT user_id FROM workspace_members
        WHERE workspace_id = NEW.workspace_id
        AND role IN ('owner', 'publisher')
        AND accepted_at IS NOT NULL
      )

roles:
  actions:
    - upload_zip
    - view_extraction_status
  matrix:
    owner:
      upload_zip: allow
      view_extraction_status: allow
    publisher:
      upload_zip: allow
      view_extraction_status: allow
    viewer:
      upload_zip: deny
      view_extraction_status: allow
    non-member:
      upload_zip: deny
      view_extraction_status: deny
    unauthenticated:
      upload_zip: deny
      view_extraction_status: deny

domain_rules:
  - "Nested ZIP files are rejected — ZIPs within ZIPs are not extracted"
  - "Maximum directory depth after extraction is 10 levels"
  - "Maximum file count per ZIP is 1,000 files"
  - "Empty directories are not preserved after extraction"
  - "Symlinks within ZIP archives are ignored — not followed, not created"
  - "File permissions from the ZIP are discarded — all extracted files get standard read permissions"
  - "Files named .DS_Store, Thumbs.db, and __MACOSX/ are silently excluded from extraction"
  - "The deployment entry_path is determined by: (1) index.html at root, (2) index.html in a single subdirectory, (3) the sole .html file if only one exists"

tracking_strategy:
  counters:
    - name: deployment_storage_bytes
      table: deployments
      column: storage_bytes
      increment_on: "successful extraction — sum of all extracted file sizes"
      reset_on: "deployment deleted or overwritten"
    - name: user_total_storage
      table: users
      column: computed
      increment_on: "SUM(storage_bytes) across all user's deployments — computed, not stored"
      reset_on: "recomputed on each upload and deletion"

# coverage-summary (auto-generated, do not edit)
# happy-path: 1
# boundary: 6
# permission: 5
# failure: 5
# security: 4
# total: 21
# validator: PASS
```

---
title: Feature Contract Coverage Validator
owner: engineering
version: "1.0"
last_updated: 2026-03-26
depends_on:
  - feature-contracts/SCHEMA.md
  - prd/PRD.md
---

# Feature Contract Coverage Validator — DropSites

**Version:** 1.0
**Date:** March 2026
**Status:** Active

---

## Purpose

The coverage validator is a TypeScript script that reads all feature contract YAML files, checks them against the schema defined in `SCHEMA.md`, and reports coverage gaps. Its job is to make missing scenarios, malformed contracts, and PRD coverage gaps a visible, reportable artefact — not a forgotten thought buried in a planning document.

Without the validator, coverage gaps are invisible until they manifest as bugs in production. A feature contract might look complete to a human reviewer but be missing boundary scenarios for a numeric threshold, or missing permission scenarios for the Viewer role. The validator catches these systematically.

The validator runs in three contexts:

1. **Manually** during development: `npx tsx scripts/validate-features.ts`
2. **In CI** on every PR that modifies a file in `features/` or the validator itself.
3. **As a pre-commit hook** (optional) for developers who want immediate feedback.

The validator is implemented as a single TypeScript file at:

```
scripts/validate-features.ts
```

---

## What the Validator Checks

### GROUP 1 — Schema Validation (every feature file)

For each `.yaml` file found under `features/`, the validator checks:

**Required top-level fields present:**
- `feature` (string, non-empty)
- `version` (integer, ≥ 1)
- `status` (enum: `draft` | `active` | `deprecated` | `superseded`)
- `phase` (integer: 1, 2, or 3)
- `milestone` (string, matches `M{phase}.{n}` pattern where phase matches the `phase` field)
- `owner` (string, one of the allowed owner values defined in SCHEMA.md)
- `frs` (list of strings, non-empty, each matching `FR-[0-9]+`)
- `description` (string, non-empty, at least 2 sentences — detected by counting period-terminated clauses)
- `behaviour` (list of scenario objects, non-empty)
- `constraints` (list of strings, non-empty)
- `implementation` (object with at least one of `handler`, `api_route`, or `lib`)
- `tests` (object with `unit`, `integration`, and `e2e` fields, all non-empty strings)

**Scenario validation (every item in `behaviour`):**
- `id` is present and matches the pattern `T-[A-Z]+-[0-9]+`
- `lens` is present and is one of: `happy-path`, `boundary`, `permission`, `failure`, `security`
- `given` is present and is a non-empty string
- `when` is present and is a non-empty string
- `then` is present and is a non-empty list of strings

**Implementation block validation:**
- If `handler` is present, path starts with `src/app/`
- If `api_route` is present, path starts with `src/app/api/`
- If `lib` is present, path starts with `src/lib/`
- If `component` is present, path starts with `src/components/`
- If `middleware` is present, path starts with `src/`
- If `migration` is present, path starts with `supabase/migrations/`

**Tests block validation:**
- `unit` matches pattern `tests/unit/{domain}/{name}.test.ts`
- `integration` matches pattern `tests/integration/{domain}/{name}.test.ts`
- `e2e` matches pattern `tests/e2e/{domain}/{name}.spec.ts`

**Optional block validation (when present):**
- `roles.actions` is a non-empty list of strings
- `roles.matrix` has entries for each action in `roles.actions`
- `rls_policies` entries have `table`, `operation`, `policy_name`, and `rule`
- `tracking_strategy.counters` entries have `name`, `table`, `column`, `increment_on`, `reset_on`
- `ui.states` entries have `name` and `description`

### GROUP 2 — Lens Coverage (every feature file)

For each feature file, the validator checks scenario coverage against the Five Lenses:

**Happy path:**
- Exactly 1 scenario with `lens: happy-path` must exist.
- Zero happy-path scenarios → `FAIL`.
- More than one happy-path scenario → `WARN` ("Feature may be too broad — consider splitting").

**Boundary:**
- At least 1 boundary scenario must exist.
- The validator scans `description`, `domain_rules`, and `constraints` for numeric patterns (digits followed by units like MB, GB, KB, bytes, seconds, minutes, hours, days, files, requests, req/s, req/min). Each distinct numeric threshold found should have at minimum 2 boundary scenarios (at-limit and over-limit).
- If boundary scenario count is less than (detected thresholds × 2), emit `WARN` with the specific thresholds that appear under-tested.

**Permission matrix:**
- The validator identifies all unique `when` action patterns across scenarios in the file.
- The validator identifies all unique actor types mentioned in `given` fields (owner, publisher, viewer, non-member, unauthenticated).
- If a `roles` block is defined, the validator uses `roles.actions` and `roles.matrix` keys as the authoritative action and actor lists.
- For every actor × action combination, the validator checks that at least one `permission` lens scenario exists with that actor and action.
- Missing cells → `FAIL` with a list of uncovered combinations.

**Failure modes:**
- At least 3 scenarios with `lens: failure` must exist.
- Fewer than 3 → `FAIL`.

**Security:**
- At least 2 scenarios with `lens: security` must exist.
- Fewer than 2 → `FAIL`.

**Total scenario count:**
- If total scenarios < 8, emit `WARN` ("Feature has unusually low scenario count — review for completeness").

### GROUP 3 — Cross-File Consistency

Across all feature files in the repository, the validator checks:

**Unique test IDs:**
- Every `id` field (T-XXX-NN) across all feature files must be globally unique.
- Duplicate IDs → `FAIL` with the duplicate ID and both file paths.

**FR references exist in PRD:**
- The validator extracts all FR IDs from the PRD file (by scanning for the pattern `FR-[0-9]+` in table rows).
- Every FR referenced in any feature file's `frs` list must exist in the PRD's FR list.
- Unknown FR → `FAIL` ("FR-999 referenced in features/upload/zip-extraction.yaml does not exist in PRD").

**Valid milestones:**
- Every `milestone` value must be one of the known milestones: M1.1–M1.25, M2.1–M2.31, M3.1–M3.5.
- Unknown milestone → `FAIL`.

**Unique implementation file paths:**
- For each implementation field (`handler`, `api_route`, `lib`, `component`, `middleware`, `migration`), no two feature files may claim the same path.
- Duplicate → `WARN` with both feature files and the shared path.

**Unique test file paths:**
- For each test field (`unit`, `integration`, `e2e`), no two feature files may claim the same path.
- Duplicate → `FAIL` with both feature files and the shared path.

### GROUP 4 — PRD Coverage

The validator checks that the feature contracts collectively cover the PRD:

1. Extract all FR IDs from the PRD by scanning for `| FR-{number} |` patterns in markdown tables.
2. Extract all FR IDs referenced across all feature files' `frs` lists.
3. Compute:
   - **Covered FRs:** FRs that appear in at least one feature file.
   - **Uncovered FRs:** FRs in the PRD that appear in no feature file.
   - **Coverage percentage:** `covered / total × 100`.
   - **Multi-covered FRs:** FRs that appear in more than one feature file (emit `WARN` for each — may indicate overlap or may be intentional cross-domain coverage).
4. If coverage percentage is below the `MINIMUM_FR_COVERAGE` threshold (default 80%), the overall result is `FAIL`.

### GROUP 5 — Milestone Coverage

For each milestone in the PRD delivery plan (Section 7) and milestone gate test map (Section 11.19):

1. Find all feature files that declare that milestone.
2. Extract the gate test IDs from the PRD's milestone gate test map (e.g., M1.2 maps to T-UPL-01 through T-UPL-17).
3. Check that every gate test ID appears as a scenario `id` in at least one of the feature files for that milestone.
4. Missing gate test → `FAIL` ("Milestone M1.6 gate test T-PERM-17 has no corresponding scenario in any feature file").

---

## Output Format

The validator produces structured terminal output with ANSI colour codes for readability.

### Summary Line

```
✓ N features checked. N passed. N failed. N warnings.
```

or

```
✗ N features checked. N passed. N failed. N warnings.
```

The overall exit code is:
- `0` if all checks pass (warnings present but `FAIL_ON_WARNINGS` is false).
- `1` if any `FAIL` result exists, or if `FAIL_ON_WARNINGS` is true and warnings exist.

### Per-File Results

Only files with failures or warnings are listed. Passing files are counted but not printed (to keep output scannable).

```
features/limits/upload-size-enforcement.yaml
  FAIL  Missing security scenarios (1 found, minimum 2)
  FAIL  Boundary scenarios missing for threshold: monthlyBandwidthGB (0 scenarios, expected ≥ 2)
  WARN  FR-155 also covered in features/limits/bandwidth-enforcement.yaml
```

Each line is prefixed with `FAIL` (red) or `WARN` (yellow).

### Coverage Summary

```
── FR Coverage ──────────────────────────────────────────────────
  Covered:   387 / 425 FRs (91.1%)
  Uncovered: FR-089, FR-091, FR-092, FR-278, FR-299, ...
  Multi-covered: FR-02 (upload/zip-extraction.yaml, upload/single-file-publish.yaml)
```

### Milestone Gate Coverage

```
── Milestone Gates ──────────────────────────────────────────────
  M1.1 ... M1.5: ✓ all gate tests covered
  M1.6: FAIL — gate test T-PERM-17 has no corresponding scenario
  M1.7 ... M2.17: ✓ all gate tests covered
  M2.18: FAIL — gate test T-SEC-14 has no corresponding scenario
  M2.19 ... M3.5: ✓ all gate tests covered
```

---

## Implementation Specification

### Dependencies

```json
{
  "js-yaml": "^4.1.0",
  "glob": "^10.0.0"
}
```

No other external dependencies. The script uses Node.js built-in `fs`, `path`, and `process` modules.

### TypeScript Interfaces

```typescript
/** Parsed YAML structure of a single feature contract file */
interface FeatureFile {
  filePath: string;               // Absolute path to the .yaml file
  feature: string;
  version: number;
  status: 'draft' | 'active' | 'deprecated' | 'superseded';
  phase: 1 | 2 | 3;
  milestone: string;
  owner: string;
  frs: string[];
  description: string;
  behaviour: Scenario[];
  constraints: string[];
  implementation: ImplementationBlock;
  tests: TestsBlock;
  ui?: UIBlock;
  rls_policies?: RLSPolicy[];
  roles?: RolesBlock;
  tracking_strategy?: TrackingStrategy;
  domain_rules?: string[];
  supersedes?: string;
}

/** A single behavioural scenario */
interface Scenario {
  id: string;
  lens: 'happy-path' | 'boundary' | 'permission' | 'failure' | 'security';
  given: string;
  when: string;
  then: string[];
  notes?: string;
}

/** Implementation file references */
interface ImplementationBlock {
  handler?: string;
  api_route?: string;
  lib?: string;
  component?: string;
  middleware?: string;
  migration?: string;
}

/** Test file references */
interface TestsBlock {
  unit: string;
  integration: string;
  e2e: string;
}

/** UI-specific behaviour */
interface UIBlock {
  states?: Array<{ name: string; description: string }>;
  responsive?: { mobile?: string; tablet?: string; desktop?: string };
  accessibility?: string[];
}

/** RLS policy definition */
interface RLSPolicy {
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  policy_name: string;
  rule: string;
}

/** Role-permission matrix */
interface RolesBlock {
  actions: string[];
  matrix: Record<string, Record<string, 'allow' | 'deny'>>;
}

/** Tracking counters and aggregates */
interface TrackingStrategy {
  counters?: Array<{
    name: string;
    table: string;
    column: string;
    increment_on: string;
    reset_on: string;
  }>;
  aggregates?: Array<{
    name: string;
    query: string;
    schedule: string;
  }>;
}

/** Result of a single validation check */
interface ValidationMessage {
  level: 'fail' | 'warn';
  message: string;
}

/** Result of validating a single feature file */
interface ValidationResult {
  filePath: string;
  messages: ValidationMessage[];
  passed: boolean;
}

/** FR coverage analysis */
interface CoverageResult {
  totalFRs: number;
  coveredFRs: string[];
  uncoveredFRs: string[];
  multiCoveredFRs: Array<{ fr: string; files: string[] }>;
  coveragePercent: number;
}

/** Permission matrix analysis for a single feature */
interface MatrixResult {
  actions: string[];
  actors: string[];
  coveredCells: Array<{ actor: string; action: string }>;
  missingCells: Array<{ actor: string; action: string }>;
}

/** Extracted PRD data */
interface PRD {
  frIds: string[];                // All FR-NNN IDs found in the PRD
  milestoneGates: Map<string, string[]>; // milestone -> list of gate test IDs
  validMilestones: string[];      // All valid milestone identifiers
}

/** Milestone gate coverage */
interface MilestoneGateResult {
  milestone: string;
  gateTests: string[];
  coveredTests: string[];
  missingTests: string[];
}
```

### Key Functions

#### `loadFeatureFiles(dir: string): FeatureFile[]`

- **Input:** Root directory to search (default: `features/`).
- **Output:** Array of parsed feature file objects.
- **Logic:**
  1. Use `glob` to find all `.yaml` files recursively under `dir`.
  2. For each file, read contents with `fs.readFileSync`.
  3. Parse YAML with `js-yaml`'s `load()` function.
  4. Attach the `filePath` to each parsed object.
  5. Return the array sorted by file path for deterministic output.
  6. If any file fails to parse (invalid YAML), log the error and include it in the results as a schema failure.

#### `validateSchema(file: FeatureFile): ValidationResult`

- **Input:** A single parsed feature file.
- **Output:** ValidationResult with schema-level messages.
- **Logic:**
  1. Check every required top-level field is present and has the correct type.
  2. Validate `status` is one of the allowed enum values.
  3. Validate `phase` is 1, 2, or 3.
  4. Validate `milestone` matches `M{phase}.{n}` where phase matches `file.phase`.
  5. Validate `owner` is one of the allowed owner values.
  6. Validate every item in `frs` matches `FR-[0-9]+`.
  7. Validate `description` has at least 2 sentences (heuristic: count occurrences of `. ` or `.\n`; minimum 1 period-terminated sentence boundary).
  8. Validate `behaviour` is non-empty.
  9. For each scenario in `behaviour`:
     - Check `id` matches `T-[A-Z]+-[0-9]+`.
     - Check `lens` is one of the five valid values.
     - Check `given`, `when` are non-empty strings.
     - Check `then` is a non-empty list.
  10. Validate `implementation` has at least one of `handler`, `api_route`, `lib`.
  11. Validate `tests` has `unit`, `integration`, `e2e` — all non-empty strings.
  12. Validate file path conventions for implementation and test fields.
  13. If `roles` is present, validate `actions` is non-empty and `matrix` keys match.
  14. If `rls_policies` is present, validate required fields on each entry.
  15. Return `passed: true` only if zero `fail`-level messages.

#### `validateLensCoverage(file: FeatureFile): ValidationResult`

- **Input:** A single parsed feature file.
- **Output:** ValidationResult with lens coverage messages.
- **Logic:**
  1. Count scenarios by lens tag.
  2. Happy path: must be exactly 1. Zero → FAIL. More than 1 → WARN.
  3. Boundary: must be ≥ 1. Scan `description`, `domain_rules`, `constraints` for numeric threshold patterns (regex: `\d+\s*(MB|GB|KB|bytes?|seconds?|minutes?|hours?|days?|files?|requests?|req\/s|req\/min)`). If detected thresholds × 2 > boundary count, emit WARN listing under-tested thresholds.
  4. Permission: call `buildPermissionMatrix(file)`. For each missing cell, emit FAIL.
  5. Failure: must be ≥ 3. Fewer → FAIL.
  6. Security: must be ≥ 2. Fewer → FAIL.
  7. Total < 8 → WARN.

#### `buildPermissionMatrix(file: FeatureFile): MatrixResult`

- **Input:** A single parsed feature file.
- **Output:** MatrixResult showing covered and missing actor × action cells.
- **Logic:**
  1. **Determine actions:**
     - If `roles.actions` exists, use that list.
     - Otherwise, extract unique action patterns from `when` fields of all scenarios. Group by HTTP method + endpoint base path.
  2. **Determine actors:**
     - If `roles.matrix` exists, use its keys.
     - Otherwise, use the standard set: `['owner', 'publisher', 'viewer', 'non-member', 'unauthenticated']`.
  3. **Determine covered cells:**
     - For each `permission` lens scenario, parse the `given` field to identify the actor (look for keywords: "Owner role", "Publisher role", "Viewer role", "NOT a member", "no authentication").
     - Parse the `when` field to identify the action.
     - Mark the cell as covered.
  4. **Compute missing cells:** All cells in the matrix not covered.
  5. Return the result.

#### `validateCrossFileConsistency(files: FeatureFile[]): ValidationResult`

- **Input:** All parsed feature files.
- **Output:** ValidationResult with cross-file consistency messages.
- **Logic:**
  1. **Unique test IDs:** Collect all scenario `id` values across all files. Detect duplicates. Each duplicate → FAIL.
  2. **Valid milestones:** Check each file's `milestone` against the known list (M1.1–M1.25, M2.1–M2.31, M3.1–M3.5). Unknown → FAIL.
  3. **Unique implementation paths:** For each implementation field type, collect all paths. Detect duplicates. Each duplicate → WARN.
  4. **Unique test paths:** For each test field type, collect all paths. Detect duplicates. Each duplicate → FAIL.

#### `validatePRDCoverage(files: FeatureFile[], prd: PRD): CoverageResult`

- **Input:** All parsed feature files and the extracted PRD data.
- **Output:** CoverageResult with FR coverage statistics.
- **Logic:**
  1. Collect all FR IDs from all feature files' `frs` fields into a `Set<string>`.
  2. Build a map: `FR-ID → list of feature files that reference it`.
  3. Covered FRs = intersection of PRD FR set and feature file FR set.
  4. Uncovered FRs = PRD FR set minus feature file FR set.
  5. Multi-covered FRs = FRs referenced by more than one feature file.
  6. Compute coverage percentage.

#### `validateMilestoneCoverage(files: FeatureFile[], prd: PRD): ValidationResult`

- **Input:** All parsed feature files and the extracted PRD data (including milestone gate test map).
- **Output:** ValidationResult with milestone gate coverage messages.
- **Logic:**
  1. For each milestone in `prd.milestoneGates`:
     - Find all feature files with that milestone.
     - Collect all scenario IDs from those feature files.
     - Check that every gate test ID from the PRD map exists in the collected scenario IDs.
     - Missing gate test → FAIL.

#### `extractPRDData(prdPath: string, milestonePaths: string[]): PRD`

- **Input:** Path to PRD file and paths to milestone docs.
- **Output:** Parsed PRD data.
- **Logic:**
  1. Read the PRD file.
  2. Extract FR IDs by scanning for `| FR-[0-9]+ |` patterns (markdown table cells).
  3. Extract milestone gate test map from PRD Section 11.19 by scanning for table rows that start with `| M{n}.{n}` and extracting T-XXX-NN patterns from the test suite column.
  4. Also scan milestone docs (M1.md, M2.md, M3.md) for additional gate test references.
  5. Build the valid milestones list from the delivery plan tables.

#### `generateReport(perFileResults: ValidationResult[], crossFileResult: ValidationResult, coverage: CoverageResult, milestoneResults: ValidationResult): string`

- **Input:** All validation results.
- **Output:** Formatted terminal output string with ANSI colour codes.
- **Logic:**
  1. Count total files, passed, failed, warnings.
  2. Print summary line (green checkmark or red X).
  3. For each file with failures or warnings, print the file path and its messages.
  4. Print FR coverage summary.
  5. Print milestone gate coverage summary.
  6. Return the formatted string.

### ANSI Colour Codes

```typescript
const ANSI = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
} as const;

function pass(msg: string): string { return `${ANSI.green}  ✓ PASS${ANSI.reset}  ${msg}`; }
function fail(msg: string): string { return `${ANSI.red}  ✗ FAIL${ANSI.reset}  ${msg}`; }
function warn(msg: string): string { return `${ANSI.yellow}  ⚠ WARN${ANSI.reset}  ${msg}`; }
```

### Main Entry Point

```typescript
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // Determine paths
  const featuresDir = args.singleFile
    ? path.dirname(args.singleFile)
    : 'features';
  const prdPath = findPRDFile(); // looks for docs/PRD.md or DropSites_PRD_v2.0.md
  const milestonePaths = glob.sync('docs/milestones/M*.md');

  // Load data
  const files = args.singleFile
    ? loadFeatureFiles(featuresDir).filter(f => f.filePath === args.singleFile)
    : loadFeatureFiles(featuresDir);
  const prd = extractPRDData(prdPath, milestonePaths);

  // Run validations
  const perFileResults: ValidationResult[] = [];

  for (const file of files) {
    const schemaResult = args.coverageOnly ? null : validateSchema(file);
    const lensResult = validateLensCoverage(file);
    const merged = mergeResults(file.filePath, [schemaResult, lensResult].filter(Boolean));
    perFileResults.push(merged);
  }

  let crossFileResult: ValidationResult | null = null;
  let coverage: CoverageResult | null = null;
  let milestoneResult: ValidationResult | null = null;

  if (!args.singleFile) {
    crossFileResult = validateCrossFileConsistency(files);
    coverage = validatePRDCoverage(files, prd);
    milestoneResult = validateMilestoneCoverage(files, prd);
  }

  // Filter by lens if requested
  if (args.lens) {
    // Only show results related to the specified lens
    for (const result of perFileResults) {
      result.messages = result.messages.filter(m =>
        m.message.toLowerCase().includes(args.lens!)
      );
    }
  }

  // Generate output
  const report = args.json
    ? JSON.stringify({ perFileResults, crossFileResult, coverage, milestoneResult }, null, 2)
    : generateReport(perFileResults, crossFileResult, coverage, milestoneResult);

  console.log(report);

  // Determine exit code
  const hasFailures = perFileResults.some(r => !r.passed)
    || (crossFileResult && !crossFileResult.passed)
    || (milestoneResult && !milestoneResult.passed)
    || (coverage && coverage.coveragePercent < getMinCoverage());

  const hasWarnings = perFileResults.some(r =>
    r.messages.some(m => m.level === 'warn')
  );

  if (hasFailures || (getFailOnWarnings() && hasWarnings)) {
    process.exit(1);
  }
  process.exit(0);
}
```

### CLI Argument Parsing

```typescript
interface CLIArgs {
  singleFile?: string;      // Path to a single feature file
  coverageOnly: boolean;    // --coverage-only flag
  lens?: string;            // --lens <lens-name>
  json: boolean;            // --json flag
}

function parseArgs(argv: string[]): CLIArgs {
  const args: CLIArgs = { coverageOnly: false, json: false };

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--coverage-only') {
      args.coverageOnly = true;
    } else if (argv[i] === '--lens' && argv[i + 1]) {
      args.lens = argv[++i];
    } else if (argv[i] === '--json') {
      args.json = true;
    } else if (argv[i].endsWith('.yaml')) {
      args.singleFile = argv[i];
    }
  }

  return args;
}
```

### Environment Variable Helpers

```typescript
function getFailOnWarnings(): boolean {
  return process.env.FAIL_ON_WARNINGS === 'true';
}

function getMinCoverage(): number {
  const val = process.env.MINIMUM_FR_COVERAGE;
  return val ? parseInt(val, 10) : 80;
}

function getStrictPermissionMatrix(): boolean {
  const val = process.env.STRICT_PERMISSION_MATRIX;
  return val !== 'false'; // default true
}
```

---

## CI Integration

### GitHub Actions Workflow Step

```yaml
- name: Validate feature contracts
  run: npx tsx scripts/validate-features.ts
  working-directory: .
  env:
    FAIL_ON_WARNINGS: "false"
    MINIMUM_FR_COVERAGE: "80"
    STRICT_PERMISSION_MATRIX: "true"
```

### Trigger Condition

The validation step should run on every PR that modifies files in the `features/` directory or the validator script itself. Add this to the workflow's `on` block:

```yaml
on:
  pull_request:
    paths:
      - 'features/**'
      - 'scripts/validate-features.ts'
      - 'docs/feature-contracts/**'
```

### Environment Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `FAIL_ON_WARNINGS` | boolean string | `"false"` | If `"true"`, warnings also cause a non-zero exit code and fail CI. Useful for stricter enforcement in later phases. |
| `MINIMUM_FR_COVERAGE` | integer string | `"80"` | The minimum FR coverage percentage. If coverage falls below this value, CI fails. Set to `"0"` to disable. |
| `STRICT_PERMISSION_MATRIX` | boolean string | `"true"` | If `"true"`, every actor × action cell in the permission matrix must have a scenario. If `"false"`, the validator only warns on missing cells instead of failing. |

---

## Running Locally

### Check all features

```bash
npx tsx scripts/validate-features.ts
```

Reads all `.yaml` files under `features/`, runs all five validation groups, and prints the full report.

### Check a single feature file

```bash
npx tsx scripts/validate-features.ts features/limits/upload-size-enforcement.yaml
```

Runs Groups 1 and 2 (schema validation and lens coverage) on the specified file only. Cross-file consistency, PRD coverage, and milestone coverage are skipped (they require all files).

### Check coverage only (skip schema validation)

```bash
npx tsx scripts/validate-features.ts --coverage-only
```

Skips Group 1 (schema validation) and only checks lens coverage, cross-file consistency, PRD coverage, and milestone coverage. Useful when you only care about whether the feature contracts collectively cover the PRD.

### Check a specific lens

```bash
npx tsx scripts/validate-features.ts --lens security
```

Runs all validations but filters output to only show messages related to the specified lens. Useful for reviewing coverage for a specific lens across all features.

### Output as JSON (for tooling)

```bash
npx tsx scripts/validate-features.ts --json
```

Outputs the complete validation result as a JSON object instead of formatted terminal output. Useful for integration with other tools, dashboards, or CI artefact storage.

### Combine flags

```bash
npx tsx scripts/validate-features.ts --lens boundary --json
npx tsx scripts/validate-features.ts features/upload/zip-extraction.yaml --json
```

---

## Integration with CoWork

When CoWork (Claude in Cowork mode) writes a new feature contract, it must follow this protocol:

1. **Read `SCHEMA.md`** before writing any feature contract YAML.
2. **Apply all five lenses** to the feature before producing the `behaviour` block.
3. **Produce a behaviour block that would pass the validator.** This means:
   - Exactly 1 happy-path scenario.
   - Boundary scenarios for every numeric threshold (at minimum threshold × 2).
   - Permission scenarios for every actor × action cell.
   - At least 3 failure scenarios.
   - At least 2 security scenarios.
4. **Include a coverage summary comment** at the end of the file:

```yaml
# coverage-summary (auto-generated, do not edit)
# happy-path: 1
# boundary: 4
# permission: 12
# failure: 5
# security: 3
# total: 25
# validator: PASS
```

CoWork generates this summary by counting its own scenarios by lens tag before outputting the file. If the counts would fail the validator's minimum requirements, CoWork must add the missing scenarios before outputting the file — it does not output a file it knows will fail.

The `# validator: PASS` line is CoWork's self-assessment. The actual validator must still be run to confirm, because CoWork cannot check cross-file consistency or PRD coverage without access to the full feature file set.

---

## Example Validator Output

The following shows the exact terminal output for a project with 8 feature files. Six pass completely, one fails schema validation, and one fails coverage. There is also an FR coverage gap and a milestone gate gap.

```
\x1b[1m── DropSites Feature Contract Validator ──────────────────────────\x1b[0m

Scanning features/ ...
Found 8 feature files.

\x1b[32m  ✓ PASS\x1b[0m  features/auth/magic-link-auth.yaml
\x1b[32m  ✓ PASS\x1b[0m  features/auth/google-oauth.yaml
\x1b[32m  ✓ PASS\x1b[0m  features/serving/password-protection.yaml
\x1b[32m  ✓ PASS\x1b[0m  features/upload/zip-extraction.yaml
\x1b[32m  ✓ PASS\x1b[0m  features/upload/single-file-publish.yaml
\x1b[32m  ✓ PASS\x1b[0m  features/workspace/member-invite.yaml

features/limits/upload-size-enforcement.yaml
\x1b[31m  ✗ FAIL\x1b[0m  Missing security scenarios (1 found, minimum 2)
\x1b[31m  ✗ FAIL\x1b[0m  Boundary scenarios missing for threshold: monthlyBandwidthGB (0 scenarios, expected ≥ 2)
\x1b[33m  ⚠ WARN\x1b[0m  FR-155 also covered in features/limits/bandwidth-enforcement.yaml

features/analytics/bot-filtering.yaml
\x1b[31m  ✗ FAIL\x1b[0m  FR-999 referenced in frs list does not exist in PRD

\x1b[1m── Cross-File Consistency ────────────────────────────────────────\x1b[0m
\x1b[32m  ✓\x1b[0m  All test IDs unique across files
\x1b[32m  ✓\x1b[0m  All milestones valid
\x1b[32m  ✓\x1b[0m  No duplicate implementation file paths
\x1b[32m  ✓\x1b[0m  No duplicate test file paths

\x1b[1m── FR Coverage ───────────────────────────────────────────────────\x1b[0m
  Covered:      387 / 425 FRs (\x1b[32m91.1%\x1b[0m)
  Uncovered:    FR-089, FR-091, FR-092, FR-095, FR-127, FR-128,
                FR-161, FR-167, FR-182, FR-184, FR-203, FR-215,
                FR-246, FR-249, FR-250, FR-270, FR-271, FR-277,
                FR-278, FR-292, FR-294, FR-297, FR-299, FR-304,
                FR-320, FR-344, FR-365, FR-371, FR-387, FR-388,
                FR-392, FR-396, FR-397, FR-399, FR-415, FR-421,
                FR-422, FR-425
  Multi-covered:
\x1b[33m  ⚠ WARN\x1b[0m  FR-155 covered by: features/limits/upload-size-enforcement.yaml,
                features/limits/bandwidth-enforcement.yaml
\x1b[33m  ⚠ WARN\x1b[0m  FR-02 covered by: features/upload/zip-extraction.yaml,
                features/upload/single-file-publish.yaml

\x1b[1m── Milestone Gates ───────────────────────────────────────────────\x1b[0m
  M1.1 – M1.5:   \x1b[32m✓\x1b[0m all gate tests covered
  M1.6:           \x1b[31m✗ FAIL\x1b[0m gate test T-PERM-17 has no corresponding scenario
  M1.7 – M2.17:  \x1b[32m✓\x1b[0m all gate tests covered
  M2.18:          \x1b[31m✗ FAIL\x1b[0m gate test T-SEC-14 has no corresponding scenario
  M2.19 – M3.5:  \x1b[32m✓\x1b[0m all gate tests covered

\x1b[1m── Summary ───────────────────────────────────────────────────────\x1b[0m
\x1b[31m✗ 8 features checked. 6 passed. 2 failed. 3 warnings.\x1b[0m
```

In this example:
- The exit code is `1` because there are FAIL results.
- `upload-size-enforcement.yaml` fails because it has only 1 security scenario (minimum 2) and is missing boundary scenarios for a detected threshold.
- `bot-filtering.yaml` fails because it references FR-999 which does not exist in the PRD.
- The FR coverage is 91.1% which is above the 80% default threshold, so this alone would not fail.
- Two milestone gate tests (T-PERM-17 for M1.6 and T-SEC-14 for M2.18) have no corresponding scenarios in any feature file, so these fail.
- Three warnings are emitted for multi-covered FRs — these are informational, not failures (unless `FAIL_ON_WARNINGS=true`).

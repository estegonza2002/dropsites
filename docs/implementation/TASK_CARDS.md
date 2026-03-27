---
title: Agent Task Cards (Phase 1)
owner: engineering
version: "1.0"
last_updated: 2026-03-26
depends_on:
  - implementation/PLAN.md
  - prd/PRD.md
---

# DropSites — Agent Task Cards (Phase 1)

> Each card is a self-contained prompt for a single agent session.
> Copy-paste the card into a new Cursor agent chat. The agent will read the Cursor rule automatically and use these instructions to build the specified piece.

## How to Use

1. Open `PROGRESS.md` — find the next unchecked session ID (e.g. `S01`).
2. Copy the corresponding card below (everything between the `---` separators).
3. Paste it into a new Cursor Agent chat.
4. When the agent finishes, verify the gate condition, then mark it `[x]` in `PROGRESS.md`.

---

## S01 — Project Initialization

**Milestone:** M1.1 (Foundation)
**Depends on:** Nothing (first session)

### What to Build

Initialize the DropSites project from scratch in the current directory.

1. Run `pnpm create next-app@latest . --typescript --tailwind --eslint --app --src=false --import-alias "@/*"` (accept defaults, use the current directory)
2. Install core dependencies:
   - `pnpm add @supabase/supabase-js @supabase/ssr zod lucide-react date-fns`
   - `pnpm add -D vitest @vitejs/plugin-react playwright @playwright/test prettier eslint-config-prettier`
3. Initialize shadcn/ui: `pnpm dlx shadcn@latest init` — choose New York style, Zinc color, CSS variables
4. Install initial shadcn components: `pnpm dlx shadcn@latest add button card sonner`
5. Configure Geist font (install `geist` package, configure in `app/layout.tsx`)
6. Create config files:
   - `.prettierrc` with `{ "semi": false, "singleQuote": true, "tabWidth": 2, "trailingComma": "es5" }`
   - `vitest.config.ts` with path aliases matching tsconfig
   - `playwright.config.ts` with base URL `http://localhost:3000`
7. Create `.env.example` with ALL environment variables from `IMPLEMENTATION_PLAN.md` Section 4 (with placeholder values and comments)
8. Create `.env.local` with Supabase local dev defaults (copy from .env.example, fill in local values), add to `.gitignore`
9. Update `tsconfig.json`: enable `strict: true`, add path alias `@/*` -> `./*`
10. Create initial directory structure (empty directories with `.gitkeep`):
    - `lib/supabase/`, `lib/storage/`, `lib/upload/`, `lib/slug/`, `lib/limits/`, `lib/serving/`, `lib/auth/`, `lib/notifications/`, `lib/webhooks/`, `lib/analytics/`, `lib/health/`, `lib/qr/`, `lib/audit/`, `lib/errors/`, `lib/utils/`, `lib/config/`
    - `components/layout/`, `components/upload/`, `components/deployments/`, `components/share/`, `components/editor/`, `components/analytics/`, `components/workspace/`, `components/auth/`, `components/admin/`, `components/notifications/`, `components/settings/`, `components/onboarding/`, `components/serving/`, `components/support/`, `components/common/`
    - `tests/unit/`, `tests/integration/`, `tests/e2e/`, `tests/performance/`, `tests/security/`, `tests/fixtures/`, `tests/helpers/`
    - `supabase/migrations/`, `supabase/functions/`
    - `scripts/`, `docs/`, `public/`

### Gate

- `pnpm dev` starts without errors
- `pnpm build` succeeds
- Project structure matches `IMPLEMENTATION_PLAN.md` Section 1 (directories exist)
- `.env.example` contains all variables from Section 4

### Files Created/Modified

`package.json`, `tsconfig.json`, `.prettierrc`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`, `.env.local`, `.gitignore`, `app/layout.tsx`, `app/globals.css`, `components.json`, `tailwind.config.ts`, `postcss.config.mjs`, plus directory stubs

---

## S02 — Supabase Schema + Docker

**Milestone:** M1.1 (Foundation)
**Depends on:** S01

### What to Build

Create all Supabase migration files and the Docker infrastructure.

1. Read `IMPLEMENTATION_PLAN.md` Section 2 (Supabase Schema) for the complete table definitions.
2. Create all 27 migration files in `supabase/migrations/`:
   - `00001_create_users.sql` through `00027_seed_limit_profiles.sql`
   - Each migration creates one table with all columns, types, constraints, and indexes exactly as specified in Section 2
   - `00025_create_indexes.sql` — any cross-table indexes
   - `00026_create_rls_policies.sql` — enable RLS on all tables, create the 11 policy groups from Section 2
   - `00027_seed_limit_profiles.sql` — INSERT free/pro/team/enterprise profiles with reasonable defaults
3. Create `supabase/config.toml` for Supabase CLI local dev
4. Create `supabase/seed.sql` with test data (1 admin user, 1 workspace, 1 sample deployment record)
5. Create `Dockerfile`:
   - Multi-stage build: deps stage (pnpm install), build stage (next build), runner stage (next start)
   - Base image: `node:20-alpine`
   - Expose port 3000
6. Create `docker-compose.yml`:
   - Service `app` from Dockerfile
   - Use Supabase CLI for local Supabase (or reference `supabase start` in docs)
   - Environment variables from `.env.local`

### Schema Reference

Read Section 2 of `IMPLEMENTATION_PLAN.md` for exact column definitions. Tables to create:
`users`, `workspaces`, `workspace_members`, `deployments`, `deployment_versions`, `deployment_files`, `analytics_events`, `audit_log`, `bandwidth_daily`, `access_tokens`, `api_keys`, `abuse_reports`, `content_hashes`, `webhook_endpoints`, `webhook_deliveries`, `notification_log`, `limit_profiles`, `editor_locks`, `cookie_consents`, `slug_redirects`, `custom_domains`, `bot_filters`, `changelog_entries`

### Gate

- `docker compose build` succeeds
- All migration SQL files are syntactically valid
- Limit profiles seed has free/pro/team/enterprise rows

### Files Created

`supabase/config.toml`, `supabase/seed.sql`, `supabase/migrations/00001_create_users.sql` through `00027_seed_limit_profiles.sql`, `Dockerfile`, `docker-compose.yml`

---

## S03 — Health Endpoint + Sentry + Root Layout

**Milestone:** M1.1 (Foundation)
**Depends on:** S01, S02

### What to Build

1. Create `lib/config/env.ts`:
   - Use zod to validate all required env vars at import time
   - Export typed `env` object
   - Throw descriptive error on missing required vars
2. Create `lib/config/constants.ts`:
   - Reserved slugs: `['api', 'health', 'admin', 'dashboard', 'login', 'signup', 'settings', 'p', 's', 'invite', 'changelog', 'dmca', 'terms', 'privacy', 'cookies', 'pricing', 'acceptable-use', 'status', '_system']`
3. Create `lib/supabase/client.ts` — browser client using `createBrowserClient`
4. Create `lib/supabase/server.ts` — server client using `createServerClient` with cookie handling
5. Create `lib/supabase/admin.ts` — service-role client for admin operations
6. Create `lib/supabase/middleware.ts` — middleware-compatible client
7. Create `lib/errors/index.ts`:
   - Export error classes: `AppError`, `NotFoundError`, `ForbiddenError`, `ValidationError`, `RateLimitError`, `StorageError`
   - Each has `statusCode`, `code`, `message`
8. Create `lib/errors/handler.ts`:
   - Centralized error handler that returns JSON `{ error, code }` — never stack traces in production
9. Create `app/api/health/route.ts`:
   - GET handler returning `{ status: "healthy", timestamp, version, services: { database, storage } }`
   - Check DB connectivity (simple query), check storage (HEAD request to R2 bucket)
   - Return 200 if all healthy, 503 if any service is down
10. Configure Sentry:
    - Install `@sentry/nextjs`
    - Create `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
    - Wire into `next.config.ts` via `withSentryConfig`
11. Update `app/layout.tsx`:
    - Geist Sans + Geist Mono fonts
    - Sonner `<Toaster>` provider
    - Basic HTML metadata
12. Create `app/(marketing)/layout.tsx` — simple centered layout with header/footer placeholders
13. Create `app/(marketing)/page.tsx` — landing page shell with hero section placeholder and "Upload your site" CTA

### Gate

- `GET /api/health` returns JSON with status field
- Sentry config files exist and `next.config.ts` wraps with Sentry
- Root layout renders with Geist font
- Marketing page renders at `/`

### Files Created

`lib/config/env.ts`, `lib/config/constants.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`, `lib/supabase/middleware.ts`, `lib/errors/index.ts`, `lib/errors/handler.ts`, `app/api/health/route.ts`, `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `app/(marketing)/layout.tsx`, `app/(marketing)/page.tsx`

---

## S04 — S3 Storage Client + Abstraction

**Milestone:** M1.2 (Upload + Serving)
**Depends on:** S03

### What to Build

1. Install `@aws-sdk/client-s3` and `@aws-sdk/lib-storage`
2. Create `lib/storage/s3-client.ts`:
   - Initialize S3Client with R2 endpoint, credentials, and region from env
   - Export functions:
     - `uploadObject(bucket: string, key: string, body: Buffer | ReadableStream, contentType: string): Promise<void>`
     - `getObject(bucket: string, key: string): Promise<{ body: ReadableStream, contentType: string, contentLength: number }>`
     - `deleteObject(bucket: string, key: string): Promise<void>`
     - `deletePrefix(bucket: string, prefix: string): Promise<void>` (batch delete all objects under prefix)
     - `objectExists(bucket: string, key: string): Promise<boolean>`
     - `listObjects(bucket: string, prefix: string): Promise<string[]>`
3. Create `lib/storage/index.ts`:
   - Read `STORAGE_BACKEND` env var (default: `r2`)
   - Export a `storage` singleton that delegates to the appropriate backend
   - For now, only implement the `r2`/`s3` backend (they use the same S3-compatible protocol)
   - Define a `StorageBackend` type interface matching the functions above
4. Create `tests/unit/storage/s3-client.test.ts`:
   - Unit tests that mock the AWS SDK
   - Test: upload sets correct Content-Type, delete removes object, list returns keys, deletePrefix batch-deletes

### Interface Contract

```typescript
type StorageBackend = {
  upload(bucket: string, key: string, body: Buffer | ReadableStream, contentType: string): Promise<void>
  get(bucket: string, key: string): Promise<{ body: ReadableStream; contentType: string; contentLength: number }>
  delete(bucket: string, key: string): Promise<void>
  deletePrefix(bucket: string, prefix: string): Promise<void>
  exists(bucket: string, key: string): Promise<boolean>
  list(bucket: string, prefix: string): Promise<string[]>
}
```

### Gate

- Unit tests pass: `pnpm vitest run tests/unit/storage/`
- TypeScript compiles without errors
- `storage` export is a valid `StorageBackend` instance

### Files Created

`lib/storage/s3-client.ts`, `lib/storage/index.ts`, `tests/unit/storage/s3-client.test.ts`

---

## S05 — MIME, Validation, ZIP, Entry Point

**Milestone:** M1.2 (Upload + Serving)
**Depends on:** S04

### What to Build

1. Create `lib/upload/mime.ts`:
   - Export `MIME_MAP: Record<string, string>` mapping file extensions to MIME types
   - Must include: `.html`, `.htm`, `.css`, `.js`, `.mjs`, `.json`, `.xml`, `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.ico`, `.woff`, `.woff2`, `.ttf`, `.otf`, `.eot`, `.pdf`, `.wasm`, `.mp4`, `.webm`, `.mp3`, `.ogg`, `.wav`, `.txt`, `.csv`, `.md`, `.map`, `.avif`
   - Export `getMimeType(filename: string): string` — returns MIME type or `application/octet-stream` as fallback
   - Export `isAllowedFileType(filename: string): boolean` — reject `.exe`, `.sh`, `.bat`, `.cmd`, `.ps1`, `.msi`, `.dll`, `.so`, `.dylib`, server-side scripts (`.php`, `.py`, `.rb`, `.pl`, `.cgi`, `.asp`, `.aspx`, `.jsp`)
2. Create `lib/upload/validate.ts`:
   - `validateFile(file: { name: string, size: number, buffer: Buffer }): ValidationResult`
   - Check: file type allowed, file size within limit, not empty
   - Return `{ valid: boolean, errors: string[] }`
3. Create `lib/upload/zip.ts`:
   - Install `jszip` (or `adm-zip`)
   - `extractZip(buffer: Buffer): Promise<ExtractedFile[]>` where `ExtractedFile = { path: string, content: Buffer, size: number }`
   - Security: reject paths with `..`, reject absolute paths, reject symlinks, reject nested ZIPs, enforce max 10,000 files
   - Normalize paths to lowercase
4. Create `lib/upload/entry-point.ts`:
   - `detectEntryPoint(files: ExtractedFile[]): { entryPath: string, type: 'index' | 'single-html' | 'directory-listing' }`
   - Priority: root `index.html` > single `.html` file > directory listing
   - If ZIP has files in a subdirectory (all under one folder), strip that common prefix
5. Create unit tests in `tests/unit/upload/`:
   - `mime.test.ts` — MIME mapping completeness, fallback behavior
   - `validate.test.ts` — blocked extensions, size limits, empty files
   - `zip.test.ts` — path traversal rejection, nested ZIP rejection, max files, normal extraction
   - `entry-point.test.ts` — root index, single HTML, subdirectory stripping

### Gate

- All unit tests pass: `pnpm vitest run tests/unit/upload/`
- Path traversal attempts (`../../../etc/passwd`) are rejected
- Executable files (`.exe`, `.php`) are rejected

### Files Created

`lib/upload/mime.ts`, `lib/upload/validate.ts`, `lib/upload/zip.ts`, `lib/upload/entry-point.ts`, `tests/unit/upload/mime.test.ts`, `tests/unit/upload/validate.test.ts`, `tests/unit/upload/zip.test.ts`, `tests/unit/upload/entry-point.test.ts`

---

## S06 — Slug Generation + Validation

**Milestone:** M1.2 (Upload + Serving)
**Depends on:** S03 (needs constants for reserved words)

### What to Build

1. Create `lib/slug/reserved.ts`:
   - Import reserved slugs from `lib/config/constants.ts`
   - Export `isReservedSlug(slug: string): boolean`
2. Create `lib/slug/generate.ts`:
   - Pattern: `{adjective}-{noun}-{number}` (e.g. `bright-river-42`)
   - Adjective list: 50+ common adjectives (vivid, calm, swift, bold, etc.)
   - Noun list: 50+ common nouns (river, mountain, forest, meadow, etc.)
   - Number: random 2-digit (10-99)
   - Export `generateSlug(): string`
   - Must produce URL-safe output (lowercase, hyphens only)
3. Create `lib/slug/validate.ts`:
   - `validateSlug(slug: string): { valid: boolean, errors: string[] }`
   - Rules: 3-128 chars, URL-safe (`[a-z0-9-]`), no leading/trailing hyphens, no consecutive hyphens, not reserved
   - `checkSlugAvailability(slug: string, namespace?: string): Promise<boolean>` — query deployments table
4. Create unit tests in `tests/unit/slug/`:
   - `generate.test.ts` — generates URL-safe slugs, no collisions over 1000 generations, matches pattern
   - `validate.test.ts` — rejects reserved words, rejects special chars, rejects too-short/too-long, accepts valid slugs

### Gate

- All unit tests pass: `pnpm vitest run tests/unit/slug/`
- Generated slugs match `^[a-z]+-[a-z]+-[0-9]+$` pattern
- Reserved slugs are correctly rejected

### Files Created

`lib/slug/reserved.ts`, `lib/slug/generate.ts`, `lib/slug/validate.ts`, `tests/unit/slug/generate.test.ts`, `tests/unit/slug/validate.test.ts`

---

## S07 — Upload API Route + Processing Pipeline

**Milestone:** M1.2 (Upload + Serving)
**Depends on:** S04, S05, S06

### What to Build

1. Create `lib/upload/content-hash.ts`:
   - `computeHash(buffer: Buffer): string` — SHA-256 hex
   - `checkBlockedHash(hash: string): Promise<boolean>` — query content_hashes table
2. Create `lib/upload/process.ts`:
   - `processUpload(input: { file: Buffer, filename: string, slug?: string, workspaceId: string, userId: string }): Promise<DeploymentResult>`
   - Pipeline steps:
     a. Validate file type and size
     b. If ZIP: extract, validate each file, detect entry point
     c. If single HTML: wrap as single-file deployment
     d. Generate or validate slug
     e. Compute SHA-256 for each file, check against blocked hashes
     f. Upload all files to R2 under `{workspaceId}/{deploymentId}/v0001/{path}`
     g. Create deployment, deployment_version, and deployment_files records in DB
     h. Return `{ deploymentId, slug, url, fileCount, storageBytes }`
3. Create `app/api/v1/deployments/route.ts`:
   - `POST` — accepts `multipart/form-data` with `file` field and optional `slug` field
   - Calls `processUpload` with authenticated user's workspace
   - Returns 201 with deployment details
   - `GET` — list deployments for authenticated user's workspace (paginated)
4. Create `lib/utils/format.ts`:
   - `formatBytes(bytes: number): string` — human-readable file sizes
   - `formatDate(date: Date | string): string` — consistent date formatting
5. Create unit test: `tests/unit/upload/content-hash.test.ts`

### Gate

- `POST /api/v1/deployments` with a multipart HTML file returns 201 with slug and URL
- Files are stored in R2 under the correct path structure
- Database records created in deployments, deployment_versions, deployment_files tables
- Blocked content hashes are rejected

### Files Created

`lib/upload/content-hash.ts`, `lib/upload/process.ts`, `app/api/v1/deployments/route.ts`, `lib/utils/format.ts`, `tests/unit/upload/content-hash.test.ts`

---

## S08 — Serving Middleware

**Milestone:** M1.2 (Upload + Serving)
**Depends on:** S04, S07

### What to Build

This is the most architecturally critical piece. The middleware resolves deployment slugs and serves files from R2.

1. Create `lib/serving/resolve.ts`:
   - `resolveDeployment(slug: string, namespace?: string): Promise<Deployment | null>` — query DB
   - `resolveFile(deploymentId: string, versionId: string, filePath: string): Promise<DeploymentFile | null>` — query DB
2. Create `lib/serving/headers.ts`:
   - `getServingHeaders(deployment: Deployment, file: DeploymentFile): Record<string, string>`
   - Set: `Content-Type` from file MIME, `Cache-Control` (aggressive for versioned assets, no-cache for HTML), `X-Content-Type-Options: nosniff`, `X-Robots-Tag: noindex, nofollow` (default), `ETag` from SHA-256 hash
3. Create `middleware.ts` (root level):
   - Define known path prefixes: `/dashboard`, `/api`, `/login`, `/signup`, `/auth`, `/settings`, `/admin`, `/invite`, `/_system`, `/p`, `/pricing`, `/dmca`, `/terms`, `/privacy`, `/cookies`, `/acceptable-use`, `/changelog`
   - For known paths: `NextResponse.next()` (pass through to App Router)
   - For unknown paths: treat first segment as slug
     a. Parse URL: `/{slug}` or `/{slug}/{...filepath}`
     b. Query deployment by slug
     c. If not found: return platform 404
     d. If disabled or admin-disabled: redirect to `/_system/unavailable`
     e. If expired: redirect to `/_system/expired`
     f. If password-protected and no valid session cookie: redirect to `/p/{slug}`
     g. Otherwise: fetch file from R2, return with correct headers
   - Handle default file: if path is directory, append `/index.html`
   - Handle trailing slashes consistently
4. Create `app/not-found.tsx` — branded 404 page for the platform
5. Create `app/_system/expired/page.tsx` — "This link has expired" page
6. Create `app/_system/unavailable/page.tsx` — "Temporarily unavailable" page

### Architecture Note

The middleware approach means file serving happens at the edge, before hitting the App Router. This is fast but means we need to handle all serving logic (headers, auth, redirects) in middleware. Read `IMPLEMENTATION_PLAN.md` Section 1 "Architecture Decision: Serving Route" for context.

### Gate

- Upload a file via API (from S07), then `GET /{slug}` returns the HTML content with correct Content-Type
- `GET /{slug}/styles.css` returns CSS with `text/css` Content-Type
- Non-existent slug returns 404
- Non-existent file within deployment returns 404 (or custom 404.html if present)

### Files Created

`lib/serving/resolve.ts`, `lib/serving/headers.ts`, `middleware.ts`, `app/not-found.tsx`, `app/_system/expired/page.tsx`, `app/_system/unavailable/page.tsx`

---

## S09 — Upload UI Components

**Milestone:** M1.2 (Upload + Serving)
**Depends on:** S07

### What to Build

Build the upload interface for the landing page and (later) the dashboard.

1. Install additional shadcn components: `pnpm dlx shadcn@latest add input label progress dialog tooltip`
2. Create `components/upload/upload-zone.tsx`:
   - `"use client"` component
   - Drag-and-drop zone (dashed border, icon, "Drag & drop or click to browse" text)
   - Accept `.html`, `.htm`, `.zip` files
   - On drop/select: start upload via `fetch('/api/v1/deployments', { method: 'POST', body: formData })`
   - States: idle, dragging (highlight border), uploading, success, error
3. Create `components/upload/upload-progress.tsx`:
   - Progress bar showing upload percentage
   - Display filename being uploaded
   - Cancel button
4. Create `components/upload/upload-success.tsx`:
   - Shows deployed URL prominently
   - Copy-to-clipboard button (with "Copied!" toast via Sonner)
   - "Open in new tab" link
   - "Upload another" button to reset
5. Create `components/upload/upload-error.tsx`:
   - Display specific error message from API
   - "Try again" button
6. Create `components/upload/slug-input.tsx`:
   - Text input for custom slug with live URL preview below
   - Real-time validation (debounced availability check)
   - Show green check / red X for availability
7. Update `app/(marketing)/page.tsx`:
   - Hero section with heading, subheading
   - Centered upload zone component
   - Optional slug input below the zone

### Gate

- Landing page shows upload zone
- Dragging a file highlights the zone
- Uploading shows progress bar
- After upload, shows URL with copy button
- Copy button copies to clipboard and shows toast

### Files Created

`components/upload/upload-zone.tsx`, `components/upload/upload-progress.tsx`, `components/upload/upload-success.tsx`, `components/upload/upload-error.tsx`, `components/upload/slug-input.tsx`

### Files Modified

`app/(marketing)/page.tsx`

---

## S10 — Limit Profile System

**Milestone:** M1.3 (Limits)
**Depends on:** S02 (schema), S07 (upload pipeline)

### What to Build

1. Create `lib/limits/profiles.ts`:
   - Type definition: `LimitProfile` matching the `limit_profiles` table schema
   - `getProfileByName(name: string): Promise<LimitProfile>` — query DB
2. Create `lib/limits/get-profile.ts`:
   - `getWorkspaceProfile(workspaceId: string): Promise<LimitProfile>` — join workspace -> limit_profiles
3. Create `lib/limits/assign-profile.ts`:
   - `assignProfile(workspaceId: string, profileName: string): Promise<void>` — update workspace row + audit log
4. Create `lib/limits/check.ts`:
   - `checkDeploymentLimits(workspaceId: string, uploadSizeBytes: number, fileCount: number): Promise<{ allowed: boolean, reason?: string }>`
   - Checks: deployment count < max, uploadSizeBytes < max_deploy_size, total workspace storage + upload < max_total_storage, each file < max_file_size
   - Returns specific reason string on rejection (e.g. "Deployment size exceeds your plan's 50 MB limit")
5. Create `lib/limits/bandwidth.ts`:
   - `recordBandwidth(deploymentId: string, bytes: number): Promise<void>` — upsert bandwidth_daily
   - `getMonthlyBandwidth(workspaceId: string): Promise<{ used: number, limit: number }>`
   - `checkBandwidthLimit(workspaceId: string): Promise<{ allowed: boolean, used: number, limit: number }>`
6. Wire limit checks into `lib/upload/process.ts` — call `checkDeploymentLimits` before processing
7. Create unit tests: `tests/unit/limits/check.test.ts`, `tests/unit/limits/bandwidth.test.ts`

### Gate

- Upload rejected when workspace exceeds deployment count limit
- Upload rejected when file exceeds size limit
- Specific error message returned in each case
- Unit tests pass

### Files Created

`lib/limits/profiles.ts`, `lib/limits/get-profile.ts`, `lib/limits/assign-profile.ts`, `lib/limits/check.ts`, `lib/limits/bandwidth.ts`, `tests/unit/limits/check.test.ts`, `tests/unit/limits/bandwidth.test.ts`

### Files Modified

`lib/upload/process.ts` (add limit checks)

---

## S11 — Limit Enforcement UX

**Milestone:** M1.3 (Limits)
**Depends on:** S09, S10

### What to Build

1. Create `components/upload/quota-display.tsx`:
   - Show remaining deployments, storage, and bandwidth as text below upload zone
   - Format: "3 of 5 deployments used · 12 MB of 50 MB storage"
   - Fetch data via server component or client-side API call
2. Update `components/upload/upload-zone.tsx`:
   - When storage is 100% full: disable the zone, show "Storage full. Upgrade or delete deployments." message
   - When approaching limit: show warning text
3. Update `components/upload/upload-error.tsx`:
   - Handle limit-specific errors with upgrade CTA

### Gate

- Upload zone shows current quota
- Upload zone is disabled when storage is full
- Limit rejection shows specific, user-friendly message

### Files Created

`components/upload/quota-display.tsx`

### Files Modified

`components/upload/upload-zone.tsx`, `components/upload/upload-error.tsx`

---

## S12 — Authentication Setup

**Milestone:** M1.4 (Authentication)
**Depends on:** S03 (Supabase clients)

### What to Build

1. Create `app/(auth)/layout.tsx` — centered auth layout (card in center of screen, logo at top)
2. Create `components/auth/login-form.tsx`:
   - Email input for magic link
   - "Send magic link" button
   - Divider with "or continue with"
   - OAuth buttons (Google, GitHub) using `components/auth/oauth-buttons.tsx`
3. Create `components/auth/oauth-buttons.tsx`:
   - Google and GitHub buttons calling `supabase.auth.signInWithOAuth`
4. Create `app/(auth)/login/page.tsx` — renders login form
5. Create `app/(auth)/signup/page.tsx` — renders login form with TOS checkbox
6. Create `components/auth/tos-checkbox.tsx` — checkbox with "I agree to TOS and AUP" links
7. Create `app/(auth)/auth/callback/route.ts`:
   - Exchange code for session using `supabase.auth.exchangeCodeForSession`
   - Redirect to `/dashboard`
8. Create `app/(auth)/auth/confirm/route.ts`:
   - Handle magic link confirmation
   - Redirect to `/dashboard`
9. Create `app/(auth)/verify-email/page.tsx` — "Check your email" page shown after magic link send
10. Update `middleware.ts`:
    - Add auth check: `/dashboard/**` routes require authenticated session
    - Redirect unauthenticated users to `/login`
    - Redirect authenticated users from `/login` and `/signup` to `/dashboard`

### Gate

- `/login` renders with email input and OAuth buttons
- Magic link sends email (or logs to console in dev)
- OAuth redirect works for Google and GitHub
- Unauthenticated users are redirected from `/dashboard` to `/login`
- Authenticated users can access `/dashboard`

### Files Created

`app/(auth)/layout.tsx`, `components/auth/login-form.tsx`, `components/auth/oauth-buttons.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `components/auth/tos-checkbox.tsx`, `app/(auth)/auth/callback/route.ts`, `app/(auth)/auth/confirm/route.ts`, `app/(auth)/verify-email/page.tsx`

### Files Modified

`middleware.ts`

---

## S13 — Auto-Provisioning + Email Verification + Rate Limits

**Milestone:** M1.4 (Authentication)
**Depends on:** S12

### What to Build

1. Create `lib/auth/session.ts`:
   - `getCurrentUser()` — get user from Supabase session (server-side)
   - `requireAuth()` — throw if not authenticated
   - `requireEmailVerified()` — throw if email not verified
2. Create `lib/auth/rate-limit.ts`:
   - In-memory rate limiter (Map-based with TTL cleanup)
   - `checkRateLimit(key: string, maxAttempts: number, windowMs: number): { allowed: boolean, remaining: number, resetAt: Date }`
   - Presets: `accountCreationLimit` (5/hour per IP), `deploymentCreationLimit` (10/hour, 50/day per account)
3. Implement auto-provisioning: when a user first logs in (no `users` row exists):
   - Create `users` row with email from auth
   - Create personal workspace with `is_personal: true`, `limit_profile: 'free'`
   - Create `workspace_members` row with role `owner`
   - Set `trial_started_at` and `trial_ends_at` (14 days)
   - This logic goes in the auth callback or a middleware check
4. Implement email verification gate:
   - After login, if `email_verified_at` is NULL, block publishing
   - Show banner "Verify your email to start publishing"
5. Wire TOS acceptance: on signup, record `tos_accepted_at` and `tos_version`

### Gate

- First-time login creates user + personal workspace + workspace member
- Unverified email shows verification banner
- Account creation rate limit works (5/hour per IP)
- TOS timestamp is stored on signup

### Files Created

`lib/auth/session.ts`, `lib/auth/rate-limit.ts`

### Files Modified

`app/(auth)/auth/callback/route.ts` (add auto-provisioning), `middleware.ts` (add email verification check)

---

## S14 — Session Management

**Milestone:** M1.4 (Authentication)
**Depends on:** S13

### What to Build

1. Create `lib/auth/permissions.ts`:
   - `getUserRole(userId: string, workspaceId: string): Promise<'owner' | 'publisher' | 'viewer' | null>`
   - `requireRole(userId: string, workspaceId: string, minRole: 'viewer' | 'publisher' | 'owner'): Promise<void>` — throws ForbiddenError if insufficient
   - Role hierarchy: owner > publisher > viewer
2. Create `lib/auth/re-auth.ts`:
   - `requireReAuth(userId: string, action: string): Promise<boolean>` — check if last auth was within 10 minutes for sensitive actions (account deletion, password changes, etc.)
3. Create `app/(dashboard)/dashboard/settings/sessions/page.tsx`:
   - List all active sessions for current user
   - Show: device info (from UA), IP hash, last active time, current session badge
   - "Terminate" button per session
   - "Terminate all other sessions" button
4. Create `app/api/v1/auth/sessions/route.ts`:
   - `GET` — list sessions
   - `DELETE` — terminate session by ID or all except current

### Gate

- Sessions page shows active sessions
- Terminate button ends a session
- Permission check correctly enforces role hierarchy

### Files Created

`lib/auth/permissions.ts`, `lib/auth/re-auth.ts`, `app/(dashboard)/dashboard/settings/sessions/page.tsx`, `app/api/v1/auth/sessions/route.ts`

---

## S15 — Dashboard Layout

**Milestone:** M1.5 (Dashboard)
**Depends on:** S12, S13

### What to Build

1. Install shadcn components: `pnpm dlx shadcn@latest add sheet dropdown-menu separator scroll-area select avatar skeleton`
2. Create `app/(dashboard)/layout.tsx`:
   - Authenticated layout wrapper
   - Fetch current user + workspaces server-side
   - Pass to client layout components
3. Create `components/layout/app-sidebar.tsx`:
   - Fixed left sidebar (desktop 280px, hidden on mobile)
   - Logo at top
   - Navigation links: Dashboard, Analytics, Settings
   - Admin link (visible only to admin users)
   - Bottom: user avatar + name + sign out
4. Create `components/layout/top-nav.tsx`:
   - Workspace selector (Select component)
   - Mobile menu trigger (Sheet)
5. Create `components/layout/workspace-selector.tsx`:
   - Select dropdown listing user's workspaces
   - "Create workspace" option at bottom
   - Persist selected workspace in URL param or cookie
6. Create `components/layout/mobile-sheet-nav.tsx`:
   - Sheet component triggered by hamburger icon on mobile
   - Same navigation as sidebar
7. Create `app/(dashboard)/dashboard/page.tsx`:
   - Placeholder heading "Your Deployments"
   - Upload zone (reuse from S09)
   - Empty deployment list placeholder

### Gate

- `/dashboard` renders with sidebar, top-nav, workspace selector
- Sidebar collapses on mobile, replaced by hamburger -> Sheet
- Workspace selector lists user's workspaces
- Sign out button works

### Files Created

`app/(dashboard)/layout.tsx`, `components/layout/app-sidebar.tsx`, `components/layout/top-nav.tsx`, `components/layout/workspace-selector.tsx`, `components/layout/mobile-sheet-nav.tsx`

### Files Modified

`app/(dashboard)/dashboard/page.tsx`

---

## S16 — Deployment Table

**Milestone:** M1.5 (Dashboard)
**Depends on:** S15

### What to Build

1. Install shadcn components: `pnpm dlx shadcn@latest add table badge tabs command`
2. Create `components/deployments/deployment-table.tsx`:
   - Table with columns: Name/Slug, Status, Size, Views, Created, Actions
   - Sortable by each column (client-side sort)
   - Sticky header on scroll
3. Create `components/deployments/deployment-row.tsx`:
   - Single row rendering deployment data
   - Slug as clickable link to deployment detail
   - Status badges (from `deployment-badges.tsx`)
4. Create `components/deployments/deployment-badges.tsx`:
   - Badge variants: locked (amber), paused (gray), expiring (orange), broken (red), healthy (green)
   - Based on deployment fields: `password_hash`, `is_disabled`, `expires_at`, `health_status`
5. Create `components/deployments/health-status-badge.tsx`:
   - ok/warning/broken/unknown badges with appropriate colors
6. Create `components/deployments/deployment-search.tsx`:
   - Search input + status filter dropdown
   - Filters: all, active, disabled, expired, password-protected
7. Create `app/(dashboard)/dashboard/deployments/[slug]/page.tsx`:
   - Deployment detail page: name, URL, created date, file count, size, health status
   - Copy URL button
   - Action buttons placeholder
8. Update `app/(dashboard)/dashboard/page.tsx`:
   - Fetch deployments for current workspace
   - Render deployment table
   - Show empty state when no deployments
9. Create `components/common/empty-state.tsx`:
   - Reusable empty state with icon, title, description, optional CTA button

### Gate

- Dashboard shows deployment table with real data
- Table is sortable by columns
- Search filters deployments by name
- Deployment detail page shows all metadata
- Empty state shown when no deployments exist

### Files Created

`components/deployments/deployment-table.tsx`, `components/deployments/deployment-row.tsx`, `components/deployments/deployment-badges.tsx`, `components/deployments/health-status-badge.tsx`, `components/deployments/deployment-search.tsx`, `components/common/empty-state.tsx`, `app/(dashboard)/dashboard/deployments/[slug]/page.tsx`

### Files Modified

`app/(dashboard)/dashboard/page.tsx`

---

## S17 — Row Actions

**Milestone:** M1.5 (Dashboard)
**Depends on:** S16

### What to Build

1. Install shadcn components: `pnpm dlx shadcn@latest add alert-dialog popover checkbox textarea`
2. Create `components/deployments/deployment-row-actions.tsx`:
   - DropdownMenu with: Copy URL, Set/Remove Password, Update Content, Duplicate, Rename Slug, Disable/Enable, Delete
   - Permission-gated: viewers see only Copy URL
3. Create `components/deployments/inline-password-popover.tsx`:
   - Popover with password input + Save/Remove buttons
   - Minimum 8 characters validation
4. Create `components/deployments/bulk-actions-bar.tsx`:
   - Appears when checkboxes are selected
   - "Delete selected (N)" button with AlertDialog confirmation
5. Create `components/upload/inline-upload.tsx`:
   - Compact upload zone for updating deployment content in-place
   - Triggered from row actions "Update Content"
6. Create API routes:
   - `app/api/v1/deployments/[slug]/route.ts` — GET detail, PUT overwrite, PATCH metadata (rename slug, toggle settings), DELETE
   - `app/api/v1/deployments/[slug]/password/route.ts` — POST set password, DELETE remove password
   - `app/api/v1/deployments/[slug]/duplicate/route.ts` — POST duplicate deployment
   - `app/api/v1/deployments/[slug]/disable/route.ts` — POST disable, DELETE reactivate
7. Implement slug rename with redirect: when slug changes, create `slug_redirects` record (90-day expiry)
8. Wire all actions to API endpoints with optimistic UI updates and error toasts

### Gate

- All row actions work: copy URL, set/remove password, update content, duplicate, rename, disable/enable, delete
- Bulk delete works with confirmation dialog
- Slug rename creates redirect record
- Viewers cannot access destructive actions

### Files Created

`components/deployments/deployment-row-actions.tsx`, `components/deployments/inline-password-popover.tsx`, `components/deployments/bulk-actions-bar.tsx`, `components/upload/inline-upload.tsx`, `app/api/v1/deployments/[slug]/route.ts`, `app/api/v1/deployments/[slug]/password/route.ts`, `app/api/v1/deployments/[slug]/duplicate/route.ts`, `app/api/v1/deployments/[slug]/disable/route.ts`

---

## S18 — Workspace Management

**Milestone:** M1.5 (Dashboard)
**Depends on:** S15

### What to Build

1. Create `components/workspace/member-list.tsx` — table of workspace members with role badges
2. Create `components/workspace/invite-form.tsx` — email input + role select + "Send invite" button
3. Create `components/workspace/role-select.tsx` — Select component for owner/publisher/viewer
4. Create `components/workspace/workspace-settings-form.tsx` — name, namespace slug
5. Create `components/workspace/workspace-danger-zone.tsx` — delete workspace with confirmation
6. Create `components/workspace/namespace-input.tsx` — namespace slug input with validation
7. Create workspace pages:
   - `app/(dashboard)/dashboard/workspace/new/page.tsx`
   - `app/(dashboard)/dashboard/workspace/[id]/page.tsx` (overview)
   - `app/(dashboard)/dashboard/workspace/[id]/settings/page.tsx`
   - `app/(dashboard)/dashboard/workspace/[id]/members/page.tsx`
8. Create `app/(dashboard)/invite/[token]/page.tsx` — invitation acceptance page
9. Create API routes:
   - `app/api/v1/workspaces/route.ts` — POST create, GET list
   - `app/api/v1/workspaces/[id]/route.ts` — GET, PATCH, DELETE
   - `app/api/v1/workspaces/[id]/members/route.ts` — POST invite, GET list
   - `app/api/v1/workspaces/[id]/members/[userId]/route.ts` — PATCH role, DELETE remove
10. Implement invitation flow: generate token, send email (using Resend), accept via link
11. On member removal: transfer their deployments to workspace owner

### Gate

- Create new workspace works
- Invite member by email sends invitation
- Accept invitation adds user to workspace
- Role assignment works (owner, publisher, viewer)
- Member removal transfers deployments to owner
- Workspace deletion with confirmation

### Files Created

`components/workspace/member-list.tsx`, `components/workspace/invite-form.tsx`, `components/workspace/role-select.tsx`, `components/workspace/workspace-settings-form.tsx`, `components/workspace/workspace-danger-zone.tsx`, `components/workspace/namespace-input.tsx`, workspace pages, invitation page, workspace API routes

---

## S19 — RLS Policies + Permission Enforcement

**Milestone:** M1.5 (Dashboard)
**Depends on:** S14, S17, S18

### What to Build

1. Review and finalize all RLS policies in `supabase/migrations/00026_create_rls_policies.sql`:
   - Ensure every table has RLS enabled
   - Implement all 11 policy groups from `IMPLEMENTATION_PLAN.md` Section 2 "RLS Policies"
   - Test each policy: owner can CRUD, publisher can create/read, viewer can only read
2. Create integration tests: `tests/integration/permissions/permissions.test.ts`
   - Test role-based access for each table
   - Test that viewers cannot INSERT deployments
   - Test that non-members cannot access workspace data
   - Test that admin operations require admin role
3. Audit all API routes created in S17 and S18:
   - Ensure every route calls `requireAuth()` and `requireRole()` appropriately
   - Ensure deployment routes verify workspace membership

### Gate

- RLS policies block unauthorized access at the database level
- API routes enforce role checks
- Integration tests pass for all role combinations

### Files Modified

`supabase/migrations/00026_create_rls_policies.sql`

### Files Created

`tests/integration/permissions/permissions.test.ts`

---

## S20 — Password Protection + Brute-Force

**Milestone:** M1.6 (Password Protection)
**Depends on:** S08, S17

### What to Build

1. Install `bcryptjs` (pure JS bcrypt for edge compatibility)
2. Create `lib/serving/password.ts`:
   - `hashPassword(password: string): Promise<string>` — bcrypt with cost 12
   - `verifyPassword(password: string, hash: string): Promise<boolean>`
   - `checkBruteForce(slugOrIp: string): Promise<{ allowed: boolean, retryAfter?: number }>` — 5 failures per 10 min, 15-min lockout
   - Track failures in-memory (Map with TTL) or in a `password_attempts` tracking structure
3. Create `app/p/[slug]/page.tsx`:
   - Password prompt page with centered form
   - Input + Submit button
   - Error message on wrong password (generic: "Incorrect password")
   - Rate limit message when locked out
4. Create `components/serving/password-prompt-form.tsx`:
   - Client component with form submission
5. Create `app/api/password-verify/route.ts`:
   - POST handler: verify password, set session cookie on success, return error on failure
   - Log all failed attempts to audit log
   - Check brute-force limits before attempting verification
6. Update `middleware.ts`:
   - When serving a password-protected deployment: check for valid session cookie
   - If no cookie: redirect to `/p/{slug}`
   - If valid cookie: serve content
7. Ensure direct asset URLs (e.g. `/{slug}/image.png`) also require password (return 403, not the asset)

### Gate

- Password-protected deployment shows password prompt
- Correct password grants access (session cookie set)
- Wrong password shows generic error
- After 5 wrong attempts in 10 minutes: 15-minute lockout
- Direct asset URLs return 403 without password
- Audit log records failed attempts

### Files Created

`lib/serving/password.ts`, `app/p/[slug]/page.tsx`, `components/serving/password-prompt-form.tsx`, `app/api/password-verify/route.ts`

### Files Modified

`middleware.ts`

---

## S21 — Code Editor

**Milestone:** M1.7 (Code Editor)
**Depends on:** S16

### What to Build

1. Install CodeMirror packages: `@codemirror/view`, `@codemirror/state`, `@codemirror/lang-html`, `@codemirror/lang-css`, `@codemirror/lang-javascript`, `@codemirror/theme-one-dark`
2. Create `components/editor/code-editor.tsx`:
   - `"use client"` wrapper around CodeMirror
   - Props: `value`, `onChange`, `language` (html/css/js), `readOnly`
   - Syntax highlighting per language
   - Dark theme support
3. Create `components/editor/file-tree-sidebar.tsx`:
   - List of files in deployment
   - Click to switch active file
   - Active file highlighted
4. Create `components/editor/editor-toolbar.tsx`:
   - "Save & Publish" button
   - "Discard changes" link
   - File path breadcrumb
5. Create `components/editor/diff-summary.tsx`:
   - Shows count of changed files before publish
6. Create `app/(dashboard)/dashboard/deployments/[slug]/edit/page.tsx`:
   - Full-page editor layout: file tree on left, code editor on right, toolbar on top
   - Fetch all deployment files from API
   - On "Save & Publish": upload changed files to R2, create new version, update DB
7. Create API: `app/api/v1/deployments/[slug]/files/[...path]/route.ts`:
   - GET file content
   - PATCH update single file
8. Implement auto-save: save draft to localStorage on every change, restore on page load if unsaved changes exist

### Gate

- Editor loads with deployment files in file tree
- Switching files updates editor content
- Editing + "Save & Publish" creates new version visible at deployment URL
- Auto-save draft persists across page reloads

### Files Created

`components/editor/code-editor.tsx`, `components/editor/file-tree-sidebar.tsx`, `components/editor/editor-toolbar.tsx`, `components/editor/diff-summary.tsx`, `app/(dashboard)/dashboard/deployments/[slug]/edit/page.tsx`, `app/api/v1/deployments/[slug]/files/[...path]/route.ts`

---

## S22 — Editor Locks + Conflict Detection

**Milestone:** M1.7 (Code Editor)
**Depends on:** S21

### What to Build

1. Implement editor lock system:
   - When user opens editor: INSERT into `editor_locks` (deployment_id, user_id, expires_at = now + 30 min)
   - If lock exists for another user: show "Currently being edited by {user}" banner, open as read-only
   - Heartbeat: extend lock every 5 minutes while editor is open
   - On close/navigate away: DELETE lock
   - Lock auto-expires after 30 minutes of inactivity
2. Create `components/editor/conflict-banner.tsx`:
   - Warning banner: "This deployment was updated externally since you opened the editor"
   - Options: "Discard my changes" / "Keep my version" / "View diff"
3. Implement conflict detection:
   - When user opens editor: record the current `version_number`
   - Before publishing: check if `version_number` has changed
   - If changed: show conflict banner
4. Check session validity before allowing publish (re-auth if needed)

### Gate

- Opening editor acquires lock
- Second user sees "being edited" message
- External update triggers conflict warning
- Lock released on close
- Lock expires after 30 min inactivity

### Files Created

`components/editor/conflict-banner.tsx`

### Files Modified

`app/(dashboard)/dashboard/deployments/[slug]/edit/page.tsx`, editor components

---

## S23 — Auto-Navigation Widget

**Milestone:** M1.8
**Depends on:** S08

### What to Build

1. Create `lib/serving/auto-nav.ts`:
   - `detectMultiPageDeployment(files: DeploymentFile[]): boolean` — more than 1 HTML file
   - `extractPageList(files: DeploymentFile[], config?: DropsitesConfig): PageInfo[]` — build list of pages
   - `inferPageTitle(html: string): string` — extract from `<title>`, fall back to `<h1>`, fall back to filename
   - `buildNavigationHtml(pages: PageInfo[], currentPath: string): string` — generate the widget HTML/JS/CSS to inject
2. Create `public/auto-nav-widget.js`:
   - Standalone JS file (~5KB max) that renders a floating button
   - On click: expands to show page list
   - Highlights current page
   - Responsive (works on mobile)
   - Does not depend on any framework (vanilla JS + CSS-in-JS)
   - Loaded via `<script async src="/auto-nav-widget.js">` with data attributes for config
3. Update serving middleware:
   - For multi-page HTML deployments where `auto_nav_enabled` is true:
     - Inject `<script>` tag before `</body>` pointing to the widget
     - Pass page list as data attribute
   - Never modify the source file in R2 — injection happens at serve time
4. Implement `dropsites.json` support for custom page ordering/labels:
   ```json
   { "navigation": { "pages": [{ "path": "index.html", "label": "Home" }, ...], "order": "custom" } }
   ```
5. Write unit tests: `tests/unit/serving/auto-nav.test.ts`

### Gate

- Multi-page ZIP deployment shows floating nav button
- Clicking button shows page list
- Current page is highlighted
- Single-page deployments do NOT show widget
- Deployments with `auto_nav_enabled: false` do NOT show widget
- Widget loads async (no render blocking)

### Files Created

`lib/serving/auto-nav.ts`, `public/auto-nav-widget.js`, `tests/unit/serving/auto-nav.test.ts`

### Files Modified

`middleware.ts` (serving logic)

---

## S24 — Share Sheet + QR + Embed

**Milestone:** M1.9
**Depends on:** S16

### What to Build

1. Install `qrcode` package
2. Create `lib/qr/generate.ts`:
   - `generateQRCode(url: string, format: 'png' | 'svg'): Promise<Buffer>`
3. Create `components/share/share-sheet.tsx`:
   - Dialog on desktop, Sheet on mobile
   - Tabs or sections: Link, QR Code, Embed, Email
   - Keyboard accessible (focus trap, Escape to close)
4. Create `components/share/copy-link-button.tsx`:
   - Button that copies deployment URL to clipboard
   - Shows "Copied!" toast via Sonner
5. Create `components/share/qr-code-download.tsx`:
   - Display QR code preview
   - Download buttons: PNG, SVG
6. Create `components/share/embed-snippet.tsx`:
   - Generate `<iframe>` code with customizable width/height
   - Copy button for the snippet
7. Create `components/share/email-share.tsx`:
   - `mailto:` link with URL pre-filled in body
8. Create `components/share/password-toggle.tsx`:
   - Inline toggle to set/remove password from within share sheet
9. Wire share sheet: accessible from deployment row actions, deployment detail page, and post-upload success screen

### Gate

- Share sheet opens from multiple entry points
- Copy link works with toast confirmation
- QR code downloads as PNG and SVG
- Embed snippet generates valid iframe code
- Share sheet is keyboard accessible (Tab, Escape)

### Files Created

`lib/qr/generate.ts`, `components/share/share-sheet.tsx`, `components/share/copy-link-button.tsx`, `components/share/qr-code-download.tsx`, `components/share/embed-snippet.tsx`, `components/share/email-share.tsx`, `components/share/password-toggle.tsx`

---

## S25 — Link Expiry

**Milestone:** M1.9
**Depends on:** S08, S16

### What to Build

1. Install shadcn: `pnpm dlx shadcn@latest add calendar`
2. Create `components/deployments/expiry-picker.tsx`:
   - Calendar + Popover for selecting expiry date/time
   - "Remove expiry" option
   - Show relative time ("Expires in 3 days")
3. Create `app/_system/expired/page.tsx` (if not already created in S08):
   - Branded "This link has expired" page with DropSites logo
   - "Contact the owner" message
4. Create `supabase/functions/expiry-processor/index.ts`:
   - Edge Function (cron, runs every 5 minutes)
   - Query deployments where `expires_at <= now()` and `archived_at IS NULL`
   - Set `archived_at = now()` for expired deployments
   - Fire expiry notification
5. Update deployment row: show expiry badge when `expires_at` is set
6. Implement reactivation: clear `archived_at` and optionally update `expires_at`
7. API: extend `PATCH /api/v1/deployments/[slug]` to accept `expires_at` field

### Gate

- Setting an expiry date on a deployment stores it in DB
- Expired deployments show branded expiry page
- Expired deployments can be reactivated
- Expiry badge shows on dashboard row

### Files Created

`components/deployments/expiry-picker.tsx`, `supabase/functions/expiry-processor/index.ts`

### Files Modified

`app/api/v1/deployments/[slug]/route.ts`, deployment row components, `app/_system/expired/page.tsx`

---

## S26 — Notification Clients + Dispatcher

**Milestone:** M1.10 (Notifications)
**Depends on:** S03

### What to Build

1. Install `resend` package
2. Create `lib/notifications/email.ts`:
   - Initialize Resend client with API key
   - `sendEmail(to: string, subject: string, html: string, text: string): Promise<{ id: string }>`
   - Support self-hosted SMTP fallback (check `SMTP_HOST` env var)
3. Create `lib/notifications/sms.ts`:
   - Initialize Twilio client
   - `sendSMS(to: string, body: string): Promise<{ id: string }>`
4. Create `lib/notifications/preferences.ts`:
   - `getNotificationPrefs(userId: string): Promise<NotificationPrefs>`
   - `updateNotificationPrefs(userId: string, prefs: Partial<NotificationPrefs>): Promise<void>`
   - Prefs shape: `{ [eventType: string]: { email: boolean, sms: boolean } }`
5. Create `lib/notifications/rate-limiter.ts`:
   - `checkNotificationRate(userId: string, channel: 'email' | 'sms'): boolean`
   - Limits: 10 SMS/hour, 50 email/day per user
6. Create `lib/notifications/dispatcher.ts`:
   - `dispatch(userId: string, eventType: string, data: Record<string, unknown>): Promise<void>`
   - Steps: check preferences -> check rate limit -> render template -> send via channel -> log to notification_log
   - Retry on failure (up to 3 times with exponential backoff)
7. Create `tests/unit/notifications/dispatcher.test.ts` — test preference checking, rate limiting, channel routing

### Gate

- Dispatcher correctly routes based on preferences
- Rate limiter blocks excessive notifications
- Email sends via Resend (or logs in dev)
- SMS sends via Twilio (or logs in dev)
- Failed sends are retried

### Files Created

`lib/notifications/email.ts`, `lib/notifications/sms.ts`, `lib/notifications/preferences.ts`, `lib/notifications/rate-limiter.ts`, `lib/notifications/dispatcher.ts`, `tests/unit/notifications/dispatcher.test.ts`

---

## S27 — Notification Templates + Preferences UI

**Milestone:** M1.10 (Notifications)
**Depends on:** S26

### What to Build

1. Create all notification email templates in `lib/notifications/templates/`:
   - Each template exports: `{ subject: string, html: string, text: string }` given input data
   - Publisher templates (14): deployment-published, first-view, recipient-viewed, view-milestone, expiry-warning, deployment-expired, brute-force-alert, deployment-takedown, abuse-report-filed, storage-warning-80, storage-full-100, bandwidth-warning-80, bandwidth-full-100, workspace-invite
   - Admin templates (7): admin-abuse-report, admin-quarantine, admin-auto-suspend, admin-safe-browsing-flag, admin-anomaly, admin-weekly-summary, trial reminders (3: day7, day12, expired)
   - All templates must have both HTML and plain-text versions
   - Include one-click unsubscribe link per notification type
2. Create `components/notifications/notification-preferences-form.tsx`:
   - Table of notification types with email/SMS toggle per type
   - Save button
3. Create `components/notifications/phone-verify.tsx`:
   - Phone number input (E.164 format)
   - "Send OTP" button -> "Enter OTP" input -> "Verify" button
4. Create `app/(dashboard)/dashboard/settings/notifications/page.tsx`:
   - Renders preferences form + phone verification
5. Create API: `app/api/v1/notifications/preferences/route.ts` — GET/PATCH
6. Create API: `app/api/v1/account/phone/route.ts` — POST set phone, POST verify OTP
7. Wire dispatch calls into existing flows: upload success, first view detection, etc.

### Gate

- All 24 templates render valid HTML and plain text
- Preferences page shows all notification types with toggles
- Phone verification OTP flow works
- Toggling off a notification type prevents sending
- Unsubscribe link in emails works

### Files Created

All template files in `lib/notifications/templates/`, `components/notifications/notification-preferences-form.tsx`, `components/notifications/phone-verify.tsx`, settings page, API routes

---

## S28 — Abuse Prevention

**Milestone:** M1.11
**Depends on:** S13, S08

### What to Build

1. Create `components/serving/abuse-report-footer.tsx`:
   - "Report abuse" link styled as subtle footer text
   - Links to abuse report form
2. Create abuse report form + API:
   - `app/(auth)/compromise/page.tsx` — no auth required
   - `app/api/v1/abuse/report/route.ts` — POST (no auth, rate limited)
   - Fields: deployment URL, reporter email, reason (phishing/malware/csam/copyright/other), description
3. Create admin abuse console:
   - `app/(dashboard)/dashboard/admin/abuse/page.tsx` — queue of open reports
   - `components/admin/abuse-report-queue.tsx` — list with status, one-click resolve
   - API: `app/api/v1/admin/abuse-reports/route.ts` — GET list, PATCH resolve
   - On confirm: admin can disable deployment, suspend account
4. Implement auto-suspension: after 3 confirmed takedowns against a user, auto-suspend account
5. Create legal pages:
   - `app/(marketing)/dmca/page.tsx` — DMCA takedown process
   - `app/(marketing)/terms/page.tsx` — Terms of Service
   - `app/(marketing)/acceptable-use/page.tsx` — Acceptable Use Policy
6. Wire content hash blocking: when admin confirms abuse, add file hashes to `content_hashes` with `blocked = true`
7. Update upload pipeline: check content hashes against blocked list before accepting
8. Implement deployment creation rate limit in upload pipeline (10/hour, 50/day per account)

### Gate

- Abuse report form submits successfully
- Admin sees abuse reports in queue
- Admin can disable deployment and suspend account in one click
- Content hash blocking prevents re-upload of removed content
- Legal pages render at correct URLs
- Rate limits enforce 10/hour and 50/day deployment creation

### Files Created

`components/serving/abuse-report-footer.tsx`, abuse report pages, admin abuse pages, legal pages, API routes

### Files Modified

`lib/upload/process.ts` (content hash check, rate limit check), serving middleware (inject abuse report footer)

---

## S29 — Analytics Recording + Charts

**Milestone:** M1.12
**Depends on:** S08

### What to Build

1. Install `recharts`
2. Create `lib/analytics/record.ts`:
   - `recordView(deploymentId: string, request: Request): Promise<void>`
   - Extract: referrer domain (strip path/PII), user agent class, visitor hash (SHA-256 of IP + UA, 30-min window)
   - Insert into `analytics_events` table
   - Increment `deployments.total_views`
3. Create `lib/analytics/unique-visitor.ts`:
   - `computeVisitorHash(ip: string, userAgent: string): string` — daily rotating salt
4. Create `lib/analytics/query.ts`:
   - `getDeploymentAnalytics(deploymentId: string, range: '7d' | '30d' | '90d'): Promise<AnalyticsData>`
   - Returns: total views, unique visitors, daily time series, top referrers
5. Create `components/analytics/analytics-overview.tsx`:
   - Tabs: Overview / Views / Bandwidth
   - Overview: summary cards (total views, unique visitors, top referrer)
6. Create `components/analytics/view-chart.tsx`:
   - Recharts line/area chart for daily views over time
7. Create `components/analytics/referrer-list.tsx`:
   - Sorted list of referrer domains with view counts
8. Create `app/(dashboard)/dashboard/deployments/[slug]/analytics/page.tsx`:
   - Renders analytics overview for a deployment
9. Wire `recordView` into serving middleware: call after serving a file (non-blocking)

### Gate

- Viewing a deployed page creates an analytics event
- Analytics page shows view counts and time-series chart
- Referrer domains are recorded (without paths)
- Unique visitors are deduplicated within 30-min window

### Files Created

`lib/analytics/record.ts`, `lib/analytics/unique-visitor.ts`, `lib/analytics/query.ts`, analytics components, analytics page

### Files Modified

`middleware.ts` (record view on serve)

---

## S30 — Bandwidth Tracking + Usage Panels

**Milestone:** M1.12
**Depends on:** S10, S29

### What to Build

1. Wire bandwidth recording into serving middleware:
   - After serving a file, call `recordBandwidth(deploymentId, responseBytes)`
2. Create `components/analytics/usage-panel.tsx`:
   - 3 Progress bars: deployments used/max, storage used/max, bandwidth used/max
   - Color coding: green < 80%, amber 80-99%, red 100%
3. Create `components/analytics/sparkline.tsx`:
   - Small sparkline chart showing storage trend over last 30 days
4. Create `components/analytics/csv-export-button.tsx`:
   - Button to download analytics as CSV
5. Create `lib/analytics/csv-export.ts`:
   - Generate CSV from analytics data
6. Create `app/_system/bandwidth-limit/page.tsx`:
   - Branded "Bandwidth limit reached" page
7. Update serving middleware:
   - Before serving: check `checkBandwidthLimit(workspaceId)`
   - If exceeded: redirect to `/_system/bandwidth-limit`
8. Implement quota alert emails:
   - At 80% storage: send storage-warning-80 notification
   - At 100% storage: send storage-full-100 notification
   - Same for bandwidth
9. Create `supabase/functions/bandwidth-reset/index.ts`:
   - Edge Function cron (1st of each month): reset monthly bandwidth counters

### Gate

- Bandwidth tracked per request
- Usage panel shows accurate quota bars
- Bandwidth limit blocks serving with branded page
- 80%/100% alerts send notifications
- Monthly bandwidth reset works

### Files Created

`components/analytics/usage-panel.tsx`, `components/analytics/sparkline.tsx`, `components/analytics/csv-export-button.tsx`, `lib/analytics/csv-export.ts`, `app/_system/bandwidth-limit/page.tsx`, `supabase/functions/bandwidth-reset/index.ts`

### Files Modified

`middleware.ts`, notification dispatch calls

---

## S31 — Audit Log + Admin Panels

**Milestone:** M1.12
**Depends on:** S29, S30

### What to Build

1. Create `lib/audit/log.ts`:
   - `auditLog(entry: { actorId, workspaceId, action, resourceType, resourceId, metadata, ipHash }): Promise<void>`
   - Append-only insert into `audit_log` table
2. Wire audit log calls into ALL state-changing operations:
   - Upload, overwrite, delete, archive, password set/clear, role change, member invite/remove, profile change, disable/enable, slug rename
3. Create admin pages:
   - `app/(dashboard)/dashboard/admin/page.tsx` — admin overview with stats cards
   - `app/(dashboard)/dashboard/admin/users/page.tsx` — user management table
   - `app/(dashboard)/dashboard/admin/deployments/page.tsx` — all deployments table
4. Create `components/admin/admin-stats-cards.tsx`:
   - Cards: total users, total deployments, total storage, active today
5. Create `components/admin/user-management-table.tsx`:
   - List all users, search, assign limit profiles, freeze/suspend
6. Create `components/admin/deployment-admin-table.tsx`:
   - List all deployments across all workspaces
7. Create `components/admin/usage-export-button.tsx`:
   - Download admin CSV with per-user usage breakdown
8. Create admin API routes:
   - `app/api/v1/admin/usage/route.ts` — GET usage stats + CSV
   - `app/api/v1/admin/users/route.ts` — GET all users
   - `app/api/v1/admin/users/[userId]/route.ts` — PATCH profile/freeze/suspend
   - `app/api/v1/admin/deployments/route.ts` — GET all deployments

### Gate

- Audit log records every state change
- Admin dashboard shows platform stats
- Admin can view/search all users and deployments
- Admin can assign limit profiles
- Admin can freeze/suspend users
- Admin CSV export works

### Files Created

`lib/audit/log.ts`, admin pages, admin components, admin API routes

### Files Modified

All state-changing routes and functions (add audit log calls)

---

## S32 — Performance Pass

**Milestone:** M1.13
**Depends on:** S08, S29

### What to Build

1. Create `lib/upload/image-optimize.ts`:
   - `optimizeImage(buffer: Buffer, mime: string): Promise<{ buffer: Buffer, savedBytes: number, convertedTo?: string }>`
   - If image > 200KB: compress with quality reduction
   - If PNG and WebP conversion saves > 20%: convert to WebP
   - Return savings summary
2. Create `lib/serving/lazy-loading.ts`:
   - `injectLazyLoading(html: string): string` — add `loading="lazy"` to all `<img>` tags that don't already have it
3. Update serving middleware for headers:
   - HTML files: `Cache-Control: no-cache, must-revalidate`
   - Versioned assets (CSS, JS, images, fonts): `Cache-Control: public, max-age=31536000, immutable`
   - Set `ETag` from file hash
   - Set `Content-Encoding: br` or `gzip` (rely on Next.js/Cloudflare for actual compression)
4. Implement CDN cache invalidation:
   - On deployment overwrite: call Cloudflare API to purge cache for the deployment's URLs
5. Apply lazy loading injection to HTML at serve time
6. Apply image optimization at upload time (in upload pipeline)
7. Show storage savings summary after upload (e.g. "Saved 1.2 MB by optimizing images")

### Gate

- Images > 200KB are compressed at upload time
- `<img>` tags get `loading="lazy"` at serve time
- HTML served with `no-cache`, assets with long cache + immutable
- CDN cache is purged on overwrite

### Files Created

`lib/upload/image-optimize.ts`, `lib/serving/lazy-loading.ts`

### Files Modified

`lib/upload/process.ts` (add image optimization), `middleware.ts` (lazy loading injection, cache headers)

---

## S33 — Security Review

**Milestone:** M1.14
**Depends on:** S08, S19, S20

### What to Build

1. Update `lib/serving/headers.ts`:
   - Dashboard CSP: strict (no unsafe-inline, no unsafe-eval)
   - Served deployments: default CSP with script-src 'self' 'unsafe-inline' (user content may use inline scripts)
   - Support `dropsites.json` CSP override
   - `X-Frame-Options: DENY` on dashboard routes
   - `X-Content-Type-Options: nosniff` on everything
2. Create `lib/serving/redirect.ts`:
   - Handle slug redirects from `slug_redirects` table (301 redirect, 90-day expiry)
3. Security audit all routes:
   - No stack traces in error responses (verify `lib/errors/handler.ts` is used everywhere)
   - All user inputs sanitized/validated with zod
   - All DB queries use parameterized queries (Supabase client handles this)
   - CSRF protection on all state-changing POST/PUT/PATCH/DELETE
4. Path traversal prevention:
   - Verify serving middleware rejects `../` in file paths
   - Verify ZIP extraction rejects `../` paths
5. Write security tests: `tests/integration/security/security.test.ts`
   - SQL injection attempts
   - XSS in slug display
   - Path traversal in serving
   - CSRF without token
   - Stack trace suppression in prod mode

### Gate

- Dashboard has strict CSP
- Served content has appropriate CSP
- X-Frame-Options: DENY on dashboard
- Path traversal returns 403
- No stack traces in error responses
- Security integration tests pass

### Files Created

`lib/serving/redirect.ts`, `tests/integration/security/security.test.ts`

### Files Modified

`lib/serving/headers.ts`, `middleware.ts`, `lib/errors/handler.ts`

---

## S34 — Self-Hosted Runbook

**Milestone:** M1.15
**Depends on:** S02, S03

### What to Build

1. Create `docs/self-hosted-runbook.md`:
   - Prerequisites (Docker, domain, SMTP provider)
   - Step-by-step: clone -> configure env -> docker compose up -> first-run checklist
   - Environment variable reference (all vars with descriptions)
   - Storage backend options (R2, S3, GCS, Azure, MinIO, local)
   - Database options (PostgreSQL, SQLite for single-node)
   - Auth provider setup (magic link, OAuth, OIDC)
   - Monitoring and health checks
   - Backup and restore
   - Troubleshooting FAQ
2. Create `scripts/validate-config.ts`:
   - CLI script: reads `.env` or env vars, validates all required vars are set
   - Checks database connectivity
   - Checks storage connectivity
   - Checks email provider connectivity
   - Output: pass/fail for each check with helpful error messages
3. Update `app/api/health/route.ts`:
   - Add separate status for each service: `{ database: "up", storage: "up", email: "up" }`
   - If self-hosted + licence key configured: validate licence status

### Gate

- Runbook is comprehensive and follows step-by-step
- `validate-config` script runs and checks all services
- Health endpoint reports individual service status

### Files Created

`docs/self-hosted-runbook.md`, `scripts/validate-config.ts`

### Files Modified

`app/api/health/route.ts`

---

## S35 — Trial System

**Milestone:** M1.16
**Depends on:** S10, S13

### What to Build

1. Implement trial logic:
   - On first login (auto-provisioning): set `trial_started_at = now()`, `trial_ends_at = now() + 14 days`, `limit_profile = 'pro'`
   - One trial per email address (check if user ever had trial before assigning)
2. Create `components/onboarding/trial-banner.tsx`:
   - Shows "X days left in your Pro trial" in dashboard header
   - Links to upgrade page
3. Create `supabase/functions/trial-expiry/index.ts`:
   - Edge Function cron (runs daily)
   - Find workspaces where `trial_ends_at <= now()` and `limit_profile = 'pro'` and no Stripe subscription
   - Set `limit_profile = 'free'`
   - Send trial-expired notification
   - Do NOT delete content or deployments
4. Wire trial reminder notifications:
   - Day 7: send trial-reminder-day7
   - Day 12: send trial-reminder-day12
   - Day 14 (expiry): send trial-expired

### Gate

- New users get 14-day Pro trial
- Trial countdown shows in dashboard
- Trial expires automatically, reverting to free (no content deleted)
- Reminder notifications fire at day 7, 12, and 14
- Same email cannot get trial twice

### Files Created

`components/onboarding/trial-banner.tsx`, `supabase/functions/trial-expiry/index.ts`

### Files Modified

Auto-provisioning logic in auth callback

---

## S36 — Status Page

**Milestone:** M1.17
**Depends on:** S03

### What to Build

1. Simple status page approach: create a dedicated page at the app level
   - `app/(marketing)/status/page.tsx`
   - Fetch `/api/health` and display service statuses
   - Show: green/red for database, storage, email
   - Display last 7 days of incident history (from a simple `status_incidents` table or JSON file)
2. Auto-refresh every 60 seconds
3. Include uptime percentage for the current month

### Gate

- Status page accessible at `/status`
- Shows real-time health from `/api/health`
- Auto-refreshes

### Files Created

`app/(marketing)/status/page.tsx`

---

## S37 — Bot Filtering

**Milestone:** M1.18
**Depends on:** S29

### What to Build

1. Create `lib/serving/bot-filter.ts`:
   - `classifyUserAgent(ua: string): 'browser' | 'bot' | 'unknown'`
   - Check against `bot_filters` table patterns
   - Cache patterns in memory with 5-minute TTL
2. Seed `bot_filters` table with common bot patterns:
   - Googlebot, Bingbot, Slurp, DuckDuckBot, Baiduspider, YandexBot
   - Health check bots: UptimeRobot, Pingdom, StatusCake
   - Social crawlers: facebookexternalhit, Twitterbot, LinkedInBot
3. Update analytics recording: store `user_agent_class` from bot filter
4. In admin analytics: separate bot traffic from real traffic
5. Write unit tests: `tests/unit/serving/bot-filter.test.ts`

### Gate

- Bot traffic classified correctly
- Bot events stored with `user_agent_class = 'bot'`
- Admin can see bot vs browser traffic split
- Filter patterns updatable in DB without deploy

### Files Created

`lib/serving/bot-filter.ts`, `tests/unit/serving/bot-filter.test.ts`

### Files Modified

Analytics recording, bot_filters seed data

---

## S38 — Custom 404 + Redirects

**Milestone:** M1.19
**Depends on:** S08

### What to Build

1. Update serving middleware:
   - When a file is not found within a deployment: check for `404.html` in deployment files
   - If `404.html` exists: serve it with HTTP 404 status code
   - If not: serve platform branded 404
2. Implement slug redirects in middleware:
   - Before returning 404 for unknown slugs: check `slug_redirects` table
   - If redirect exists and not expired: 301 redirect to new slug
3. Implement `dropsites.json` redirect rules:
   - Support `{ "redirects": [{ "from": "/old-path", "to": "/new-path", "status": 301 }] }` in dropsites.json
   - Apply at serve time
4. Create test fixtures: `tests/fixtures/with-custom-404/` (index.html + 404.html)

### Gate

- Deployment with 404.html serves it on missing paths (with 404 status)
- Deployment without 404.html gets platform 404
- Old slugs redirect to new slugs (301)
- dropsites.json redirect rules work

### Files Created

`tests/fixtures/with-custom-404/index.html`, `tests/fixtures/with-custom-404/404.html`

### Files Modified

`middleware.ts`

---

## S39 — Robots Control

**Milestone:** M1.20
**Depends on:** S08

### What to Build

1. Update `lib/serving/headers.ts`:
   - Default: `X-Robots-Tag: noindex, nofollow` on all deployment responses
   - If `deployment.allow_indexing = true`: omit X-Robots-Tag (allow indexing)
2. Add toggle to deployment settings/detail page:
   - Switch component: "Allow search engines to index this deployment"
   - Updates `allow_indexing` field via PATCH API
3. Implement custom `robots.txt`:
   - If deployment has a `robots.txt` file: serve it as-is
   - Otherwise: generate one based on `allow_indexing` setting

### Gate

- Default: X-Robots-Tag noindex on responses
- Toggle allows indexing
- Custom robots.txt served when present

### Files Modified

`lib/serving/headers.ts`, `middleware.ts`, deployment detail page

---

## S40 — Cookie Consent

**Milestone:** M1.21
**Depends on:** S03

### What to Build

1. Create `components/auth/cookie-consent-banner.tsx`:
   - Bottom banner: "We use essential cookies..." with Accept/Decline
   - Only shown on dashboard (NOT on served deployments)
   - Persists consent to `cookie_consents` table
   - Shows only once per browser (check localStorage)
2. Create `app/(marketing)/cookies/page.tsx` — cookie policy page
3. Ensure served deployments NEVER receive cookie consent injection

### Gate

- Cookie banner appears on first dashboard visit
- Accepting dismisses banner permanently
- Served deployments do not show cookie banner
- Cookie policy page accessible at `/cookies`

### Files Created

`components/auth/cookie-consent-banner.tsx`, `app/(marketing)/cookies/page.tsx`

### Files Modified

Dashboard layout (add cookie consent banner)

---

## S41 — Accessibility Audit

**Milestone:** M1.22
**Depends on:** S09, S15, S16, S20, S24

### What to Build

1. Install `@axe-core/playwright` for automated accessibility testing
2. Create `tests/e2e/accessibility.spec.ts`:
   - Run axe against: landing page, login, dashboard, upload zone, share sheet, password prompt, 404 page, expired page, bandwidth limit page
   - Assert: zero critical violations, zero serious violations
3. Review and fix all components for:
   - Proper ARIA labels on interactive elements
   - Focus management in modals/dialogs (share sheet, delete confirmation, etc.)
   - Keyboard navigation (Tab order, Enter/Space activation, Escape to close)
   - Color contrast (WCAG AA)
   - Screen reader announcements for dynamic content (upload progress, copy confirmation)
4. Ensure upload zone is fully keyboard accessible (Enter/Space to trigger file browser)
5. Ensure share sheet has focus trap and returns focus on close

### Gate

- axe audit returns zero critical/serious violations on all tested pages
- All interactive elements reachable via keyboard
- Share sheet has proper focus trap
- Upload zone works with keyboard only

### Files Created

`tests/e2e/accessibility.spec.ts`

### Files Modified

Various components (fix a11y issues found)

---

## S42 — Onboarding + Empty States

**Milestone:** M1.23
**Depends on:** S15, S35

### What to Build

1. Create `components/onboarding/onboarding-checklist.tsx`:
   - 3-step checklist: Upload your first site, Share it with someone, Invite a team member
   - Each step has check/uncheck based on user actions
   - Dismissible after all steps complete or manually
2. Create `components/onboarding/celebration-modal.tsx`:
   - Shown after first successful deployment
   - Confetti animation (lightweight CSS animation, no heavy library)
   - "Share your site" CTA opening share sheet
   - Auto-dismiss after 5 seconds or on click
3. Create `components/onboarding/trial-prompt.tsx`:
   - In-product prompt at day 7 of trial: "You've been using Pro features for a week!"
   - CTA to upgrade
4. Update empty states:
   - Empty dashboard: "No deployments yet — upload your first site!"
   - Empty workspace members: "You're the only one here — invite your team"
   - Empty analytics: "No views yet — share your deployment to get started"
   - Empty search results: "No deployments match your search"

### Gate

- New user sees onboarding checklist
- First deployment triggers celebration
- Empty states show helpful messages with CTAs
- Day-7 trial prompt appears

### Files Created

`components/onboarding/onboarding-checklist.tsx`, `components/onboarding/celebration-modal.tsx`, `components/onboarding/trial-prompt.tsx`

### Files Modified

Dashboard page, workspace members page, analytics page, search component

---

## S43 — Team SSO

**Milestone:** M1.24
**Depends on:** S12, S18

### What to Build

1. Create SSO configuration UI in workspace settings:
   - Fields: OIDC Discovery URL, Client ID, Client Secret
   - Test connection button
   - Enable/disable toggle
2. Implement OIDC login flow:
   - When SSO is configured for a workspace: disable magic link + social OAuth for that workspace
   - Redirect to IdP's authorization endpoint
   - Handle callback: exchange code, verify token, create/link user account
3. Store SSO config in `workspaces.sso_config` JSONB field
4. Only available for Team+ profiles

### Gate

- SSO config can be saved and tested
- SSO redirect works to IdP
- User is created/linked after successful SSO
- Magic link disabled for SSO workspaces

### Files Modified

Workspace settings page, auth middleware

---

## S44 — Launch Prep

**Milestone:** M1.25
**Depends on:** All previous sessions

### What to Build

This is the final session for Phase 1. Tie up all loose ends:

1. Create `components/serving/dropsites-badge.tsx`:
   - "Published with DropSites" badge injected into free-tier served pages
   - Small, unobtrusive, bottom-right corner
   - Links to dropsites.app
   - NOT shown for Pro+ workspaces
2. Create `app/(dashboard)/dashboard/changelog/page.tsx`:
   - In-product changelog listing
   - Fetch from `changelog_entries` table
3. Create `components/notifications/changelog-badge.tsx`:
   - Dot badge in sidebar showing unread changelog entries
4. Create `components/support/help-widget.tsx`:
   - Help icon button in dashboard footer/sidebar
   - Opens support panel or links to docs
5. Create `components/support/support-ticket-form.tsx`:
   - Simple form: subject, description, category, email
6. Create `components/common/offline-banner.tsx`:
   - Shown when navigator.onLine === false
   - "You appear to be offline. Some features may be unavailable."
7. Mobile responsive pass:
   - Verify all dashboard pages render at 375px width minimum
   - Ensure sidebar collapses to sheet on mobile
   - Ensure tables scroll horizontally on small screens
8. Create `app/(dashboard)/dashboard/settings/data/page.tsx`:
   - Account deletion with 7-day grace period, confirmation dialog, re-auth required
   - Data export: request ZIP of all deployments + metadata
9. Create `app/api/v1/account/route.ts` — GET profile, DELETE account
10. Create `app/api/v1/account/export/route.ts` — POST request data export
11. Create `app/(auth)/compromise/page.tsx`:
    - Account compromise report form (no auth required)
    - Fields: email, description of compromise
    - Admin notification on submission
12. Create `app/(marketing)/privacy/page.tsx` — privacy policy page

### Gate

- Free-tier pages show "Published with DropSites" badge
- Changelog page renders with entries
- Help widget present on all dashboard pages
- Offline banner shows when disconnected
- All pages responsive at 375px
- Account deletion flow works with confirmation
- Data export request creates a background job
- All legal pages render: TOS, AUP, DMCA, cookies, privacy

### Files Created

Badge component, changelog page, help widget, support form, offline banner, data settings page, account API routes, compromise page, privacy page

---

## End of Phase 1 Task Cards

After all 44 sessions are complete, run the full test suite:

```bash
pnpm typecheck
pnpm test
pnpm playwright test
```

Then proceed to Phase 2 task cards (to be generated after Phase 1 completion).

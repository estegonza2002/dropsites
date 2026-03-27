---
title: Implementation Plan
owner: engineering
version: "1.0"
last_updated: 2026-03-26
depends_on:
  - prd/PRD.md
  - design/design-system.md
  - design/components.md
---

# DropSites — Complete Implementation Plan

> Generated from PRD v2.0 (March 2026). This plan covers every requirement, every table, every route, every test, and every integration needed to build DropSites from scratch.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Supabase Schema](#2-supabase-schema)
3. [Cloudflare R2 Structure](#3-cloudflare-r2-structure)
4. [Environment Variables](#4-environment-variables)
5. [Phase 1 Implementation Sequence (M1.1–M1.25)](#5-phase-1-implementation-sequence-m11--m125)
6. [Phase 2 Implementation Sequence (M2.1–M2.31)](#6-phase-2-implementation-sequence-m21--m231)
7. [Phase 3 Implementation Sequence (M3.1–M3.5)](#7-phase-3-implementation-sequence-m31--m35)
8. [Test File Structure](#8-test-file-structure)
9. [shadcn Component List](#9-shadcn-component-list)
10. [Third-Party Integrations Checklist](#10-third-party-integrations-checklist)
11. [Open Questions That Block Development](#11-open-questions-that-block-development)
12. [Completeness Check](#12-completeness-check)

---

## 1. Project Structure

```
dropsites/
├── .env.example
├── .env.local                        # local dev overrides (git-ignored)
├── .eslintrc.cjs
├── .gitignore
├── .prettierrc
├── Dockerfile
├── docker-compose.yml
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── vitest.config.ts
├── vitest.integration.config.ts
├── playwright.config.ts
├── components.json                   # shadcn/ui config
├── middleware.ts                      # Next.js middleware — routing, auth, serving
├── sentry.client.config.ts
├── sentry.server.config.ts
├── sentry.edge.config.ts
│
├── app/
│   ├── layout.tsx                    # root layout: Geist font, providers, toast
│   ├── globals.css                   # Tailwind v4 base + custom tokens
│   ├── not-found.tsx                 # platform-level branded 404 page
│   │
│   ├── (marketing)/
│   │   ├── layout.tsx                # public marketing layout (no auth)
│   │   ├── page.tsx                  # landing page with hero upload zone
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   ├── dmca/
│   │   │   └── page.tsx              # FR-225 DMCA takedown process
│   │   ├── cookies/
│   │   │   └── page.tsx              # FR-348 cookie policy
│   │   ├── terms/
│   │   │   └── page.tsx              # FR-226 Terms of Service
│   │   ├── privacy/
│   │   │   └── page.tsx
│   │   ├── acceptable-use/
│   │   │   └── page.tsx              # FR-226 Acceptable Use Policy
│   │   └── changelog/
│   │       └── page.tsx              # FR-295 public changelog + RSS
│   │
│   ├── (auth)/
│   │   ├── layout.tsx                # centered auth layout
│   │   ├── login/
│   │   │   └── page.tsx              # magic link + OAuth buttons
│   │   ├── signup/
│   │   │   └── page.tsx              # sign up + TOS acceptance (FR-227)
│   │   ├── verify-email/
│   │   │   └── page.tsx              # email verification pending
│   │   ├── auth/
│   │   │   ├── callback/
│   │   │   │   └── route.ts          # OAuth callback handler
│   │   │   └── confirm/
│   │   │       └── route.ts          # magic link confirmation
│   │   └── compromise/
│   │       └── page.tsx              # FR-284 account compromise report (no auth)
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx                # authenticated layout: sidebar, top-nav, workspace selector
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # deployment list + upload zone (FR-29-36, FR-58-63)
│   │   │   │
│   │   │   ├── deployments/
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx      # deployment detail page (FR-30, FR-105)
│   │   │   │       ├── edit/
│   │   │   │       │   └── page.tsx  # in-browser editor (FR-51-57, FR-316-320)
│   │   │   │       └── analytics/
│   │   │   │           └── page.tsx  # per-deployment analytics (FR-37-42)
│   │   │   │
│   │   │   ├── workspace/
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx      # create workspace (FR-225)
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # workspace overview
│   │   │   │       ├── settings/
│   │   │   │       │   └── page.tsx  # workspace settings (FR-237)
│   │   │   │       └── members/
│   │   │   │           └── page.tsx  # member management (FR-236)
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx          # account settings overview
│   │   │   │   ├── notifications/
│   │   │   │   │   └── page.tsx      # notification preferences (FR-213)
│   │   │   │   ├── sessions/
│   │   │   │   │   └── page.tsx      # active sessions (FR-264-265)
│   │   │   │   ├── security/
│   │   │   │   │   └── page.tsx      # phone verify, 2FA (Phase 2)
│   │   │   │   └── data/
│   │   │   │       └── page.tsx      # data export + account deletion (FR-256-262)
│   │   │   │
│   │   │   ├── admin/
│   │   │   │   ├── layout.tsx        # admin-only layout guard (FR-305: desktop-only)
│   │   │   │   ├── page.tsx          # admin overview (FR-176-184)
│   │   │   │   ├── users/
│   │   │   │   │   └── page.tsx      # user management + profile assignment (FR-144, FR-177)
│   │   │   │   ├── deployments/
│   │   │   │   │   └── page.tsx      # all deployments (FR-222-224)
│   │   │   │   ├── abuse/
│   │   │   │   │   └── page.tsx      # abuse reports queue (FR-220-221)
│   │   │   │   └── notifications/
│   │   │   │       └── page.tsx      # notification delivery log (FR-220)
│   │   │   │
│   │   │   └── changelog/
│   │   │       └── page.tsx          # in-product changelog (FR-295-299)
│   │   │
│   │   └── invite/
│   │       └── [token]/
│   │           └── page.tsx          # workspace invitation acceptance
│   │
│   ├── s/                            # serving routes namespace
│   │   └── [slug]/
│   │       └── [...path]/
│   │           └── route.ts          # deployment file serving handler
│   │
│   ├── p/                            # password prompt routes
│   │   └── [slug]/
│   │       └── page.tsx              # password prompt page (FR-24)
│   │
│   ├── api/
│   │   ├── v1/
│   │   │   ├── deployments/
│   │   │   │   ├── route.ts                           # POST create, GET list
│   │   │   │   └── [slug]/
│   │   │   │       ├── route.ts                       # GET detail, PUT overwrite, PATCH metadata, DELETE
│   │   │   │       ├── analytics/
│   │   │   │       │   └── route.ts                   # GET analytics
│   │   │   │       ├── files/
│   │   │   │       │   └── [...path]/
│   │   │   │       │       └── route.ts               # PATCH single file (Phase 2)
│   │   │   │       ├── versions/
│   │   │   │       │   └── route.ts                   # GET version list, POST restore
│   │   │   │       ├── tokens/
│   │   │   │       │   ├── route.ts                   # POST create, GET list access tokens
│   │   │   │       │   └── [tokenId]/
│   │   │   │       │       └── route.ts               # DELETE revoke token
│   │   │   │       ├── password/
│   │   │   │       │   └── route.ts                   # POST set, DELETE remove
│   │   │   │       ├── health/
│   │   │   │       │   └── route.ts                   # POST trigger health check
│   │   │   │       ├── duplicate/
│   │   │   │       │   └── route.ts                   # POST duplicate deployment
│   │   │   │       └── disable/
│   │   │   │           └── route.ts                   # POST disable, DELETE reactivate
│   │   │   │
│   │   │   ├── workspaces/
│   │   │   │   ├── route.ts                           # POST create, GET list
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts                       # GET, PATCH, DELETE workspace
│   │   │   │       ├── members/
│   │   │   │       │   ├── route.ts                   # POST invite, GET list
│   │   │   │       │   └── [userId]/
│   │   │   │       │       └── route.ts               # PATCH role, DELETE remove
│   │   │   │       └── analytics/
│   │   │   │           └── route.ts                   # GET workspace aggregate analytics
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── api-keys/
│   │   │   │   │   ├── route.ts                       # POST generate, GET list
│   │   │   │   │   └── [keyId]/
│   │   │   │   │       └── route.ts                   # DELETE revoke
│   │   │   │   └── sessions/
│   │   │   │       └── route.ts                       # GET list, DELETE terminate
│   │   │   │
│   │   │   ├── admin/
│   │   │   │   ├── deployments/
│   │   │   │   │   └── route.ts                       # GET all deployments, POST disable
│   │   │   │   ├── users/
│   │   │   │   │   ├── route.ts                       # GET all users
│   │   │   │   │   └── [userId]/
│   │   │   │   │       └── route.ts                   # PATCH profile/freeze/unfreeze/suspend
│   │   │   │   ├── abuse-reports/
│   │   │   │   │   └── route.ts                       # GET list, PATCH resolve
│   │   │   │   └── usage/
│   │   │   │       └── route.ts                       # GET platform usage + CSV export
│   │   │   │
│   │   │   ├── webhooks/
│   │   │   │   ├── route.ts                           # POST register, GET list
│   │   │   │   └── [webhookId]/
│   │   │   │       ├── route.ts                       # DELETE, GET delivery log
│   │   │   │       └── deliveries/
│   │   │   │           └── route.ts                   # GET delivery history
│   │   │   │
│   │   │   ├── notifications/
│   │   │   │   └── preferences/
│   │   │   │       └── route.ts                       # GET, PATCH notification prefs
│   │   │   │
│   │   │   ├── account/
│   │   │   │   ├── route.ts                           # GET profile, DELETE account
│   │   │   │   ├── export/
│   │   │   │   │   └── route.ts                       # POST request data export
│   │   │   │   └── phone/
│   │   │   │       └── route.ts                       # POST set phone, POST verify OTP
│   │   │   │
│   │   │   └── abuse/
│   │   │       └── report/
│   │   │           └── route.ts                       # POST abuse report (no auth)
│   │   │
│   │   ├── serve/
│   │   │   └── [slug]/
│   │   │       └── [...path]/
│   │   │           └── route.ts                       # internal serving route
│   │   │
│   │   ├── password-verify/
│   │   │   └── route.ts                               # POST verify deployment password
│   │   │
│   │   ├── health/
│   │   │   └── route.ts                               # GET /api/health (NFR-17)
│   │   │
│   │   ├── metrics/
│   │   │   └── route.ts                               # GET /api/metrics (NFR-32, restricted)
│   │   │
│   │   ├── docs/
│   │   │   └── route.ts                               # GET OpenAPI spec (Swagger UI)
│   │   │
│   │   ├── changelog/
│   │   │   └── route.ts                               # GET changelog entries JSON + RSS
│   │   │
│   │   └── stripe/
│   │       └── webhook/
│   │           └── route.ts                           # POST Stripe webhook (Phase 2)
│   │
│   ├── _system/                      # system status pages
│   │   ├── expired/
│   │   │   └── page.tsx              # FR-78 "This link has expired"
│   │   ├── unavailable/
│   │   │   └── page.tsx              # FR-97/FR-224 "Temporarily unavailable"
│   │   ├── bandwidth-limit/
│   │   │   └── page.tsx              # FR-158 "Bandwidth limit reached"
│   │   └── content-unavailable/
│   │       └── page.tsx              # FR-224 admin disabled content
│   │
│   └── changelog.xml/
│       └── route.ts                  # FR-299 RSS feed
│
├── components/
│   ├── ui/                           # shadcn/ui installed components
│   │   ├── alert-dialog.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── calendar.tsx
│   │   ├── card.tsx
│   │   ├── checkbox.tsx
│   │   ├── command.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── popover.tsx
│   │   ├── progress.tsx
│   │   ├── scroll-area.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   ├── skeleton.tsx
│   │   ├── switch.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── textarea.tsx
│   │   ├── sonner.tsx                # toast (Sonner)
│   │   └── tooltip.tsx
│   │
│   ├── layout/
│   │   ├── app-sidebar.tsx           # fixed left sidebar (desktop)
│   │   ├── top-nav.tsx               # top bar with workspace selector + search + user menu
│   │   ├── workspace-selector.tsx    # Select component in nav (FR-234)
│   │   ├── mobile-sheet-nav.tsx      # Sheet-based nav on mobile
│   │   ├── marketing-header.tsx
│   │   └── marketing-footer.tsx
│   │
│   ├── upload/
│   │   ├── upload-zone.tsx           # drag-and-drop + click-to-browse (FR-01-08)
│   │   ├── upload-progress.tsx       # Progress bar + filename (FR-06)
│   │   ├── upload-success.tsx        # celebration screen (FR-358)
│   │   ├── upload-error.tsx          # specific error display
│   │   ├── slug-input.tsx            # custom slug with live URL preview (FR-10-12)
│   │   ├── quota-display.tsx         # remaining quota inline (FR-152, FR-185)
│   │   └── inline-upload.tsx         # inline upload zone for dashboard row update (FR-61)
│   │
│   ├── deployments/
│   │   ├── deployment-table.tsx      # Table component, sortable (FR-29-30)
│   │   ├── deployment-row.tsx        # single row with all badges and actions
│   │   ├── deployment-row-actions.tsx # DropdownMenu (three dots) with Lock/Update/Duplicate/Rename/Delete
│   │   ├── deployment-detail-header.tsx
│   │   ├── deployment-badges.tsx     # Badge: locked, paused, expiring, broken, OK (FR-62, FR-99, FR-80)
│   │   ├── health-status-badge.tsx   # FR-135
│   │   ├── inline-password-popover.tsx # Popover+Input for lock toggle (FR-60)
│   │   ├── expiry-picker.tsx         # Calendar+Popover for link expiry (FR-77)
│   │   ├── version-history.tsx       # FR-104-108
│   │   ├── bulk-actions-bar.tsx      # FR-63 checkbox bulk delete
│   │   └── deployment-search.tsx     # FR-36 search + filter
│   │
│   ├── share/
│   │   ├── share-sheet.tsx           # Dialog (desktop) / Sheet (mobile) (FR-206-215)
│   │   ├── copy-link-button.tsx      # one-click copy with "Copied" toast (FR-31, FR-213)
│   │   ├── embed-snippet.tsx         # iframe snippet (FR-86-89)
│   │   ├── qr-code-download.tsx      # QR PNG/SVG download (FR-82-85)
│   │   ├── email-share.tsx           # mailto: link (FR-210)
│   │   └── password-toggle.tsx       # inline password toggle in share sheet (FR-211)
│   │
│   ├── editor/
│   │   ├── code-editor.tsx           # CodeMirror 6 wrapper (FR-51-53)
│   │   ├── file-tree-sidebar.tsx     # file switcher for multi-file (FR-55)
│   │   ├── editor-toolbar.tsx        # Save & Publish button (FR-54)
│   │   ├── diff-summary.tsx          # FR-56
│   │   └── conflict-banner.tsx       # FR-317-318 external update warning
│   │
│   ├── analytics/
│   │   ├── analytics-overview.tsx    # Tabs: Overview / Views / Bandwidth (FR-38-41)
│   │   ├── view-chart.tsx            # daily/weekly time-series (FR-39)
│   │   ├── bandwidth-chart.tsx
│   │   ├── referrer-list.tsx         # FR-40
│   │   ├── usage-panel.tsx           # 3 Progress bars: storage, deployments, bandwidth (FR-168-171)
│   │   ├── sparkline.tsx             # storage trend sparkline (FR-169)
│   │   └── csv-export-button.tsx     # FR-42
│   │
│   ├── workspace/
│   │   ├── member-list.tsx           # FR-236
│   │   ├── invite-form.tsx           # FR-227
│   │   ├── role-select.tsx           # FR-231
│   │   ├── workspace-settings-form.tsx # FR-237
│   │   ├── workspace-danger-zone.tsx # FR-235
│   │   └── namespace-input.tsx       # FR-226
│   │
│   ├── auth/
│   │   ├── login-form.tsx            # magic link input
│   │   ├── oauth-buttons.tsx         # Google + GitHub OAuth
│   │   ├── tos-checkbox.tsx          # FR-227
│   │   └── cookie-consent-banner.tsx # FR-345-349
│   │
│   ├── admin/
│   │   ├── admin-stats-cards.tsx     # FR-176
│   │   ├── user-management-table.tsx # FR-177-179
│   │   ├── abuse-report-queue.tsx    # FR-220-223
│   │   ├── deployment-admin-table.tsx
│   │   ├── stale-deployments.tsx     # FR-182
│   │   └── usage-export-button.tsx   # FR-183
│   │
│   ├── notifications/
│   │   ├── notification-preferences-form.tsx # FR-213
│   │   ├── phone-verify.tsx          # FR-212 OTP flow
│   │   └── changelog-badge.tsx       # FR-296 unread dot
│   │
│   ├── settings/
│   │   ├── account-info.tsx
│   │   ├── session-list.tsx          # FR-264-265
│   │   ├── security-settings.tsx
│   │   └── delete-account-dialog.tsx # FR-256-262
│   │
│   ├── onboarding/
│   │   ├── onboarding-checklist.tsx  # FR-356-357
│   │   ├── celebration-modal.tsx     # FR-358
│   │   ├── trial-banner.tsx          # FR-359
│   │   └── trial-prompt.tsx          # FR-360
│   │
│   ├── serving/
│   │   ├── auto-nav-widget.ts        # standalone JS for injection (FR-64-71)
│   │   ├── password-prompt-form.tsx   # FR-24
│   │   ├── abuse-report-footer.tsx    # FR-219
│   │   └── dropsites-badge.tsx        # FR-247-248
│   │
│   ├── support/
│   │   ├── help-widget.tsx           # FR-289
│   │   └── support-ticket-form.tsx   # FR-290
│   │
│   └── common/
│       ├── offline-banner.tsx        # FR-311
│       ├── empty-state.tsx           # FR-306-310
│       ├── loading-skeleton.tsx
│       ├── error-boundary.tsx
│       ├── confirmation-dialog.tsx
│       └── global-search.tsx         # Command palette Cmd+K (FR-423-425)
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # browser Supabase client
│   │   ├── server.ts                 # server-side Supabase client (cookies)
│   │   ├── admin.ts                  # service-role admin client
│   │   └── middleware.ts             # middleware-compatible client
│   │
│   ├── storage/
│   │   ├── s3-client.ts             # S3-compatible client (R2, MinIO, GCS, Azure) (FR-191)
│   │   ├── supabase-storage.ts      # Supabase Storage for thumbnails, QR, exports
│   │   └── index.ts                 # storage abstraction factory (FR-192)
│   │
│   ├── upload/
│   │   ├── process.ts               # upload processing pipeline
│   │   ├── validate.ts              # file type + size validation (FR-04, FR-197, FR-199)
│   │   ├── zip.ts                   # ZIP extraction + path traversal prevention (NFR-13)
│   │   ├── mime.ts                  # MIME type mapping table (FR-16, FR-193)
│   │   ├── image-optimize.ts        # image compression at ingest (FR-113-116)
│   │   ├── content-hash.ts          # SHA-256 registry (FR-229)
│   │   └── entry-point.ts           # detect index.html / single HTML / directory listing (FR-03, FR-194, FR-195)
│   │
│   ├── slug/
│   │   ├── generate.ts              # adjective-noun-number pattern (FR-09)
│   │   ├── validate.ts              # validation rules (FR-11)
│   │   └── reserved.ts              # reserved word list (api, health, admin, dashboard, etc.)
│   │
│   ├── limits/
│   │   ├── profiles.ts              # limit profile definitions from DB (FR-143)
│   │   ├── get-profile.ts           # getProfile(workspaceId) (FR-141)
│   │   ├── assign-profile.ts        # assignProfile(workspaceId, profileName) (FR-140)
│   │   ├── check.ts                 # pre-upload limit check (FR-151)
│   │   └── bandwidth.ts             # bandwidth tracking + monthly rollup (FR-155-162)
│   │
│   ├── serving/
│   │   ├── resolve.ts               # resolve slug to deployment + files
│   │   ├── password.ts              # bcrypt password verification + rate limit (FR-109-112)
│   │   ├── auto-nav.ts              # navigation detection + widget injection (FR-64-71, FR-117-122)
│   │   ├── headers.ts               # CSP, X-Robots-Tag, Cache-Control, ETag (FR-19, FR-279, FR-341-344)
│   │   ├── lazy-loading.ts          # img loading="lazy" injection (FR-115)
│   │   ├── bot-filter.ts            # UA-based bot detection (FR-331-334)
│   │   ├── badge-inject.ts          # "Published with DropSites" badge (FR-247-248)
│   │   └── redirect.ts              # slug rename redirects + dropsites.json redirects (FR-338-340)
│   │
│   ├── auth/
│   │   ├── session.ts               # session management helpers
│   │   ├── rate-limit.ts            # account creation + deployment creation rate limits (FR-205, FR-217-218)
│   │   ├── permissions.ts           # role-based permission checks (Owner/Publisher/Viewer)
│   │   └── re-auth.ts               # re-authentication gate for sensitive actions (FR-266)
│   │
│   ├── notifications/
│   │   ├── email.ts                 # Resend client (FR-211)
│   │   ├── sms.ts                   # Twilio client (FR-212)
│   │   ├── dispatcher.ts            # notification routing: check prefs -> channel -> send (FR-219)
│   │   ├── preferences.ts           # load/save notification preferences
│   │   ├── rate-limiter.ts          # per-user SMS/email rate limits (FR-221)
│   │   └── templates/
│   │       ├── deployment-published.tsx
│   │       ├── first-view.tsx
│   │       ├── recipient-viewed.tsx
│   │       ├── view-milestone.tsx
│   │       ├── expiry-warning.tsx
│   │       ├── deployment-expired.tsx
│   │       ├── brute-force-alert.tsx
│   │       ├── deployment-takedown.tsx
│   │       ├── abuse-report-filed.tsx
│   │       ├── storage-warning-80.tsx
│   │       ├── storage-full-100.tsx
│   │       ├── bandwidth-warning-80.tsx
│   │       ├── bandwidth-full-100.tsx
│   │       ├── workspace-invite.tsx
│   │       ├── trial-reminder-day7.tsx
│   │       ├── trial-reminder-day12.tsx
│   │       ├── trial-expired.tsx
│   │       ├── licence-expiry.tsx
│   │       ├── admin-abuse-report.tsx
│   │       ├── admin-quarantine.tsx
│   │       ├── admin-auto-suspend.tsx
│   │       ├── admin-safe-browsing-flag.tsx
│   │       ├── admin-anomaly.tsx
│   │       └── admin-weekly-summary.tsx
│   │
│   ├── webhooks/
│   │   ├── fire.ts                  # dispatch webhook with payload (FR-123-125)
│   │   ├── sign.ts                  # HMAC-SHA256 payload signing (FR-128)
│   │   └── retry.ts                 # exponential backoff retry (FR-126)
│   │
│   ├── analytics/
│   │   ├── record.ts               # event recording after bot filter (FR-37)
│   │   ├── query.ts                # analytics aggregation queries
│   │   ├── csv-export.ts           # CSV export (FR-42)
│   │   └── unique-visitor.ts       # unique visitor hashing (30-min window)
│   │
│   ├── health/
│   │   └── check.ts               # deployment health check logic (FR-133-137)
│   │
│   ├── qr/
│   │   └── generate.ts            # QR code generation (PNG + SVG) (FR-82-85)
│   │
│   ├── audit/
│   │   └── log.ts                 # append-only audit log writer (NFR-17)
│   │
│   ├── errors/
│   │   ├── index.ts               # error type definitions
│   │   └── handler.ts             # centralized error handler (no stack traces in prod)
│   │
│   ├── utils/
│   │   ├── date.ts
│   │   ├── format.ts              # file size formatting, etc.
│   │   ├── crypto.ts              # hashing utilities
│   │   └── url.ts                 # URL construction helpers
│   │
│   └── config/
│       ├── env.ts                 # environment variable validation with zod
│       └── constants.ts           # system constants (reserved slugs, MIME map, etc.)
│
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 00001_create_users.sql
│   │   ├── 00002_create_workspaces.sql
│   │   ├── 00003_create_workspace_members.sql
│   │   ├── 00004_create_deployments.sql
│   │   ├── 00005_create_deployment_versions.sql
│   │   ├── 00006_create_deployment_files.sql
│   │   ├── 00007_create_analytics_events.sql
│   │   ├── 00008_create_audit_log.sql
│   │   ├── 00009_create_bandwidth_daily.sql
│   │   ├── 00010_create_sessions_extended.sql
│   │   ├── 00011_create_access_tokens.sql
│   │   ├── 00012_create_api_keys.sql
│   │   ├── 00013_create_abuse_reports.sql
│   │   ├── 00014_create_content_hashes.sql
│   │   ├── 00015_create_webhook_endpoints.sql
│   │   ├── 00016_create_webhook_deliveries.sql
│   │   ├── 00017_create_notification_log.sql
│   │   ├── 00018_create_limit_profiles.sql
│   │   ├── 00019_create_editor_locks.sql
│   │   ├── 00020_create_cookie_consents.sql
│   │   ├── 00021_create_slug_redirects.sql
│   │   ├── 00022_create_custom_domains.sql
│   │   ├── 00023_create_bot_filters.sql
│   │   ├── 00024_create_changelog_entries.sql
│   │   ├── 00025_create_indexes.sql
│   │   ├── 00026_create_rls_policies.sql
│   │   └── 00027_seed_limit_profiles.sql
│   ├── seed.sql
│   └── functions/
│       ├── image-optimize/
│       │   └── index.ts
│       ├── bandwidth-rollup/
│       │   └── index.ts
│       ├── expiry-processor/
│       │   └── index.ts
│       ├── health-check-runner/
│       │   └── index.ts
│       ├── safe-browsing-monitor/
│       │   └── index.ts
│       ├── stale-deployment-check/
│       │   └── index.ts
│       ├── trial-expiry/
│       │   └── index.ts
│       └── bandwidth-reset/
│           └── index.ts
│
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   ├── og-image.png
│   └── auto-nav-widget.js           # standalone auto-nav JS (served to deployments)
│
├── scripts/
│   ├── validate-config.ts            # FR-200 dropsites validate-config
│   └── seed-limit-profiles.ts
│
├── tests/
│   ├── unit/                         # Vitest unit tests
│   ├── integration/                  # Vitest + Supertest integration tests
│   ├── e2e/                          # Playwright E2E tests
│   ├── performance/                  # Lighthouse CI + k6 load tests
│   ├── security/                     # OWASP ZAP config
│   ├── fixtures/                     # test files
│   └── helpers/                      # test utilities
│
└── docs/
    └── self-hosted-runbook.md        # FR-198, M1.15
```

### Architecture Decision: Serving Route

Next.js middleware intercepts all requests. Known paths (`/dashboard`, `/api`, `/login`, `/signup`, etc.) are routed to their App Router handlers. Unknown top-level paths are treated as deployment slug lookups. The middleware queries the deployment table and either (a) proxies the R2 content directly, or (b) redirects to the password prompt if protected. This avoids the complexity of a catch-all route conflicting with dashboard routes.

---

## 2. Supabase Schema

### Table: `users`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | Matches Supabase auth.users.id |
| `email` | `VARCHAR(256)` | UNIQUE, NOT NULL | |
| `display_name` | `VARCHAR(128)` | | |
| `email_verified_at` | `TIMESTAMPTZ` | | NULL until verified |
| `phone_number` | `VARCHAR(32)` | | Nullable, E.164 format |
| `phone_verified_at` | `TIMESTAMPTZ` | | NULL until OTP verified |
| `notification_prefs` | `JSONB` | DEFAULT '{}' | Per-event email/SMS opt-in |
| `referral_code` | `VARCHAR(32)` | UNIQUE | Auto-generated on signup |
| `referred_by` | `UUID` | FK -> users(id) ON DELETE SET NULL | |
| `tos_accepted_at` | `TIMESTAMPTZ` | | FR-227 |
| `tos_version` | `VARCHAR(16)` | | Which TOS version accepted |
| `onboarding_completed` | `BOOLEAN` | DEFAULT false | FR-357 |
| `frozen_at` | `TIMESTAMPTZ` | | Account compromise freeze |
| `suspended_at` | `TIMESTAMPTZ` | | Abuse suspension |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT now() | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft-delete + anonymise |

**Indexes:** `idx_users_email` (unique), `idx_users_referral_code` (unique), `idx_users_created_at`

---

### Table: `workspaces`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | |
| `name` | `VARCHAR(128)` | NOT NULL | |
| `namespace_slug` | `VARCHAR(64)` | UNIQUE | Nullable URL prefix |
| `owner_id` | `UUID` | FK -> users(id), NOT NULL | |
| `is_personal` | `BOOLEAN` | DEFAULT false | Auto-created personal workspace |
| `limit_profile` | `VARCHAR(64)` | DEFAULT 'free', NOT NULL | Profile name |
| `trial_started_at` | `TIMESTAMPTZ` | | Pro trial start |
| `trial_ends_at` | `TIMESTAMPTZ` | | 14 days after start |
| `stripe_customer_id` | `VARCHAR(256)` | | Phase 2 |
| `stripe_subscription_id` | `VARCHAR(256)` | | Phase 2 |
| `data_region` | `VARCHAR(8)` | DEFAULT 'us' | 'us' or 'eu' |
| `white_label_config` | `JSONB` | | Enterprise: logo, brand, colours |
| `sso_config` | `JSONB` | | FR-329: client_id, secret, discovery_url |
| `default_deployment_settings` | `JSONB` | DEFAULT '{}' | Phase 2: FR-395 workspace defaults |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT now() | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft-delete |

**Indexes:** `idx_workspaces_namespace_slug` (unique, partial WHERE deleted_at IS NULL), `idx_workspaces_owner_id`

---

### Table: `workspace_members`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | |
| `workspace_id` | `UUID` | FK -> workspaces(id), NOT NULL | |
| `user_id` | `UUID` | FK -> users(id) | Nullable until invitation accepted |
| `email` | `VARCHAR(256)` | NOT NULL | Invited email (for pending invites) |
| `role` | `VARCHAR(16)` | NOT NULL, CHECK IN ('owner','publisher','viewer') | |
| `invited_by` | `UUID` | FK -> users(id) | |
| `invited_at` | `TIMESTAMPTZ` | DEFAULT now() | |
| `accepted_at` | `TIMESTAMPTZ` | | NULL = pending |
| `invite_token` | `VARCHAR(128)` | UNIQUE | Expires after 7 days |
| `invite_expires_at` | `TIMESTAMPTZ` | | 7 days from invited_at |

**Indexes:** `idx_wm_workspace_user` UNIQUE (workspace_id, user_id) WHERE user_id IS NOT NULL, `idx_wm_invite_token` (unique), `idx_wm_user_id`

**Constraint:** UNIQUE (workspace_id, email)

---

### Table: `deployments`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | |
| `slug` | `VARCHAR(128)` | NOT NULL | Unique within namespace |
| `namespace` | `VARCHAR(64)` | | From workspace namespace_slug |
| `workspace_id` | `UUID` | FK -> workspaces(id), NOT NULL | |
| `owner_id` | `UUID` | FK -> users(id), NOT NULL | Publishing user |
| `entry_path` | `VARCHAR(512)` | NOT NULL | Relative path to entry file |
| `storage_bytes` | `BIGINT` | DEFAULT 0 | Total size of all assets |
| `file_count` | `INTEGER` | DEFAULT 0 | Number of files in deployment |
| `password_hash` | `VARCHAR(256)` | | bcrypt hash, nullable |
| `is_disabled` | `BOOLEAN` | DEFAULT false | Temporary disable (FR-96) |
| `is_admin_disabled` | `BOOLEAN` | DEFAULT false | Admin takedown (FR-222) |
| `classification` | `VARCHAR(16)` | DEFAULT 'internal' | internal/restricted/public |
| `allow_indexing` | `BOOLEAN` | DEFAULT false | FR-342 X-Robots-Tag toggle |
| `auto_nav_enabled` | `BOOLEAN` | DEFAULT true | FR-69 per-deployment toggle |
| `current_version_id` | `UUID` | FK -> deployment_versions(id) | Points to active version |
| `health_status` | `VARCHAR(16)` | DEFAULT 'unknown' | ok/warning/broken/unknown |
| `health_details` | `JSONB` | | List of broken asset paths |
| `health_checked_at` | `TIMESTAMPTZ` | | Last health check time |
| `expires_at` | `TIMESTAMPTZ` | | Auto-deactivation time (FR-77) |
| `dropsites_config` | `JSONB` | | Parsed dropsites.json manifest |
| `total_views` | `BIGINT` | DEFAULT 0 | Denormalized view counter |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT now() | |
| `archived_at` | `TIMESTAMPTZ` | | Soft-delete |
| `last_viewed_at` | `TIMESTAMPTZ` | | FR-182 stale detection |

**Indexes:** `idx_deployments_slug_namespace` UNIQUE (slug, COALESCE(namespace, '')) WHERE archived_at IS NULL, `idx_deployments_workspace_id`, `idx_deployments_owner_id`, `idx_deployments_expires_at` WHERE expires_at IS NOT NULL, `idx_deployments_last_viewed_at`

---

### Table: `deployment_versions`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `deployment_id` | `UUID` | FK -> deployments(id), NOT NULL | |
| `version_number` | `INTEGER` | NOT NULL | Auto-increment per deployment |
| `storage_path` | `VARCHAR(1024)` | NOT NULL | R2 path prefix for this version |
| `storage_bytes` | `BIGINT` | NOT NULL | |
| `file_count` | `INTEGER` | NOT NULL | |
| `source` | `VARCHAR(16)` | NOT NULL | upload/editor/api |
| `published_by` | `UUID` | FK -> users(id) | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | |

**Indexes:** `idx_dv_deployment_version` UNIQUE (deployment_id, version_number), `idx_dv_deployment_id`

---

### Table: `deployment_files`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `deployment_id` | `UUID` | FK -> deployments(id), NOT NULL | |
| `version_id` | `UUID` | FK -> deployment_versions(id), NOT NULL | |
| `file_path` | `VARCHAR(1024)` | NOT NULL | Relative path within deployment |
| `mime_type` | `VARCHAR(128)` | NOT NULL | |
| `size_bytes` | `BIGINT` | NOT NULL | |
| `sha256_hash` | `VARCHAR(64)` | NOT NULL | |
| `storage_key` | `VARCHAR(1024)` | NOT NULL | R2 object key |

**Indexes:** `idx_df_deployment_version` (deployment_id, version_id), `idx_df_sha256`

---

### Table: `analytics_events`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `deployment_id` | `UUID` | FK -> deployments(id), NOT NULL | |
| `viewed_at` | `TIMESTAMPTZ` | DEFAULT now() | |
| `referrer_domain` | `VARCHAR(256)` | | Domain only, no path/PII |
| `user_agent_class` | `VARCHAR(64)` | | browser/bot/api/unknown |
| `visitor_hash` | `VARCHAR(64)` | | Hash of IP+UA for unique visitors |
| `access_token_id` | `UUID` | FK -> access_tokens(id) | Per-recipient tracking (FR-92) |
| `country_code` | `VARCHAR(2)` | | Phase 2: derived from IP (FR-383) |
| `device_class` | `VARCHAR(16)` | | Phase 2: mobile/tablet/desktop (FR-385) |
| `browser_family` | `VARCHAR(64)` | | Phase 2 (FR-385) |
| `bytes_served` | `BIGINT` | | Size of the response |

**Indexes:** `idx_ae_deployment_viewed` (deployment_id, viewed_at), `idx_ae_viewed_at`, `idx_ae_access_token_id`

**Partition strategy:** Consider range-partitioning by `viewed_at` month for scale.

---

### Table: `audit_log`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `actor_id` | `UUID` | FK -> users(id) | Who did it |
| `workspace_id` | `UUID` | FK -> workspaces(id) | |
| `action` | `VARCHAR(64)` | NOT NULL | publish / overwrite / delete / archive / password_set / password_clear / role_change / key_create / key_revoke / member_invite / member_remove / profile_change / freeze / unfreeze / suspend / disable / enable |
| `resource_type` | `VARCHAR(32)` | | deployment / workspace / user / api_key |
| `resource_id` | `UUID` | | |
| `metadata` | `JSONB` | | Action-specific context |
| `ip_hash` | `VARCHAR(64)` | | |
| `occurred_at` | `TIMESTAMPTZ` | DEFAULT now() | |

**Indexes:** `idx_audit_workspace` (workspace_id, occurred_at), `idx_audit_actor` (actor_id, occurred_at), `idx_audit_resource` (resource_type, resource_id)

---

### Table: `bandwidth_daily`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `deployment_id` | `UUID` | FK -> deployments(id), NOT NULL | |
| `date` | `DATE` | NOT NULL | Calendar day |
| `bytes_served` | `BIGINT` | DEFAULT 0 | |
| `request_count` | `INTEGER` | DEFAULT 0 | |

**PK:** (deployment_id, date)

**Indexes:** `idx_bd_date`

---

### Table: `access_tokens`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `deployment_id` | `UUID` | FK -> deployments(id), NOT NULL | |
| `name` | `VARCHAR(128)` | NOT NULL | Recipient name (e.g. "Alice") |
| `token` | `VARCHAR(64)` | UNIQUE, NOT NULL | URL query param value |
| `view_count` | `INTEGER` | DEFAULT 0 | |
| `max_views` | `INTEGER` | | Nullable -- expire after N views |
| `expires_at` | `TIMESTAMPTZ` | | Nullable |
| `last_viewed_at` | `TIMESTAMPTZ` | | |
| `revoked_at` | `TIMESTAMPTZ` | | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | |

**Indexes:** `idx_at_token` (unique), `idx_at_deployment_id`

---

### Table: `api_keys`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `workspace_id` | `UUID` | FK -> workspaces(id), NOT NULL | |
| `user_id` | `UUID` | FK -> users(id), NOT NULL | |
| `name` | `VARCHAR(128)` | NOT NULL | |
| `key_hash` | `VARCHAR(256)` | UNIQUE, NOT NULL | SHA-256 hash of key |
| `key_prefix` | `VARCHAR(8)` | NOT NULL | First 8 chars for display |
| `last_used_at` | `TIMESTAMPTZ` | | |
| `revoked_at` | `TIMESTAMPTZ` | | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | |

**Indexes:** `idx_ak_key_hash` (unique), `idx_ak_workspace_id`

---

### Table: `abuse_reports`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `deployment_id` | `UUID` | FK -> deployments(id), NOT NULL | |
| `reporter_email` | `VARCHAR(256)` | NOT NULL | |
| `reason` | `VARCHAR(32)` | NOT NULL | phishing / malware / csam / copyright / other |
| `description` | `TEXT` | | |
| `status` | `VARCHAR(16)` | DEFAULT 'open' | open / reviewing / confirmed / dismissed |
| `resolved_by` | `UUID` | FK -> users(id) | Admin who resolved |
| `resolved_at` | `TIMESTAMPTZ` | | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | |

**Indexes:** `idx_ar_status`, `idx_ar_deployment_id`

---

### Table: `content_hashes`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `sha256_hash` | `VARCHAR(64)` | PK | |
| `blocked` | `BOOLEAN` | DEFAULT false | True if previously removed for abuse |
| `blocked_at` | `TIMESTAMPTZ` | | |
| `blocked_reason` | `VARCHAR(64)` | | |
| `first_seen_at` | `TIMESTAMPTZ` | DEFAULT now() | |

---

### Table: `webhook_endpoints`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `workspace_id` | `UUID` | FK -> workspaces(id), NOT NULL | |
| `deployment_id` | `UUID` | FK -> deployments(id) | Nullable = org-wide |
| `url` | `VARCHAR(2048)` | NOT NULL | |
| `secret` | `VARCHAR(256)` | NOT NULL | HMAC signing secret |
| `events` | `TEXT[]` | NOT NULL | Array of event types |
| `active` | `BOOLEAN` | DEFAULT true | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | |

---

### Table: `webhook_deliveries`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `webhook_id` | `UUID` | FK -> webhook_endpoints(id) | |
| `event_type` | `VARCHAR(64)` | NOT NULL | |
| `payload` | `JSONB` | NOT NULL | |
| `response_code` | `INTEGER` | | |
| `response_body` | `TEXT` | | Truncated to 1KB |
| `attempt_count` | `INTEGER` | DEFAULT 1 | |
| `status` | `VARCHAR(16)` | | pending / delivered / failed |
| `delivered_at` | `TIMESTAMPTZ` | | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | |

---

### Table: `notification_log`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `user_id` | `UUID` | FK -> users(id) | |
| `event_type` | `VARCHAR(64)` | NOT NULL | |
| `channel` | `VARCHAR(8)` | NOT NULL | email / sms |
| `recipient_masked` | `VARCHAR(256)` | | e.g. `a***@example.com` |
| `status` | `VARCHAR(16)` | | sent / failed / rate_limited |
| `attempts` | `INTEGER` | DEFAULT 1 | |
| `provider_id` | `VARCHAR(256)` | | Resend/Twilio message ID |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | |

---

### Table: `limit_profiles`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `name` | `VARCHAR(64)` | PK | free / pro / team / enterprise |
| `max_deployments` | `INTEGER` | | -1 = unlimited |
| `max_deploy_size_bytes` | `BIGINT` | | Per-deployment |
| `max_total_storage_bytes` | `BIGINT` | | Per-workspace |
| `max_monthly_bandwidth_bytes` | `BIGINT` | | -1 = unlimited |
| `max_file_size_bytes` | `BIGINT` | | Per individual file in ZIP |
| `version_history_count` | `INTEGER` | DEFAULT 1 | Versions retained |
| `custom_domain_allowed` | `BOOLEAN` | DEFAULT false | |
| `access_tokens_allowed` | `BOOLEAN` | DEFAULT false | |
| `max_access_tokens` | `INTEGER` | DEFAULT 0 | Per deployment |
| `webhooks_allowed` | `BOOLEAN` | DEFAULT false | |
| `api_rpm` | `INTEGER` | DEFAULT 0 | API requests per minute |
| `api_daily_quota` | `INTEGER` | DEFAULT 0 | |
| `api_monthly_quota` | `INTEGER` | DEFAULT 0 | |
| `remove_badge` | `BOOLEAN` | DEFAULT false | FR-248 |
| `workspace_sso_allowed` | `BOOLEAN` | DEFAULT false | FR-328 |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT now() | |

---

### Table: `editor_locks`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `deployment_id` | `UUID` | PK, FK -> deployments(id) | |
| `user_id` | `UUID` | FK -> users(id), NOT NULL | |
| `opened_at` | `TIMESTAMPTZ` | DEFAULT now() | |
| `expires_at` | `TIMESTAMPTZ` | | 30 min from opened_at |

---

### Table: `cookie_consents`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `user_agent` | `VARCHAR(512)` | | |
| `ip_hash` | `VARCHAR(64)` | | |
| `consent_version` | `VARCHAR(16)` | NOT NULL | |
| `consented_at` | `TIMESTAMPTZ` | DEFAULT now() | |

---

### Table: `slug_redirects`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `old_slug` | `VARCHAR(128)` | PK | |
| `old_namespace` | `VARCHAR(64)` | | |
| `new_slug` | `VARCHAR(128)` | NOT NULL | |
| `new_namespace` | `VARCHAR(64)` | | |
| `deployment_id` | `UUID` | FK -> deployments(id) | |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | 90 days from rename |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | |

---

### Table: `custom_domains`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `deployment_id` | `UUID` | FK -> deployments(id), NOT NULL | |
| `domain` | `VARCHAR(256)` | UNIQUE, NOT NULL | |
| `verification_status` | `VARCHAR(16)` | DEFAULT 'pending' | pending / verified / error |
| `cname_target` | `VARCHAR(256)` | NOT NULL | |
| `tls_provisioned` | `BOOLEAN` | DEFAULT false | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | |
| `verified_at` | `TIMESTAMPTZ` | | |

---

### Table: `bot_filters`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `pattern` | `VARCHAR(256)` | UNIQUE, NOT NULL | UA substring or regex |
| `category` | `VARCHAR(32)` | | crawler / healthcheck / scraper |
| `active` | `BOOLEAN` | DEFAULT true | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT now() | |

---

### Table: `changelog_entries`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `title` | `VARCHAR(256)` | NOT NULL | |
| `content` | `TEXT` | NOT NULL | Markdown |
| `is_breaking` | `BOOLEAN` | DEFAULT false | FR-297 |
| `published_at` | `TIMESTAMPTZ` | DEFAULT now() | |

---

### RLS Policies

All RLS policies enforce workspace-level permissions:

1. **users**: Users can only read/update their own row.
2. **workspaces**: Users can only access workspaces they are a member of (JOIN workspace_members).
3. **workspace_members**: Users can only see members of workspaces they belong to. Only owners can INSERT/UPDATE/DELETE.
4. **deployments**: Users can only SELECT deployments where workspace_id is in their workspace memberships. Only owners and the deployment owner can UPDATE/DELETE. Viewers cannot INSERT.
5. **analytics_events**: Users can only SELECT events for deployments in their workspaces.
6. **audit_log**: Users can only SELECT audit entries for their workspaces.
7. **bandwidth_daily**: Same as analytics -- workspace membership check.
8. **access_tokens**: Only deployment owner or workspace owner can manage.
9. **api_keys**: Users can only see/manage their own keys within their workspaces.
10. **webhook_endpoints**: Workspace membership required.
11. **editor_locks**: Workspace membership required.

All policies use `auth.uid()` for the current user and join through `workspace_members` to verify access.

---

## 3. Cloudflare R2 Structure

### Bucket Naming

| Bucket | Purpose | Region |
|--------|---------|--------|
| `dropsites-deployments-us` | Primary deployment files (US) | US (default) |
| `dropsites-deployments-eu` | EU deployment files | EU (FR-270) |
| `dropsites-backups` | Phase 2: daily backups (different region) | Opposite of primary |

### Folder Structure

```
dropsites-deployments-{region}/
└── {workspace_id}/
    └── {deployment_id}/
        └── v{version_number}/
            ├── index.html
            ├── styles.css
            ├── script.js
            ├── assets/
            │   ├── logo.png
            │   └── font.woff2
            └── dropsites.json        # stored but never served to visitors
```

### Naming Conventions

- **Object keys:** `{workspace_id}/{deployment_id}/v{version_number}/{relative_path}`
- **Workspace ID and Deployment ID:** UUIDs (lowercase, no dashes for key efficiency)
- **Version number:** integer, zero-padded to 4 digits: `v0001`, `v0002`
- **Paths:** preserve original directory structure from upload; normalized to lowercase
- **dropsites.json:** stored in R2 for reference but filtered from public serving

### Content-Type Metadata

Every object stored with correct `Content-Type` metadata set at upload time using the MIME mapping table in `lib/upload/mime.ts`.

---

## 4. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server only) |
| `SUPABASE_JWT_SECRET` | Yes | JWT secret for token validation in middleware |
| `DATABASE_URL` | Yes | Direct PostgreSQL connection string (for migrations) |
| `R2_ACCOUNT_ID` | Yes | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Yes | R2 S3-compatible access key |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 S3-compatible secret key |
| `R2_BUCKET_NAME` | Yes | Primary R2 bucket name |
| `R2_ENDPOINT` | Yes | R2 S3-compatible endpoint URL |
| `R2_PUBLIC_URL` | Yes | Public CDN URL for serving R2 files |
| `R2_EU_BUCKET_NAME` | Optional | EU region bucket (for data residency) |
| `R2_EU_ENDPOINT` | Optional | EU region endpoint |
| `NEXT_PUBLIC_BASE_URL` | Yes | Base URL of the application (e.g. `https://dropsites.app`) |
| `NEXT_PUBLIC_SERVING_DOMAIN` | Yes | Domain for served deployments (e.g. `dropsites.app`) |
| `RESEND_API_KEY` | Yes | Resend API key for transactional email |
| `RESEND_FROM_EMAIL` | Yes | Sender email address (e.g. `noreply@dropsites.app`) |
| `TWILIO_ACCOUNT_SID` | Yes | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Yes | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Yes | Twilio sender phone number |
| `SENTRY_DSN` | Yes | Sentry DSN for error monitoring |
| `SENTRY_AUTH_TOKEN` | Optional | Sentry auth token for source map uploads |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth client secret |
| `ADMIN_EMAIL` | Yes | Platform admin email for abuse/alert notifications |
| `ADMIN_PHONE` | Optional | Platform admin phone for SMS alerts |
| `CLOUDFLARE_API_TOKEN` | Yes | Cloudflare API token for cache invalidation |
| `CLOUDFLARE_ZONE_ID` | Yes | Cloudflare zone ID for dropsites.app |
| `SMTP_HOST` | Optional | Self-hosted: custom SMTP host (FR-222) |
| `SMTP_PORT` | Optional | Self-hosted: custom SMTP port |
| `SMTP_USER` | Optional | Self-hosted: custom SMTP user |
| `SMTP_PASS` | Optional | Self-hosted: custom SMTP password |
| `STORAGE_BACKEND` | Optional | `r2` (default) / `s3` / `gcs` / `azure` / `local` (FR-192) |
| `DATABASE_BACKEND` | Optional | `postgresql` (default) / `sqlite` (FR-193) |
| `STRIPE_SECRET_KEY` | Phase 2 | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Phase 2 | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Phase 2 | Stripe publishable key |
| `SAFE_BROWSING_API_KEY` | Phase 2 | Google Safe Browsing API key |
| `VIRUSTOTAL_API_KEY` | Phase 2 | VirusTotal API key |
| `LICENCE_KEY` | Optional | Enterprise licence key (FR-202) |
| `NODE_ENV` | Yes | `development` / `production` / `test` |
| `LOG_LEVEL` | Optional | `debug` / `info` / `warn` / `error` (default: `info`) |

---

## 5. Phase 1 Implementation Sequence (M1.1 -- M1.25)

### M1.1 -- Docker image builds and runs locally

**Gate:** `docker compose up` serves a working app; `/health` returns 200
**Tests:** T-PERF-07 (manual health check)

| # | Task | FRs/NFRs |
|---|------|----------|
| 1 | Initialize Next.js 15 project with App Router, TypeScript, Tailwind v4, Geist font | -- |
| 2 | Install and configure shadcn/ui with `components.json` | -- |
| 3 | Configure Supabase client libraries (`@supabase/supabase-js`, `@supabase/ssr`) | -- |
| 4 | Write all Supabase migration SQL files (all tables from Section 2) | NFR-33 |
| 5 | Create Dockerfile (single container) and docker-compose.yml with Supabase local dev | NFR-29 |
| 6 | Implement environment variable validation with zod (`lib/config/env.ts`) | NFR-30 |
| 7 | Implement `/api/health` route returning service status JSON | NFR-17, FR-201/315 |
| 8 | Configure Sentry for error monitoring | -- |
| 9 | Set up ESLint, Prettier, Vitest, Playwright configs | -- |
| 10 | Create root layout with Geist font, Sonner toast provider | -- |
| 11 | Create basic marketing layout and landing page shell | -- |

---

### M1.2 -- Multi-format upload, slug assignment, static serving

**Gate:** T-UPL-01 through T-UPL-17, T-SRV-20
**Tests:** T-UPL-*, T-SLG-01-05

| # | Task | FRs/NFRs |
|---|------|----------|
| 12 | Implement S3-compatible storage client (`lib/storage/s3-client.ts`) | FR-191 |
| 13 | Implement storage abstraction factory (`lib/storage/index.ts`) | FR-192 |
| 14 | Implement MIME type mapping table (`lib/upload/mime.ts`) | FR-16, FR-193, FR-198 |
| 15 | Implement file validation: type check, size check, server-side execution rejection | FR-04, FR-05, FR-149, FR-153, FR-197, FR-199, NFR-12 |
| 16 | Implement ZIP extraction with path traversal prevention | FR-02, FR-03, NFR-13 |
| 17 | Implement entry point detection (index.html / single HTML / directory listing) | FR-03, FR-194, FR-195 |
| 18 | Implement bare JS wrapping in HTML shell | FR-196 |
| 19 | Implement slug generation (adjective-noun-number) | FR-09 |
| 20 | Implement slug validation (reserved words, uniqueness, URL-safe) | FR-10, FR-11, FR-14 |
| 21 | Implement upload API route: `POST /api/v1/deployments` | FR-01, FR-02, FR-07, FR-08 |
| 22 | Implement upload processing pipeline (validate -> extract -> store -> create DB record) | FR-01-08 |
| 23 | Implement deployment file serving via middleware | FR-15, FR-16, FR-17, FR-20 |
| 24 | Implement correct MIME type serving for all supported types | FR-193, FR-198 |
| 25 | Implement WASM serving with COEP headers | FR-198 |
| 26 | Implement PDF inline serving | FR-08 |
| 27 | Write upload zone UI component with drag-and-drop + click-to-browse | FR-01, FR-07 |
| 28 | Implement real-time upload progress indicator | FR-06 |
| 29 | Implement upload success screen with URL display and copy button | -- |
| 30 | Implement slug input with live URL preview | FR-10, FR-12 |
| 31 | Implement content hash registry (SHA-256 of every uploaded file) | FR-229 |

---

### M1.3 -- Limit profile system

**Gate:** T-LIM-01 through T-LIM-14
**Tests:** T-LIM-*

| # | Task | FRs/NFRs |
|---|------|----------|
| 32 | Create limit_profiles table and seed free/pro/team/enterprise profiles | FR-139, FR-143 |
| 33 | Implement `getProfile(workspaceId)` internal API | FR-141 |
| 34 | Implement `assignProfile(workspaceId, profileName)` internal API | FR-140, FR-146 |
| 35 | Implement pre-upload limit checking (deployment count, size, storage cap) | FR-147-152 |
| 36 | Implement fail-fast rejection with specific error messages | FR-151, FR-186 |
| 37 | Implement upload zone quota display (remaining storage, deployment count) | FR-152, FR-185 |
| 38 | Implement upload zone disabled state when storage full | FR-187, FR-188 |
| 39 | Implement limit enforcement UX: no partial uploads on failure | FR-190 |
| 40 | Implement per-file size limits within ZIP | FR-149, FR-154 |

---

### M1.4 -- Authentication (magic link + Google OAuth + GitHub OAuth)

**Gate:** T-AUTH-01 through T-AUTH-08
**Tests:** T-AUTH-*

| # | Task | FRs/NFRs |
|---|------|----------|
| 41 | Configure Supabase Auth: magic link, Google OAuth, GitHub OAuth | FR-200 |
| 42 | Implement login page with magic link input and OAuth buttons | FR-200 |
| 43 | Implement auth callback and confirmation routes | -- |
| 44 | Implement auto-provisioning on first login (create user + personal workspace) | FR-202, FR-224 |
| 45 | Implement email verification gate (block publishing until verified) | FR-204, FR-216 |
| 46 | Implement account creation rate limit (5 per IP per hour) | FR-205, FR-218 |
| 47 | Implement TOS acceptance at signup with timestamp storage | FR-227 |
| 48 | Implement Next.js middleware auth check for dashboard routes | -- |
| 49 | Implement session management using Supabase JWT tokens | FR-263 |
| 50 | Implement session list display and termination | FR-264, FR-265 |
| 51 | Implement re-authentication gate for sensitive actions | FR-266 |
| 52 | Implement admin force-terminate all sessions | FR-268 |

---

### M1.5 -- Publisher dashboard

**Gate:** T-PERM-01 through T-PERM-08, Playwright dashboard E2E
**Tests:** Full dashboard walkthrough

| # | Task | FRs/NFRs |
|---|------|----------|
| 53 | Implement authenticated dashboard layout (sidebar, top-nav, workspace selector) | FR-234 |
| 54 | Implement deployment table with sortable columns | FR-29, FR-30 |
| 55 | Implement one-click copy URL on each row | FR-31 |
| 56 | Implement deployment row actions menu: Lock, Update, Duplicate, Rename, Delete | FR-58-63 |
| 57 | Implement inline password toggle via Popover+Input | FR-60 |
| 58 | Implement inline upload zone for row-level update | FR-61 |
| 59 | Implement lock badge on protected deployment rows | FR-62 |
| 60 | Implement delete with AlertDialog confirmation | FR-34, FR-59 |
| 61 | Implement overwrite (PUT) deployment content | FR-33 |
| 62 | Implement slug rename with old slug redirect | FR-32, FR-338-340 |
| 63 | Implement deployment search and filter | FR-36 |
| 64 | Implement bulk delete with checkbox selection | FR-63 |
| 65 | Implement deployment detail page | FR-30 |
| 66 | Implement temporary disable/reactivate | FR-96-99 |
| 67 | Implement duplicate deployment | FR-100-103 |
| 68 | Implement deployment health check (background, after publish/overwrite) | FR-133-137 |
| 69 | Implement health status badge on dashboard rows | FR-135-136 |
| 70 | Implement workspace management: create, settings, members, roles | FR-224-240 |
| 71 | Implement workspace invitation flow (email invite, accept, role assignment) | FR-227-229 |
| 72 | Implement workspace member list with role display | FR-236 |
| 73 | Implement deployment ownership transfer on member removal | FR-232-233 |
| 74 | Implement role-based permission checks across all routes | FR-25-27, FR-230, FR-238-239 |
| 75 | Implement RLS policies for all tables | -- |

---

### M1.6 -- Password protection + brute-force rate limiting

**Gate:** T-PERM-16 through T-PERM-18, T-SEC-07
**Tests:** Attack simulation

| # | Task | FRs/NFRs |
|---|------|----------|
| 76 | Implement password set/remove on deployment (bcrypt hash) | FR-23 |
| 77 | Implement password prompt page for protected deployments | FR-24 |
| 78 | Implement password verification at serving layer | FR-24 |
| 79 | Implement brute-force rate limiting (5 failures / 10 min -> 15-min lockout) | FR-109 |
| 80 | Return generic error on failure (no reveal if deployment exists) | FR-110 |
| 81 | Log all failed password attempts to audit log | FR-111 |
| 82 | Enforce minimum password length (8 chars) | FR-112 |
| 83 | Implement direct asset URL bypass protection (403, not the asset) | T-SEC-07 |

---

### M1.7 -- In-browser code editor

**Gate:** T-DAT-09, T-AUTH-19, Playwright editor E2E
**Tests:** Edit -> publish -> verify live

| # | Task | FRs/NFRs |
|---|------|----------|
| 84 | Install and configure CodeMirror 6 with HTML/CSS/JS syntax highlighting | FR-53 |
| 85 | Implement editor page with file tree sidebar for multi-file deployments | FR-51, FR-52, FR-55 |
| 86 | Implement Save & Publish (update R2 + DB in one click) | FR-54 |
| 87 | Implement diff summary of changes since last publish | FR-56 |
| 88 | Implement auto-save local draft on close without publishing | FR-57 |
| 89 | Implement editor lock system (editor_locks table) | FR-316 |
| 90 | Implement conflict detection (external overwrite warning) | FR-317-318 |
| 91 | Implement conflict resolution options (discard, keep, view diff) | FR-318 |
| 92 | Implement editor lock expiry (30 min inactivity) | FR-319 |
| 93 | Implement session validity check before publish | FR-267 |

---

### M1.8 -- Auto-navigation widget

**Gate:** T-SRV-17 through T-SRV-19
**Tests:** Multi-page deployment test

| # | Task | FRs/NFRs |
|---|------|----------|
| 94 | Implement inter-page navigation link detection in multi-file deployments | FR-64 |
| 95 | Build standalone auto-nav widget JS (collapsed button, expands on click) | FR-65, FR-66 |
| 96 | Implement page list with human-readable names | FR-67 |
| 97 | Implement page title inference: `<title>` -> `<h1>` -> filename | FR-117-119 |
| 98 | Implement alphabetical page ordering (default) | FR-120 |
| 99 | Implement dropsites.json manifest parsing for custom page order/labels | FR-121-122 |
| 100 | Implement active page highlighting in widget | FR-68 |
| 101 | Implement per-deployment widget disable toggle | FR-69 |
| 102 | Ensure widget is responsive on mobile | FR-70 |
| 103 | Inject widget at serve time -- never modify source files | FR-65 |
| 104 | Ensure async loading -- no render-blocking | NFR-11 |

---

### M1.9 -- QR code, embed snippet, link expiry, share sheet

**Gate:** T-XBRO-10, Playwright share sheet E2E
**Tests:** Share flow walkthrough

| # | Task | FRs/NFRs |
|---|------|----------|
| 105 | Implement share sheet modal (Dialog desktop, Sheet mobile) | FR-206-215 |
| 106 | Implement copy link with "Copied" toast | FR-208, FR-213 |
| 107 | Implement QR code generation (PNG + SVG) | FR-82-85 |
| 108 | Implement embed snippet generation with customizable dimensions | FR-86-89 |
| 109 | Implement email share (mailto: with URL pre-filled) | FR-210 |
| 110 | Implement inline password toggle in share sheet | FR-211 |
| 111 | Implement share sheet on post-upload success screen | FR-212 |
| 112 | Implement link expiry: set date/time picker via Calendar+Popover | FR-77, FR-80 |
| 113 | Implement expiry enforcement (deactivate, show branded expired page) | FR-78 |
| 114 | Implement reactivation of expired deployment | FR-79 |
| 115 | Implement expiry date badge on deployment rows | FR-80 |
| 116 | Implement keyboard navigation and screen reader accessibility for share sheet | FR-214, FR-352 |

---

### M1.10 -- Email + SMS notification system

**Gate:** T-NOT-01 through T-NOT-21
**Tests:** Each notification type triggered and received

| # | Task | FRs/NFRs |
|---|------|----------|
| 117 | Implement Resend email client | FR-211 |
| 118 | Implement Twilio SMS client | FR-212 |
| 119 | Implement notification dispatcher with preference checking | FR-213-216, FR-219 |
| 120 | Implement all publisher notification email templates (14 types) | FR-211 |
| 121 | Implement all admin notification templates (7 types) | FR-218 |
| 122 | Implement notification preferences UI | FR-213 |
| 123 | Implement phone number collection + OTP verification | FR-212, FR-214 |
| 124 | Implement one-click unsubscribe link per notification type | FR-216 |
| 125 | Implement notification rate limiting (10 SMS/hour, 50 email/day) | FR-221 |
| 126 | Implement notification delivery retry with exponential backoff | FR-219 |
| 127 | Implement notification send log (admin visible) | FR-220 |
| 128 | Implement configurable admin email and phone | FR-218 |
| 129 | Ensure all emails are plain-text compatible | FR-217 |
| 130 | Implement self-hosted SMTP config option | FR-222 |
| 131 | Implement self-hosted Twilio credentials config | FR-223 |

---

### M1.11 -- Abuse Prevention Posture A

**Gate:** T-SEC-12, T-AUTH-13, T-AUTH-14, T-UPL-20
**Tests:** Abuse simulation

| # | Task | FRs/NFRs |
|---|------|----------|
| 132 | Implement deployment creation rate limit (10/hour, 50/day per account) | FR-217 |
| 133 | Implement "Report abuse" link in footer of every served page | FR-219 |
| 134 | Implement abuse report form (email, reason, description) | FR-220 |
| 135 | Implement abuse report -> admin email/SMS notification | FR-221 |
| 136 | Implement admin console: disable deployment in one click | FR-222 |
| 137 | Implement admin console: suspend account | FR-223 |
| 138 | Implement disabled deployment "content unavailable" page | FR-224 |
| 139 | Publish DMCA takedown page at /dmca | FR-225 |
| 140 | Publish Terms of Service and Acceptable Use Policy | FR-226 |
| 141 | Implement content hash registry: block re-upload of removed content | FR-229 |
| 142 | Implement auto-suspension after 3 confirmed takedowns | FR-230 |
| 143 | Implement daily Safe Browsing domain monitoring (Edge Function cron) | FR-228 |

---

### M1.12 -- Audit log + analytics

**Gate:** T-ANL-01 through T-ANL-11
**Tests:** Data verified against real traffic

| # | Task | FRs/NFRs |
|---|------|----------|
| 144 | Implement analytics event recording at serving layer | FR-37 |
| 145 | Implement total views and unique visitor count per deployment | FR-38 |
| 146 | Implement daily/weekly time-series view chart (Tabs component) | FR-39 |
| 147 | Implement referrer domain recording (no PII) | FR-40 |
| 148 | Implement org-wide usage summary for admins | FR-41 |
| 149 | Implement CSV analytics export | FR-42 |
| 150 | Implement bandwidth daily tracking (bytes served per deployment per day) | FR-155-156 |
| 151 | Implement monthly bandwidth enforcement with branded limit page | FR-157-158 |
| 152 | Implement bandwidth counter reset on 1st of each month (Edge Function) | FR-162 |
| 153 | Implement usage panel: storage/deployments/bandwidth with progress bars | FR-168-171 |
| 154 | Implement storage trend sparkline | FR-169 |
| 155 | Implement email alerts at 80% and 100% of storage/bandwidth quotas | FR-172-174 |
| 156 | Implement audit log writer for all state-changing actions | NFR-17, FR-146, FR-240 |
| 157 | Implement admin usage panel: per-user breakdown, top 10 lists | FR-176-184 |
| 158 | Implement admin CSV export | FR-183 |

---

### M1.13 -- Performance pass

**Gate:** T-PERF-07 through T-PERF-09 (Lighthouse >= 90)
**Tests:** Lighthouse CI

| # | Task | FRs/NFRs |
|---|------|----------|
| 159 | Enable Brotli + gzip compression on all text assets | NFR-07 |
| 160 | Implement aggressive cache headers on versioned static assets | NFR-06 |
| 161 | Implement no-cache on index.html / mutable content | FR-19 |
| 162 | Implement CDN cache invalidation on deployment overwrite (Cloudflare API) | NFR-12 |
| 163 | Implement image compression at ingest (>200KB auto-compress) | FR-113 |
| 164 | Implement PNG->WebP conversion where >20% savings | FR-114 |
| 165 | Implement lazy loading injection on `<img>` tags at serve time | FR-115 |
| 166 | Implement storage saving summary after ingest | FR-116 |
| 167 | Ensure auto-nav widget loads async with no render-blocking | NFR-11 |
| 168 | Implement page skeletons for data loading states | -- |
| 169 | Run and pass Lighthouse CI (score >= 90) | NFR-01-13 |

---

### M1.14 -- Security review

**Gate:** T-SEC-01 through T-SEC-13
**Tests:** Security sign-off

| # | Task | FRs/NFRs |
|---|------|----------|
| 170 | Implement CSP for dashboard (strict: no unsafe-inline, no unsafe-eval) | FR-282 |
| 171 | Implement default CSP for served deployments | FR-279 |
| 172 | Implement dropsites.json CSP override support | FR-280 |
| 173 | Implement X-Frame-Options: DENY on dashboard | T-SEC-11 |
| 174 | Implement path traversal prevention in serving layer | NFR-13, T-SEC-05 |
| 175 | Implement CSRF protection on all state-changing endpoints | NFR-16 |
| 176 | Implement XSS prevention (HTML escape all user content) | NFR-15 |
| 177 | Implement parameterized queries throughout (SQL injection prevention) | T-SEC-01 |
| 178 | Ensure no stack traces or internal paths in error responses | FR-314, T-SEC-15 |
| 179 | Run npm audit and resolve all critical CVEs | NFR-19 |
| 180 | Run OWASP ZAP automated scan and resolve findings | T-SEC-13 |
| 181 | Document CSP rationale in self-hosted runbook | FR-283 |

---

### M1.15 -- Self-hosted runbook

**Gate:** Clean install on fresh server
**Tests:** Manual verification

| # | Task | FRs/NFRs |
|---|------|----------|
| 182 | Write self-hosted runbook: docker-compose, env var reference, first-run checklist | FR-197, FR-198, FR-200 |
| 183 | Implement `validate-config` script | FR-200 |
| 184 | Document cloud mapping reference | FR-198 |
| 185 | Implement health check endpoint with separate storage/database/licence status | FR-201 |

---

### M1.16 -- Trial period system

**Gate:** Trial flow end-to-end

| # | Task | FRs/NFRs |
|---|------|----------|
| 186 | Implement 14-day Pro trial on signup | FR-241 |
| 187 | Implement trial countdown in dashboard | FR-242, FR-359 |
| 188 | Implement trial expiry: revert to free profile, no content deleted | FR-243 |
| 189 | Implement trial expiry notifications (day 7, 12, 14) | FR-244 |
| 190 | Implement once-per-email trial restriction | FR-245 |
| 191 | Implement trial expiry Edge Function (cron) | -- |

---

### M1.17 -- Status page

**Gate:** Status page reflects real health check

| # | Task | FRs/NFRs |
|---|------|----------|
| 192 | Set up status page at status.dropsites.app | FR-293 |
| 193 | Implement automated health posting from `/health` endpoint | FR-294 |
| 194 | Implement incident history display | FR-294 |

---

### M1.18 -- Bot filtering in analytics

**Gate:** T-ANL-02, T-ANL-03, T-ANL-15
**Tests:** Bot traffic verified as filtered

| # | Task | FRs/NFRs |
|---|------|----------|
| 195 | Implement bot filter using configurable pattern list in database | FR-331-334 |
| 196 | Seed bot filter with Googlebot, Bingbot, Slurp, DuckDuckBot, health checkers | FR-332 |
| 197 | Separate bot events in admin analytics | FR-333 |
| 198 | Ensure filter is updatable without deploy | FR-334 |

---

### M1.19 -- Custom 404 + redirect rules

**Gate:** 404.html served correctly, old slug redirects
**Tests:** T-SLG-06, T-SLG-11, T-SLG-12

| # | Task | FRs/NFRs |
|---|------|----------|
| 199 | Implement custom 404.html serving within deployment (HTTP 404 status) | FR-335-337 |
| 200 | Implement platform branded 404 fallback | FR-18 |
| 201 | Implement slug rename -> 301 redirect for 90 days | FR-338 |
| 202 | Implement dropsites.json custom redirect rules | FR-339-340 |

---

### M1.20 -- Robots.txt control

**Gate:** Googlebot blocked by default
**Tests:** T-SRV-14 through T-SRV-16

| # | Task | FRs/NFRs |
|---|------|----------|
| 203 | Implement default X-Robots-Tag: noindex, nofollow on all deployment responses | FR-341 |
| 204 | Implement per-deployment indexing toggle | FR-342 |
| 205 | Implement custom robots.txt override | FR-343 |

---

### M1.21 -- Cookie consent

**Gate:** Legal review sign-off

| # | Task | FRs/NFRs |
|---|------|----------|
| 206 | Implement cookie consent banner on dashboard | FR-345 |
| 207 | Implement consent recording (timestamp, UA, IP hash, version) | FR-346 |
| 208 | Ensure served deployments do NOT get cookie consent injected | FR-347 |
| 209 | Publish cookie policy at /cookies | FR-348 |
| 210 | Ensure strictly necessary cookies only before consent | FR-349 |

---

### M1.22 -- Accessibility audit

**Gate:** T-A11Y-01 through T-A11Y-09 (axe zero critical)
**Tests:** Axe automated + keyboard manual

| # | Task | FRs/NFRs |
|---|------|----------|
| 211 | WCAG 2.1 AA compliance pass on all dashboard UI | FR-350 |
| 212 | Upload zone keyboard + screen reader accessibility | FR-351 |
| 213 | Share sheet modal focus trap (Escape, Tab cycle, focus return) | FR-352 |
| 214 | Password prompt page accessibility | FR-353 |
| 215 | All system pages accessibility (404, expiry, bandwidth limit, unavailable) | FR-354 |
| 216 | Run axe automated audit | FR-355 |
| 217 | Manual keyboard walkthrough of all flows | -- |

---

### M1.23 -- Onboarding flow

**Gate:** New user activation walkthrough

| # | Task | FRs/NFRs |
|---|------|----------|
| 218 | Implement 3-step onboarding checklist (upload, share, invite) | FR-356-357 |
| 219 | Implement first deployment celebration screen (confetti, timing, share) | FR-358 |
| 220 | Implement trial countdown in dashboard header | FR-359 |
| 221 | Implement day-7 in-product trial prompt | FR-360 |
| 222 | Implement empty states: empty dashboard, empty workspace, empty analytics, empty search | FR-306-310 |

---

### M1.24 -- SaaS team SSO

**Gate:** Full team SSO login tested

| # | Task | FRs/NFRs |
|---|------|----------|
| 223 | Implement workspace OIDC config for Google Workspace (Team profile) | FR-328-330 |
| 224 | Implement SSO config UI: client ID, secret, discovery URL | FR-329 |
| 225 | Implement SSO redirect on workspace login (disable magic link + OAuth for that workspace) | FR-330 |

---

### M1.25 -- Public launch

**Gate:** Full E2E suite green on production (smoke test)
**Tests:** All Phase 1 tests

| # | Task | FRs/NFRs |
|---|------|----------|
| 226 | Deploy to Cloudflare CDN with production domain | -- |
| 227 | Configure DNS for dropsites.app | -- |
| 228 | Run full E2E test suite against production | -- |
| 229 | Verify status page is live and reflecting real health | FR-293 |
| 230 | Verify all legal pages are published (TOS, AUP, DMCA, cookies, privacy) | FR-225, FR-226, FR-348 |
| 231 | Implement "Published with DropSites" badge on free-tier served pages | FR-247 |
| 232 | Implement badge removal for Pro tier and above | FR-248 |
| 233 | Implement in-product changelog | FR-295-298 |
| 234 | Implement help widget on every dashboard page | FR-289-291 |
| 235 | Implement support ticket form | FR-290 |
| 236 | Implement offline/degraded state banner | FR-311-315 |
| 237 | Implement mobile responsive dashboard (375px minimum) | FR-300-305 |
| 238 | Implement account deletion + data export | FR-256-262 |
| 239 | Implement account compromise recovery form | FR-284-288 |

---

## 6. Phase 2 Implementation Sequence (M2.1 -- M2.31)

### M2.1 -- REST API v1

**Gate:** T-API-01 through T-API-17

| # | Task | FRs |
|---|------|-----|
| 1 | Implement all REST API endpoints per Section 5.3 contract | FR-43-50 |
| 2 | Implement deployment search/filter query params on GET /deployments | FR-321 |
| 3 | Implement workspace API endpoints (create, list, invite, remove, role) | FR-322-327 |
| 4 | Publish OpenAPI spec at /api/docs (Swagger UI) | -- |
| 5 | Implement contract test suite (spec vs implementation diff = 0) | T-API-17 |

### M2.2 -- API key management

**Gate:** Key create -> use -> revoke cycle tested

| # | Task | FRs |
|---|------|-----|
| 6 | Implement API key generation (SHA-256 hashed, prefix stored) | FR-46-47 |
| 7 | Implement API key authentication in middleware | FR-46 |
| 8 | Implement API key revocation | FR-47 |
| 9 | Implement API key dashboard UI | FR-47 |

### M2.3 -- API rate limiting

**Gate:** Rate limit hit tested under load

| # | Task | FRs |
|---|------|-----|
| 10 | Implement per-minute rate limiting from limit profile | FR-163 |
| 11 | Implement daily and monthly API quotas | FR-164 |
| 12 | Implement HTTP 429 + Retry-After header | FR-165 |
| 13 | Implement upload payload size enforcement on API | FR-166 |
| 14 | Implement burst vs sustained limiting | FR-167 |

### M2.4 -- Single-file PATCH

**Gate:** Patch single page, verify others unchanged

| # | Task | FRs |
|---|------|-----|
| 15 | Implement PATCH /api/v1/deployments/:slug/files/:path | FR-129-132 |

### M2.5 -- Custom domains

**Gate:** Custom domain live with valid cert

| # | Task | FRs |
|---|------|-----|
| 16 | Implement custom domain CNAME verification | FR-72-76 |
| 17 | Implement ACME TLS provisioning (Let's Encrypt) | FR-73 |
| 18 | Implement DNS setup instructions in dashboard | FR-75 |
| 19 | Implement verification status display | FR-76 |
| 20 | Keep dropsites.app URL as fallback | FR-74 |

### M2.6 -- Per-recipient access tokens

**Gate:** Token view tracked, revocation blocks access

| # | Task | FRs |
|---|------|-----|
| 21 | Implement token generation with unique URL param | FR-90-91 |
| 22 | Implement per-token analytics tracking | FR-92 |
| 23 | Implement token revocation | FR-93 |
| 24 | Implement per-token view count and last-seen in dashboard | FR-94 |
| 25 | Implement optional token expiry (N views or date) | FR-95 |

### M2.7 -- Webhooks

**Gate:** Webhook received and verified on test endpoint

| # | Task | FRs |
|---|------|-----|
| 26 | Implement webhook endpoint registration (per-deployment or org-wide) | FR-123 |
| 27 | Implement event firing for all deployment lifecycle events | FR-124-125 |
| 28 | Implement HMAC-SHA256 payload signing | FR-128 |
| 29 | Implement retry logic with exponential backoff | FR-126 |
| 30 | Implement webhook delivery log (last 50 events) | FR-127 |

### M2.8 -- Version history

**Gate:** Restore previous version, verify live

| # | Task | FRs |
|---|------|-----|
| 31 | Implement version retention (last 3 for Pro+) | FR-104 |
| 32 | Implement version history UI on deployment detail | FR-105 |
| 33 | Implement version preview | FR-106 |
| 34 | Implement one-click version restore | FR-107 |
| 35 | Record version metadata (timestamp, size, publisher, source) | FR-108 |

### M2.9 -- Namespace support

**Gate:** Namespace deployment resolves correctly

| # | Task | FRs |
|---|------|-----|
| 36 | Implement namespace-prefixed URL routing in serving middleware | FR-13 |
| 37 | Implement namespace uniqueness enforcement | FR-226 |

### M2.10 -- Stripe integration

**Gate:** Stripe test mode: subscribe -> profile changes

| # | Task | FRs |
|---|------|-----|
| 38 | Implement Stripe checkout session for Pro/Team upgrade | -- |
| 39 | Implement Stripe webhook handler (subscription events -> assignProfile) | -- |
| 40 | Implement usage-gated UI (upgrade prompts when limits hit) | -- |

### M2.11 -- Upgrade/downgrade/cancel flows

**Gate:** Full billing lifecycle walkthrough

| # | Task | FRs |
|---|------|-----|
| 41 | Implement upgrade/downgrade flow in workspace billing settings | -- |
| 42 | Implement cancellation flow | -- |
| 43 | Implement graceful downgrade (content continues serving within free limits) | -- |

### M2.12 -- Licence key system

**Gate:** Licence validates offline, expiry enforced

| # | Task | FRs |
|---|------|-----|
| 44 | Implement licence key generation (JWT-based, asymmetric signing) | FR-202, FR-204 |
| 45 | Implement licence validation at startup + 24-hour recheck | FR-203 |
| 46 | Implement air-gapped validation (no call-home) | FR-206 |
| 47 | Implement admin licence status display | FR-205 |

### M2.13 -- Helm chart + Terraform

**Gate:** Clean deploy on each provider from scratch

| # | Task | FRs |
|---|------|-----|
| 48 | Publish Helm chart for Kubernetes (tested on GKE, EKS, AKS) | FR-195 |
| 49 | Publish Terraform modules for GCP, AWS, Azure | FR-196 |
| 50 | Publish docker-compose.yml for single-node deployment | FR-197 |
| 51 | Publish deployment runbook for each provider | FR-209-210 |

### M2.14 -- HA storage/database backends

**Gate:** Swap backends via config, no data loss

| # | Task | FRs |
|---|------|-----|
| 52 | Verify S3-compatible backend swap via STORAGE_BACKEND env var | FR-192 |
| 53 | Implement SQLite backend option for single-node | FR-193 |

### M2.15 -- Abuse Posture B

**Gate:** Known malicious file quarantined within 60s

| # | Task | FRs |
|---|------|-----|
| 54 | Implement Safe Browsing API scan at ingest | FR-231, FR-233 |
| 55 | Implement VirusTotal scan at ingest | FR-232 |
| 56 | Implement quarantine flow (async, "processing" state) | FR-234-237 |
| 57 | Implement 60-second scanning SLA | FR-238 |
| 58 | Implement weekly re-scan of active deployments | FR-239 |
| 59 | Implement auto-suspend for confirmed malware/phishing | FR-240 |

### M2.16 -- First assisted deployment

**Gate:** Customer signs off

| # | Task | FRs |
|---|------|-----|
| 60 | Validate deployment runbook with real customer | FR-209-210 |

### M2.17 -- Workspace model (full)

**Gate:** Full workspace lifecycle walkthrough

| # | Task | FRs |
|---|------|-----|
| 61 | Finalize and test complete workspace lifecycle | FR-224-240 |

### M2.18 -- Penetration test

**Gate:** Pentest report, no open critical/high

| # | Task | FRs |
|---|------|-----|
| 62 | Conduct third-party penetration test | FR-274-276 |
| 63 | Resolve all critical and high findings | FR-275 |
| 64 | Document medium finding remediation plan | FR-276 |

### M2.19 -- Data residency

**Gate:** EU workspace verified in EU bucket

| # | Task | FRs |
|---|------|-----|
| 65 | Implement EU region option for workspace storage | FR-269-273 |

### M2.20 -- 2FA (TOTP)

**Gate:** Full 2FA lifecycle tested

| # | Task | FRs |
|---|------|-----|
| 66 | Implement TOTP setup with QR code | FR-361-362 |
| 67 | Implement 2FA prompt after primary auth | FR-363 |
| 68 | Implement backup codes (8 single-use) | FR-364 |
| 69 | Implement workspace-enforced 2FA | FR-365 |
| 70 | Implement admin 2FA disable for recovery | FR-366 |

### M2.21 -- Password-based auth

**Gate:** Password login, forgot password, strength meter tested

| # | Task | FRs |
|---|------|-----|
| 71 | Implement email + password auth | FR-367-370 |
| 72 | Implement HaveIBeenPwned check | FR-371 |

### M2.22 -- Annual billing + invoices

**Gate:** Annual subscription created, invoice downloaded

| # | Task | FRs |
|---|------|-----|
| 73 | Implement monthly/annual toggle | FR-372-373 |
| 74 | Implement invoice list with PDF download | FR-374 |
| 75 | Implement Stripe customer portal integration | FR-375 |

### M2.23 -- Failed payment dunning

**Gate:** Simulated failed payment through full dunning cycle

| # | Task | FRs |
|---|------|-----|
| 76 | Implement Stripe Smart Retries | FR-377 |
| 77 | Implement payment failure notifications and grace period | FR-378-381 |
| 78 | Implement auto-recovery on payment success | FR-382 |

### M2.24 -- Geographic + device analytics

**Gate:** Country map and device chart visible

| # | Task | FRs |
|---|------|-----|
| 79 | Implement country-level geolocation (IP -> country, IP not stored) | FR-383-384 |
| 80 | Implement device class + browser family recording | FR-385-386 |
| 81 | Implement analytics comparison mode | FR-387 |
| 82 | Implement shareable read-only analytics link | FR-388 |

### M2.25 -- CORS header control

**Gate:** CORS wildcard verified with cross-origin fetch

| # | Task | FRs |
|---|------|-----|
| 83 | Implement CORS config via dropsites.json | FR-389 |
| 84 | Implement "Allow all origins" toggle | FR-390 |
| 85 | Implement default CORS (no ACAO header) | FR-391 |

### M2.26 -- Workspace transfer + advanced management

**Gate:** Workspace transfer tested end-to-end

| # | Task | FRs |
|---|------|-----|
| 86 | Implement workspace ownership transfer | FR-393-394 |
| 87 | Implement workspace default deployment settings | FR-395 |
| 88 | Implement workspace activity feed | FR-396 |
| 89 | Implement guest access read-only link | FR-397 |

### M2.27 -- SDK, CLI, GitHub Actions

**Gate:** CLI deploys React build in under 10 seconds

| # | Task | FRs |
|---|------|-----|
| 90 | Publish JS/TS SDK | FR-398 |
| 91 | Publish Python SDK | FR-399 |
| 92 | Build CLI tool (`dropsites deploy/list/delete/update/open`) | FR-400-402 |
| 93 | Publish GitHub Actions action | FR-403 |
| 94 | Implement webhook content hash in payload | FR-404 |

### M2.28 -- Backup strategy + disaster recovery

**Gate:** Restore test passes, runbook reviewed

| # | Task | FRs |
|---|------|-----|
| 95 | Implement automated daily backup to separate R2 bucket | FR-405-406 |
| 96 | Implement monthly restoration test | FR-407 |
| 97 | Write disaster recovery runbook | FR-408 |
| 98 | Verify RTO < 1 hour | FR-409 |
| 99 | Implement log retention policies | FR-410 |

### M2.29 -- SLA document

**Gate:** SLA live and linked from pricing page

| # | Task | FRs |
|---|------|-----|
| 100 | Publish SLA document at /sla | FR-411-414 |
| 101 | Implement service credits logic wired to Stripe | FR-413 |
| 102 | Implement 90-day uptime history on status page | FR-414 |

### M2.30 -- Deployment preview thumbnails

**Gate:** Thumbnails visible within 30s of publish

| # | Task | FRs |
|---|------|-----|
| 103 | Implement headless browser screenshot (Playwright in sandboxed container) | FR-416, FR-420 |
| 104 | Store thumbnail in Supabase Storage as WebP | FR-416 |
| 105 | Display thumbnail in deployment list | FR-417 |
| 106 | Regenerate on overwrite/edit | FR-418 |
| 107 | Implement async generation with placeholder | FR-419 |

### M2.31 -- Analytics PDF export + global search

**Gate:** PDF generated, global search works across workspaces

| # | Task | FRs |
|---|------|-----|
| 108 | Implement analytics PDF report generation | FR-421-422 |
| 109 | Implement global search (Command palette, Cmd+K) | FR-423-425 |

---

## 7. Phase 3 Implementation Sequence (M3.1 -- M3.5)

### M3.1 -- MCP server

**Gate:** Claude Code calls tool, URL returned in chat

| # | Task | FRs |
|---|------|-----|
| 1 | Build MCP server wrapping POST /api/v1/deployments | UC-15 |
| 2 | Return deployment URL as tool output | -- |
| 3 | Handle authentication via API key from MCP config | -- |

### M3.2 -- End-to-end test

**Gate:** Real Claude output deployed and accessible

| # | Task | FRs |
|---|------|-----|
| 4 | Test Claude -> MCP -> multi-file site -> live URL | UC-15 |

### M3.3 -- Connector config guide

**Gate:** Non-technical user follows guide successfully

| # | Task | FRs |
|---|------|-----|
| 5 | Write connector setup guide for claude.ai web interface | -- |

### M3.4 -- Closed beta

**Gate:** No P0/P1 bugs open

| # | Task | FRs |
|---|------|-----|
| 6 | Onboard 20 beta users | -- |
| 7 | Collect structured feedback | -- |
| 8 | Fix reported bugs | -- |

### M3.5 -- GA release

**Gate:** Announcement + docs live

| # | Task | FRs |
|---|------|-----|
| 9 | Public release of MCP connector | -- |
| 10 | Publish documentation | -- |

---

## 8. Test File Structure

```
tests/
├── unit/
│   ├── upload/
│   │   ├── validate.test.ts          # T-UPL-06, T-UPL-07, T-UPL-11, T-UPL-16
│   │   ├── zip.test.ts               # T-UPL-06, T-UPL-07 (path traversal, nested ZIP)
│   │   ├── mime.test.ts              # FR-193 MIME mapping correctness
│   │   ├── image-optimize.test.ts    # T-UPL-18, T-UPL-19
│   │   ├── content-hash.test.ts      # T-DAT-06 (SHA-256 correctness)
│   │   └── entry-point.test.ts       # FR-194, FR-195 entry point detection
│   ├── slug/
│   │   ├── generate.test.ts          # T-SLG-01 (URL-safe, no collisions over 10k)
│   │   └── validate.test.ts          # T-SLG-03, T-SLG-04, T-SLG-07, T-SLG-08
│   ├── limits/
│   │   ├── profiles.test.ts          # T-LIM-14 (no hardcoded limits grep)
│   │   ├── check.test.ts             # boundary checks
│   │   └── bandwidth.test.ts         # T-LIM-10 (monthly reset), T-DAT-07
│   ├── serving/
│   │   ├── password.test.ts          # bcrypt verify, rate limit logic
│   │   ├── auto-nav.test.ts          # detection logic, title inference
│   │   ├── headers.test.ts           # CSP, robots, cache headers
│   │   ├── lazy-loading.test.ts      # img tag injection
│   │   ├── bot-filter.test.ts        # UA classification
│   │   └── path-traversal.test.ts    # T-SRV-08, T-SEC-05, T-SEC-06
│   ├── auth/
│   │   ├── rate-limit.test.ts        # account creation, deployment creation limits
│   │   └── permissions.test.ts       # role x action matrix
│   ├── notifications/
│   │   ├── dispatcher.test.ts        # preference check, channel routing
│   │   ├── preferences.test.ts       # load/save
│   │   └── rate-limiter.test.ts      # T-NOT-17, T-NOT-18/19
│   ├── webhooks/
│   │   ├── sign.test.ts              # T-API-15 (HMAC-SHA256)
│   │   └── retry.test.ts             # exponential backoff
│   ├── analytics/
│   │   ├── record.test.ts            # T-ANL-05, T-ANL-06 (unique visitor)
│   │   ├── query.test.ts             # T-ANL-07 (referrer domain only)
│   │   └── bot-filter.test.ts        # T-ANL-12, T-ANL-13
│   ├── qr/
│   │   └── generate.test.ts          # QR generation correctness
│   ├── security/
│   │   └── xss.test.ts               # T-SEC-03 (slug display escape)
│   └── utils/
│       └── crypto.test.ts            # T-SEC-17 (token entropy), T-SEC-18 (bcrypt cost)
│
├── integration/
│   ├── upload/
│   │   └── upload.test.ts            # T-UPL-01 to T-UPL-20
│   ├── slug/
│   │   └── slug.test.ts              # T-SLG-02, T-SLG-05, T-SLG-06, T-SLG-09, T-SLG-11, T-SLG-12
│   ├── serving/
│   │   └── serving.test.ts           # T-SRV-01 to T-SRV-21
│   ├── auth/
│   │   └── auth.test.ts              # T-AUTH-01 to T-AUTH-16
│   ├── permissions/
│   │   └── permissions.test.ts       # T-PERM-01 to T-PERM-24
│   ├── limits/
│   │   └── limits.test.ts            # T-LIM-01 to T-LIM-13
│   ├── analytics/
│   │   └── analytics.test.ts         # T-ANL-01 to T-ANL-11, T-ANL-15
│   ├── notifications/
│   │   └── notifications.test.ts     # T-NOT-01 to T-NOT-21
│   ├── api/
│   │   └── api.test.ts              # T-API-01 to T-API-18 (Phase 2)
│   ├── security/
│   │   └── security.test.ts         # T-SEC-01, T-SEC-04, T-SEC-07 to T-SEC-11, T-SEC-15, T-SEC-16
│   ├── data-integrity/
│   │   └── data-integrity.test.ts   # T-DAT-01 to T-DAT-08, T-DAT-10
│   └── performance/
│       └── query-performance.test.ts # T-PERF-06, T-PERF-10
│
├── e2e/
│   ├── upload.spec.ts               # Full upload flow (T-XBRO-05 to T-XBRO-08)
│   ├── dashboard.spec.ts            # Deployment list, actions, empty states
│   ├── share.spec.ts                # Share sheet walkthrough (T-XBRO-10)
│   ├── editor.spec.ts               # Edit -> publish -> verify (T-DAT-09)
│   ├── auth.spec.ts                 # T-AUTH-04, T-AUTH-05, T-AUTH-11, T-AUTH-12, T-AUTH-17, T-AUTH-19
│   ├── password.spec.ts             # T-SRV-09, T-SRV-10, T-PERM-16
│   ├── permissions.spec.ts          # T-PERM-08 (viewer blocked from admin)
│   ├── limits.spec.ts               # T-LIM-15, T-LIM-16 (quota display, disabled zone)
│   ├── auto-nav.spec.ts             # T-SRV-17, T-XBRO-13
│   ├── serving.spec.ts              # T-SRV-04 (CDN cache after overwrite)
│   ├── analytics.spec.ts            # T-ANL-14 (shareable analytics link)
│   ├── data-integrity.spec.ts       # T-DAT-09 (editor conflict)
│   ├── accessibility.spec.ts        # T-A11Y-01 to T-A11Y-09 (axe scans)
│   ├── cross-browser.spec.ts        # T-XBRO-01 to T-XBRO-13
│   ├── onboarding.spec.ts           # Checklist, celebration, trial
│   └── api-cli.spec.ts              # T-API-19 to T-API-21 (Phase 2: SDK, CLI, GH Action)
│
├── performance/
│   ├── lighthouse.config.ts         # T-PERF-03, T-PERF-07, T-PERF-08, T-PERF-09
│   └── k6/
│       ├── serving-load.js          # T-PERF-01, T-PERF-02, T-PERF-04, T-PERF-05
│       └── upload-load.js           # Concurrent upload stress
│
├── security/
│   ├── zap-config.yaml             # T-SEC-13 (OWASP ZAP)
│   └── dependency-audit.ts         # T-SEC-12 (npm audit wrapper)
│
├── fixtures/
│   ├── valid-single.html
│   ├── valid-zip-root-index.zip
│   ├── valid-zip-nested-index.zip
│   ├── zip-no-index-single-html.zip
│   ├── zip-no-html.zip
│   ├── zip-nested-zip.zip
│   ├── zip-path-traversal.zip
│   ├── zip-10000-files.zip
│   ├── corrupt.zip
│   ├── exactly-at-limit.html
│   ├── one-byte-over-limit.html
│   ├── script-disguised-as-js.js   # wrong MIME
│   ├── multi-page-no-nav/
│   │   ├── index.html
│   │   ├── about.html
│   │   └── contact.html
│   ├── multi-page-with-nav/
│   │   ├── index.html
│   │   └── about.html
│   ├── supported-types/
│   │   ├── test.css, test.js, test.json, test.png, test.jpg
│   │   ├── test.webp, test.gif, test.svg, test.ico
│   │   ├── test.woff2, test.ttf, test.pdf, test.wasm
│   │   └── test.mp4
│   ├── with-custom-404/
│   │   ├── index.html
│   │   └── 404.html
│   ├── with-robots-txt/
│   │   ├── index.html
│   │   └── robots.txt
│   ├── with-dropsites-json/
│   │   ├── index.html
│   │   └── dropsites.json
│   └── react-build/
│       ├── index.html
│       └── static/
│
└── helpers/
    ├── setup.ts                     # global test setup
    ├── teardown.ts                  # global teardown
    ├── test-db.ts                   # test database helpers
    ├── test-storage.ts              # mock R2 storage
    ├── test-auth.ts                 # auth helper (create test users/sessions)
    ├── test-notifications.ts        # mock Resend/Twilio
    └── factories.ts                 # test data factories (user, workspace, deployment)
```

### Test Area Coverage Summary

| Area | Test File(s) | Layer(s) | Test IDs |
|------|-------------|----------|----------|
| T-UPL | `unit/upload/*.test.ts`, `integration/upload/upload.test.ts` | Unit, Integration | T-UPL-01 to T-UPL-20 |
| T-SLG | `unit/slug/*.test.ts`, `integration/slug/slug.test.ts` | Unit, Integration | T-SLG-01 to T-SLG-12 |
| T-SRV | `unit/serving/*.test.ts`, `integration/serving/serving.test.ts`, `e2e/serving.spec.ts`, `e2e/auto-nav.spec.ts`, `e2e/password.spec.ts` | Unit, Integration, E2E | T-SRV-01 to T-SRV-21 |
| T-AUTH | `unit/auth/*.test.ts`, `integration/auth/auth.test.ts`, `e2e/auth.spec.ts` | Unit, Integration, E2E | T-AUTH-01 to T-AUTH-19 |
| T-PERM | `unit/auth/permissions.test.ts`, `integration/permissions/permissions.test.ts`, `e2e/permissions.spec.ts`, `e2e/password.spec.ts` | Unit, Integration, E2E | T-PERM-01 to T-PERM-24 |
| T-LIM | `unit/limits/*.test.ts`, `integration/limits/limits.test.ts`, `e2e/limits.spec.ts` | Unit, Integration, E2E | T-LIM-01 to T-LIM-16 |
| T-ANL | `unit/analytics/*.test.ts`, `integration/analytics/analytics.test.ts`, `e2e/analytics.spec.ts` | Unit, Integration, E2E | T-ANL-01 to T-ANL-15 |
| T-NOT | `unit/notifications/*.test.ts`, `integration/notifications/notifications.test.ts` | Unit, Integration | T-NOT-01 to T-NOT-21 |
| T-API | `integration/api/api.test.ts`, `e2e/api-cli.spec.ts` | Integration, E2E | T-API-01 to T-API-21 |
| T-SEC | `unit/security/*.test.ts`, `integration/security/security.test.ts`, `security/zap-config.yaml` | Unit, Integration, Pre-release | T-SEC-01 to T-SEC-18 |
| T-PERF | `integration/performance/query-performance.test.ts`, `performance/lighthouse.config.ts`, `performance/k6/*.js` | Integration, Lighthouse, k6 | T-PERF-01 to T-PERF-11 |
| T-DAT | `unit/upload/content-hash.test.ts`, `integration/data-integrity/data-integrity.test.ts`, `e2e/data-integrity.spec.ts` | Unit, Integration, E2E | T-DAT-01 to T-DAT-10 |
| T-A11Y | `e2e/accessibility.spec.ts` | E2E (axe + manual) | T-A11Y-01 to T-A11Y-10 |
| T-XBRO | `e2e/cross-browser.spec.ts` | E2E | T-XBRO-01 to T-XBRO-13 |

---

## 9. shadcn Component List

Install each with `npx shadcn@latest add <name>`:

| Component | UI Surface | Install Command |
|-----------|-----------|-----------------|
| `alert-dialog` | Delete confirmations, destructive actions | `npx shadcn@latest add alert-dialog` |
| `badge` | Status badges: locked, paused, expiring, broken, OK | `npx shadcn@latest add badge` |
| `button` | All buttons throughout the app | `npx shadcn@latest add button` |
| `calendar` | Link expiry date picker | `npx shadcn@latest add calendar` |
| `card` | Admin stats cards, usage panels | `npx shadcn@latest add card` |
| `checkbox` | Bulk select in deployment table, TOS acceptance | `npx shadcn@latest add checkbox` |
| `command` | Global search Cmd+K palette | `npx shadcn@latest add command` |
| `dialog` | Share sheet (desktop), modals | `npx shadcn@latest add dialog` |
| `dropdown-menu` | Row actions menu, user menu | `npx shadcn@latest add dropdown-menu` |
| `form` | All forms (react-hook-form + zod) | `npx shadcn@latest add form` |
| `input` | All text inputs | `npx shadcn@latest add input` |
| `label` | Form labels | `npx shadcn@latest add label` |
| `popover` | Inline password input, expiry picker | `npx shadcn@latest add popover` |
| `progress` | Upload progress, usage quota bars | `npx shadcn@latest add progress` |
| `scroll-area` | Long lists, sidebar | `npx shadcn@latest add scroll-area` |
| `select` | Workspace selector, role selector | `npx shadcn@latest add select` |
| `separator` | Visual dividers | `npx shadcn@latest add separator` |
| `sheet` | Share sheet (mobile), mobile navigation drawer | `npx shadcn@latest add sheet` |
| `skeleton` | Loading skeletons matching content shape | `npx shadcn@latest add skeleton` |
| `sonner` | Toast notifications (bottom-right, 4s auto-dismiss) | `npx shadcn@latest add sonner` |
| `switch` | Toggle switches (indexing, auto-nav, notification prefs) | `npx shadcn@latest add switch` |
| `table` | Deployment table (sortable, sticky header) | `npx shadcn@latest add table` |
| `tabs` | Analytics tabs (Overview, Views, Bandwidth) | `npx shadcn@latest add tabs` |
| `textarea` | Abuse report description, support ticket | `npx shadcn@latest add textarea` |
| `tooltip` | All icon-only button labels | `npx shadcn@latest add tooltip` |

### Additional (non-shadcn) dependencies

- `@codemirror/view`, `@codemirror/state`, `@codemirror/lang-html`, `@codemirror/lang-css`, `@codemirror/lang-javascript` -- CodeMirror 6 for in-browser editor
- `lucide-react` -- icons (16px tables, 20px toolbars, stroke-width 1.5)
- `react-hook-form` + `@hookform/resolvers` + `zod` -- form validation (included with shadcn form)
- `date-fns` -- date formatting (required by Calendar)
- `qrcode` -- QR code generation
- `recharts` -- analytics charts (time-series, bar charts)

---

## 10. Third-Party Integrations Checklist

### 1. Supabase Project

- Create a Supabase project at supabase.com
- Configure: Auth -> Email templates, redirect URLs
- Enable providers: Email (magic link), Google, GitHub
- Set up Google OAuth and GitHub OAuth in Auth -> Providers
- Run all migration files against the project database
- Record: project URL, anon key, service role key, JWT secret, database URL

### 2. Cloudflare R2 Bucket

- Create Cloudflare account and enable R2
- Create bucket `dropsites-deployments-us` (US region)
- Optionally create `dropsites-deployments-eu` (EU region)
- Create R2 API token with read/write access
- Set up Custom Domain for R2 (public read access via CDN)
- Record: account ID, access key, secret key, endpoint, public URL

### 3. Cloudflare DNS and CDN

- Register or transfer `dropsites.app` domain to Cloudflare
- Configure DNS records pointing to deployment target
- Enable Cloudflare CDN (orange cloud) on the domain
- Create API token with Zone -> Cache Purge permissions
- Record: zone ID, API token

### 4. Resend Account

- Create account at resend.com
- Verify sending domain (`dropsites.app`)
- Create API key
- Record: API key, verified from address

### 5. Twilio Account

- Create account at twilio.com
- Purchase a phone number for SMS sending
- Record: account SID, auth token, phone number

### 6. Google OAuth App

- Go to Google Cloud Console -> APIs & Services -> Credentials
- Create OAuth 2.0 Client ID (Web application)
- Set authorized redirect URI: `https://dropsites.app/auth/callback`
- Also add Supabase callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`
- Record: client ID, client secret

### 7. GitHub OAuth App

- Go to GitHub -> Settings -> Developer Settings -> OAuth Apps
- Create new OAuth App
- Set Authorization callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`
- Record: client ID, client secret

### 8. Sentry Project

- Create Sentry account and project (Next.js)
- Install `@sentry/nextjs`
- Record: DSN, auth token for source maps

### 9. Stripe Account (Phase 2)

- Create Stripe account
- Configure products: Pro (monthly/annual), Team (monthly/annual)
- Configure Stripe webhook endpoint: `https://dropsites.app/api/stripe/webhook`
- Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.paid`
- Record: secret key, publishable key, webhook signing secret

### 10. Google Safe Browsing API (Phase 2)

- Enable Safe Browsing API in Google Cloud Console
- Create API key
- Record: API key

### 11. VirusTotal API (Phase 2)

- Create VirusTotal account
- Get API key (free tier sufficient at launch)
- Record: API key

---

## 11. Open Questions That Block Development

From Section 10 of the PRD, only questions that must be answered before Phase 1 can start:

| # | Question | Blocks | Default Assumption |
|---|---------|--------|-------------------|
| OQ-02 | Should free tier deployments expire after N days of inactivity, or be permanent within storage cap? | M1.3 (limit enforcement behaviour) | **Permanent within storage cap.** PRD recommends this. Implement FR-182 (stale flagging for admin) but do not auto-expire free deployments. |
| OQ-05 | Target IdP for self-hosted OIDC testing -- Keycloak, Okta, or Azure AD? | M1.4 (OIDC testing) | **Keycloak in Docker.** It's free, open-source, and runs locally in docker-compose. Tests can run without cloud accounts. Add Okta + Azure AD E2E tests in Phase 2 if needed. |
| OQ-07 | Version history storage: full file snapshots vs diffs? | M1.7 / M2.8 (editor + version history) | **Full file snapshots.** Simpler implementation, more reliable restores, R2 storage is cheap ($0.015/GB). Each version is a complete copy under `v{N}/` in R2. Old versions are cleaned up beyond the profile's retention count. |
| OQ-08 | Maximum number of named access tokens per deployment on Team profile? | M2.6 (access tokens) | **25 per deployment.** Sufficient for client-facing proposals. Stored in limit_profiles table, changeable without deploy. |
| OQ-09 | Should abuse detection flags (FR-180, FR-181) trigger automatic rate-limiting or admin notification only? | M1.11 / M1.12 (abuse + analytics) | **Admin notification only.** Auto-limiting risks false positives. Admin receives email+SMS alert, then takes manual action from admin console. Phase 2 can add auto-throttling after validation. |
| OQ-11 | Confirm Cloudflare R2 as primary storage backend for dropsites.app SaaS? | M1.1 (foundation) | **Confirmed.** The PRD explicitly names R2 as the confirmed stack. Proceed with R2. Cost validation (OQ-01) is a Phase 2 concern. |

### Questions that do NOT block Phase 1 development

- **OQ-01** (free limit values): Proceed with indicative values; validate before Phase 2 launch.
- **OQ-03** (paid price points): Phase 2 concern.
- **OQ-04** (TLS provider): Phase 2 -- custom domains are Phase 2. Default: Let's Encrypt via Cloudflare.
- **OQ-06** (MCP target): Phase 3.
- **OQ-10** (licence model): Phase 2.
- **OQ-12, OQ-13** (enterprise pricing): Phase 2.
- **OQ-14** (Terraform scope): Phase 2. Default: all three clouds simultaneously per FR-196.

---

## 12. Completeness Check

### FR Section Coverage

| FR Section | Covered By Tasks |
|-----------|-----------------|
| 3.1 Upload & Ingestion (FR-01-08) | M1.2 tasks 12-31 |
| 3.2 URL Routing & Slug (FR-09-14, FR-338-340) | M1.2 tasks 19-20, M1.19 tasks 199-202 |
| 3.3 Content Serving (FR-15-20, FR-335-344) | M1.2 tasks 23-26, M1.19 tasks 199-201, M1.20 tasks 203-205 |
| 3.4 Access Control (FR-21-28) | M1.5 task 74, M1.6 tasks 76-83 |
| 3.5 Publisher Dashboard (FR-29-36) | M1.5 tasks 53-64 |
| 3.6 Analytics (FR-37-42, FR-331-334) | M1.12 tasks 144-158, M1.18 tasks 195-198 |
| 3.8 In-Browser Editing (FR-51-57) | M1.7 tasks 84-93 |
| 3.9 Quick Actions (FR-58-63) | M1.5 tasks 56-64 |
| 3.10 Auto-Navigation (FR-64-71) | M1.8 tasks 94-104 |
| 3.11 REST API (FR-43-50) | M2.1-M2.4 |
| 3.12 Supported File Types (FR-193-199, FR-341-344) | M1.2 tasks 14-18, 24-26, M1.20 tasks 203-205 |
| 3.13 Authentication & SSO (FR-200-205, FR-328-330) | M1.4 tasks 41-52, M1.24 tasks 223-225 |
| 3.14 Share Flow (FR-206-215) | M1.9 tasks 105-116 |
| 3.15 Abuse Prevention Posture A (FR-216-230, FR-345-349) | M1.11 tasks 132-143, M1.21 tasks 206-210 |
| 3.16 Abuse Prevention Posture B (FR-231-241) | M2.15 tasks 54-59 |
| 3.17 Custom Domains (FR-72-76) | M2.5 tasks 16-20 |
| 3.18 Link Expiry (FR-77-81) | M1.9 tasks 112-115 |
| 3.19 QR Codes (FR-82-85) | M1.9 task 107 |
| 3.20 Embed Codes (FR-86-89) | M1.9 task 108 |
| 3.21 Per-Recipient Access Tokens (FR-90-95) | M2.6 tasks 21-25 |
| 3.22 Temporary Disable (FR-96-99) | M1.5 task 66 |
| 3.23 Duplicate Deployment (FR-100-103) | M1.5 task 67 |
| 3.24 Version History (FR-104-108) | M2.8 tasks 31-35 |
| 3.25 Password Hardening (FR-109-112) | M1.6 tasks 79-82 |
| 3.26 Image Optimisation (FR-113-116) | M1.13 tasks 163-166 |
| 3.27 Auto-Nav Title Inference (FR-117-122) | M1.8 tasks 97-99 |
| 3.28 Webhooks (FR-123-128) | M2.7 tasks 26-30 |
| 3.29 API Single-File PATCH (FR-129-132) | M2.4 task 15 |
| 3.30 Deployment Health Check (FR-133-137) | M1.5 tasks 68-69 |
| 3.31 Infrastructure Portability (FR-191-201) | M1.2 tasks 12-13, M1.15 tasks 182-185, M2.13-14 |
| 3.32 Enterprise Deployment Delivery (FR-202-210) | M2.12-M2.16 |
| 3.33 Limit Profile System (FR-139-146) | M1.3 tasks 32-40 |
| 3.34 Upload & Storage Limits (FR-147-154) | M1.3 tasks 35-40 |
| 3.35 Bandwidth & Traffic Limits (FR-155-162) | M1.12 tasks 150-152 |
| 3.36 API Rate Limits (FR-163-167) | M2.3 tasks 10-14 |
| 3.37 Usage Visibility -- Publisher (FR-168-175) | M1.12 tasks 153-155 |
| 3.38 Usage Visibility -- Admin (FR-176-184) | M1.12 tasks 157-158 |
| 3.39 Limit Enforcement UX (FR-185-190) | M1.3 tasks 37-39 |
| 3.40 Notification System (FR-211-223) | M1.10 tasks 117-131 |
| 3.41 Workspace Management (FR-224-240) | M1.5 tasks 70-75 |
| 3.42 Trial Period (FR-241-246) | M1.16 tasks 186-191 |
| 3.43 Referral & Growth (FR-247-250) | M1.25 tasks 231-232 |
| 3.44 White-Labelling (FR-251-255) | M2.12 (enterprise features) |
| 3.45 Account Deletion & Data Portability (FR-256-262) | M1.25 task 238 |
| 3.46 Session Management (FR-263-268) | M1.4 tasks 49-52 |
| 3.47 Data Residency (FR-269-273) | M2.19 task 65 |
| 3.48 Penetration Testing (FR-274-278) | M2.18 tasks 62-64 |
| 3.49 CSP Defaults (FR-279-283) | M1.14 tasks 170-172, 181 |
| 3.50 Account Compromise Recovery (FR-284-288) | M1.25 task 239 |
| 3.51 Support Channel (FR-289-294) | M1.25 tasks 234-235, M1.17 tasks 192-194 |
| 3.52 In-Product Changelog (FR-295-299) | M1.25 task 233 |
| 3.53 Mobile & Responsive (FR-300-305, FR-350-355) | M1.25 task 237, M1.22 tasks 211-217 |
| 3.54 Empty States (FR-306-310, FR-356-360) | M1.23 tasks 218-222 |
| 3.55 Offline & Degraded State (FR-311-315) | M1.25 task 236 |
| 3.56 Editor Conflict Resolution (FR-316-320) | M1.7 tasks 89-92 |
| 3.57 API Search, Filter, Workspace Endpoints (FR-321-327) | M2.1 tasks 2-3 |
| 3.58 Two-Factor Authentication (FR-361-366) | M2.20 tasks 66-70 |
| 3.59 Password-Based Authentication (FR-367-371) | M2.21 tasks 71-72 |
| 3.60 Annual Billing & Invoice Access (FR-372-376) | M2.22 tasks 73-75 |
| 3.61 Failed Payment & Dunning (FR-377-382) | M2.23 tasks 76-78 |
| 3.62 Geographic & Device Analytics (FR-383-388) | M2.24 tasks 79-82 |
| 3.63 CORS Header Control (FR-389-392) | M2.25 tasks 83-85 |
| 3.64 Workspace Transfer & Advanced Management (FR-393-397) | M2.26 tasks 86-89 |
| 3.65 SDK, CLI & CI Integration (FR-398-404) | M2.27 tasks 90-94 |
| 3.66 Backup Strategy & Disaster Recovery (FR-405-410) | M2.28 tasks 95-99 |
| 3.67 SLA Document & Uptime Commitment (FR-411-415) | M2.29 tasks 100-102 |
| 3.68 Deployment Preview Thumbnail (FR-416-420) | M2.30 tasks 103-107 |
| 3.69 Analytics PDF Export & Global Search (FR-421-425) | M2.31 tasks 108-109 |

**All 69 FR sections have corresponding tasks. No gaps.**

### Test Area Coverage

| Test Area | Test File Exists | Test IDs Covered |
|-----------|-----------------|-----------------|
| T-UPL | `unit/upload/*.test.ts`, `integration/upload/upload.test.ts` | T-UPL-01 to T-UPL-20 |
| T-SLG | `unit/slug/*.test.ts`, `integration/slug/slug.test.ts` | T-SLG-01 to T-SLG-12 |
| T-SRV | `unit/serving/*.test.ts`, `integration/serving/serving.test.ts`, `e2e/serving.spec.ts` | T-SRV-01 to T-SRV-21 |
| T-AUTH | `unit/auth/*.test.ts`, `integration/auth/auth.test.ts`, `e2e/auth.spec.ts` | T-AUTH-01 to T-AUTH-19 |
| T-PERM | `unit/auth/permissions.test.ts`, `integration/permissions/permissions.test.ts`, `e2e/permissions.spec.ts` | T-PERM-01 to T-PERM-24 |
| T-LIM | `unit/limits/*.test.ts`, `integration/limits/limits.test.ts`, `e2e/limits.spec.ts` | T-LIM-01 to T-LIM-16 |
| T-ANL | `unit/analytics/*.test.ts`, `integration/analytics/analytics.test.ts`, `e2e/analytics.spec.ts` | T-ANL-01 to T-ANL-15 |
| T-NOT | `unit/notifications/*.test.ts`, `integration/notifications/notifications.test.ts` | T-NOT-01 to T-NOT-21 |
| T-API | `integration/api/api.test.ts`, `e2e/api-cli.spec.ts` | T-API-01 to T-API-21 |
| T-SEC | `unit/security/*.test.ts`, `integration/security/security.test.ts`, `security/zap-config.yaml` | T-SEC-01 to T-SEC-18 |
| T-PERF | `integration/performance/query-performance.test.ts`, `performance/lighthouse.config.ts`, `performance/k6/*.js` | T-PERF-01 to T-PERF-11 |
| T-DAT | `unit/upload/content-hash.test.ts`, `integration/data-integrity/data-integrity.test.ts`, `e2e/data-integrity.spec.ts` | T-DAT-01 to T-DAT-10 |
| T-A11Y | `e2e/accessibility.spec.ts` | T-A11Y-01 to T-A11Y-10 |
| T-XBRO | `e2e/cross-browser.spec.ts` | T-XBRO-01 to T-XBRO-13 |

**All 14 test areas have corresponding test files. No gaps.**

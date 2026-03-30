---
title: Implementation Progress
owner: engineering
version: "2.0"
last_updated: 2026-03-30
depends_on:
  - implementation/PLAN.md
  - implementation/TASK_CARDS.md
---

# DropSites — Implementation Progress

> Track each agent session's completion. Check off sessions as they finish. Read this file at the start of every new agent session to understand what's already been built.

## How to Use This File

1. Before starting a new session, read this file to see what's already done.
2. After completing a session, mark it `[x]` and note the date.
3. If a session partially completed, note what's left.

---

## Phase 1

### M1.1 — Foundation
- [x] **S01** — Project init (Next.js 15, Tailwind v4, shadcn, Geist, ESLint, Prettier, Vitest, Playwright) — 2026-03-27
- [x] **S02** — Supabase schema (all migration SQL files, docker-compose, Dockerfile) — 2026-03-27
- [x] **S03** — Health endpoint, Sentry, env validation, root layout, marketing shell — 2026-03-27

### M1.2 — Upload + Serving
- [x] **S04** — S3 storage client + abstraction factory — 2026-03-27
- [x] **S05** — MIME mapping, file validation, ZIP extraction, entry point detection — 2026-03-27
- [x] **S06** — Slug generation + validation + reserved words — 2026-03-27
- [x] **S07** — Upload API route + processing pipeline — 2026-03-27
- [x] **S08** — Serving middleware (slug resolve, R2 fetch, MIME headers, 404) — 2026-03-27
- [x] **S09** — Upload UI (drag-drop zone, progress bar, success screen, slug input) — 2026-03-27

### M1.3 — Limits
- [x] **S10** — Limit profile system (DB, getProfile, assignProfile, pre-upload checks) — 2026-03-27
- [x] **S11** — Limit enforcement UX (quota display, disabled states, error messages) — 2026-03-27

### M1.4 — Authentication
- [x] **S12** — Supabase Auth setup, login/signup pages, OAuth callbacks, middleware guard — 2026-03-27
- [x] **S13** — Auto-provisioning, email verification, rate limits, TOS acceptance — 2026-03-27
- [x] **S14** — Session management (list, terminate, re-auth gate) — 2026-03-27

### M1.5 — Dashboard
- [x] **S15** — Dashboard layout (sidebar, top-nav, workspace selector) — 2026-03-27
- [x] **S16** — Deployment table (list, sort, search, filter, badges, detail page) — 2026-03-27
- [x] **S17** — Row actions (lock, update, duplicate, rename, delete, bulk delete, disable/reactivate) — 2026-03-27
- [x] **S18** — Workspace management (create, settings, members, roles, invitations) — 2026-03-28
- [x] **S19** — RLS policies + permission checks across all routes — 2026-03-28

### M1.6 — Password Protection
- [x] **S20** — Password set/remove, prompt page, verification, brute-force rate limiting — 2026-03-28

### M1.7 — Code Editor
- [x] **S21** — CodeMirror editor, file tree, save/publish, diff summary, auto-save draft — 2026-03-29
- [x] **S22** — Editor locks, conflict detection, resolution options — 2026-03-29

### M1.8 — Auto-Navigation Widget
- [x] **S23** — Navigation detection, widget JS, page title inference, dropsites.json parsing — 2026-03-29

### M1.9 — Share, QR, Embed, Expiry
- [x] **S24** — Share sheet (copy link, QR code, embed snippet, email share, password toggle) — 2026-03-29
- [x] **S25** — Link expiry (date picker, enforcement, reactivation, expired page) — 2026-03-29

### M1.10 — Notifications
- [x] **S26** — Resend + Twilio clients, dispatcher, preference checking, rate limiting — 2026-03-29
- [x] **S27** — All notification templates (publisher + admin) + preferences UI + phone OTP — 2026-03-29

### M1.11 — Abuse Prevention
- [x] **S28** — Rate limits, abuse report form/flow, admin disable/suspend, DMCA/TOS pages, content hash registry — 2026-03-29

### M1.12 — Analytics + Audit Log
- [x] **S29** — Analytics recording, views, unique visitors, referrers, time-series charts — 2026-03-29
- [x] **S30** — Bandwidth tracking, usage panels, quota alerts, CSV export — 2026-03-29
- [x] **S31** — Audit log writer, admin usage panel, admin CSV export — 2026-03-29

### M1.13 — Performance
- [x] **S32** — Compression, cache headers, CDN invalidation, image optimization, lazy loading, Lighthouse pass — 2026-03-29

### M1.14 — Security Review
- [x] **S33** — CSP headers, path traversal prevention, CSRF, XSS, SQL injection review, OWASP ZAP — 2026-03-29

### M1.15 — Self-Hosted
- [x] **S34** — Self-hosted runbook, validate-config script, health endpoint enhancements — 2026-03-29

### M1.16 — Trial System
- [x] **S35** — 14-day Pro trial, countdown, expiry logic, notifications, Edge Function — 2026-03-29

### M1.17 — Status Page
- [x] **S36** — Status page setup, automated health posting — 2026-03-29

### M1.18 — Bot Filtering
- [x] **S37** — Bot filter patterns, seed data, admin analytics separation — 2026-03-29

### M1.19 — Custom 404 + Redirects
- [x] **S38** — Custom 404.html serving, platform 404, slug redirects, dropsites.json redirects — 2026-03-29

### M1.20 — Robots Control
- [x] **S39** — X-Robots-Tag default, per-deployment toggle, custom robots.txt — 2026-03-29

### M1.21 — Cookie Consent
- [x] **S40** — Cookie banner, consent recording, cookie policy page — 2026-03-29

### M1.22 — Accessibility
- [x] **S41** — WCAG 2.1 AA pass, keyboard navigation, screen reader, axe audit — 2026-03-29

### M1.23 — Onboarding
- [x] **S42** — Onboarding checklist, celebration modal, trial prompts, empty states — 2026-03-29

### M1.24 — Team SSO
- [x] **S43** — Workspace OIDC config, SSO UI, SSO redirect — 2026-03-29

### M1.25 — Launch Prep
- [x] **S44** — Badge, changelog, help widget, offline banner, mobile responsive, account deletion, compromise recovery — 2026-03-29

---

## Phase 2

### M2.1 — REST API v1
- [x] **S45** — REST API v1 + OpenAPI spec, deployment CRUD, auth abstraction, contract tests — 2026-03-29

### M2.2 — API Key Management
- [x] **S46** — API key generation, revocation, dashboard UI, key lifecycle tests — 2026-03-29

### M2.3 — API Rate Limiting
- [x] **S47** — Per-minute/daily/monthly rate limits, burst support, 429 + Retry-After — 2026-03-29

### M2.4 — Single-File PATCH
- [x] **S48** — PATCH endpoint for single file update, version creation, path traversal protection — 2026-03-29

### M2.5 — Custom Domains
- [x] **S49** — CNAME verification, ACME TLS provisioning, DNS instructions UI, serving resolution — 2026-03-29

### M2.6 — Per-Recipient Access Tokens
- [x] **S50** — Named tokens, unique URLs, per-token analytics, revocation, view limits — 2026-03-29

### M2.7 — Webhooks
- [x] **S51** — Webhook registration, HMAC signing, retry logic, delivery log, test endpoint — 2026-03-29

### M2.8 — Version History
- [x] **S52** — Last 3 versions, preview, restore, version metadata — 2026-03-29

### M2.9 — Namespace Support
- [x] **S53** — Team-scoped URL prefixes, namespace validation, serving resolution — 2026-03-29

### M2.10 — Stripe Integration
- [x] **S54** — Stripe Checkout, subscription webhooks, assignProfile on subscribe/cancel — 2026-03-30

### M2.11 — Billing Flows
- [x] **S55** — Upgrade/downgrade/cancel UI, pricing page, feature gates, plan badges — 2026-03-30

### M2.22 + M2.23 — Annual Billing + Dunning
- [x] **S56** — Annual billing toggle, failed payment handling, grace period, recovery — 2026-03-30

### M2.12 — Licence Keys
- [x] **S57** — Licence generation, offline validation, air-gapped mode, admin status panel — 2026-03-29

### M2.13 — Helm + Terraform
- [x] **S58** — Helm chart, Terraform modules for GCP/AWS/Azure, cloud mapping doc — 2026-03-29

### M2.14 — Backend Flexibility
- [x] **S59** — S3/GCS/Azure/MinIO/local storage backends, direct PostgreSQL backend — 2026-03-29

### M2.15 — Abuse Posture B
- [x] **S60** — Safe Browsing + VirusTotal scanning, quarantine queue, weekly re-scan — 2026-03-30

### M2.16 — Assisted Deployment
- [x] **S61** — Deployment runbooks for GCP/AWS/Azure, verification script, checklist — 2026-03-29

### M2.17 — Workspace API
- [x] **S62** — Workspace CRUD API, member invite/role/remove, aggregate analytics endpoint — 2026-03-29

### M2.18 — Security Validation
- [x] **S63** — OWASP ZAP scan, pentest scope, security test suite (T-SEC-01 through T-SEC-18) — 2026-03-29

### M2.19 — Data Residency
- [x] **S64** — EU region option, multi-region storage routing, workspace-level setting — 2026-03-29

### M2.20 + M2.21 — 2FA + Password Auth
- [x] **S65** — TOTP 2FA, backup codes, password auth, strength meter, HaveIBeenPwned check — 2026-03-29

### M2.24 — Advanced Analytics
- [x] **S66** — Geographic + device analytics, comparison mode, shareable analytics link — 2026-03-30

### M2.25 — CORS Control
- [x] **S67** — Per-deployment CORS config, dropsites.json support, wildcard toggle — 2026-03-29

### M2.26 — Workspace Transfer
- [x] **S68** — Workspace transfer, default settings, activity feed, guest access — 2026-03-30

### M2.27 — Developer Tools
- [x] **S69** — JS SDK, CLI tool, GitHub Actions action — 2026-03-29

### M2.28 — Backup & DR
- [x] **S70** — Daily backup, restore script, monthly test, disaster recovery runbook — 2026-03-29

### M2.29 — SLA & Uptime
- [x] **S71** — SLA document, service credits, 90-day uptime history on status page — 2026-03-29

### M2.30 — Preview Thumbnails
- [x] **S72** — Headless browser screenshot, WebP thumbnail, async generation — 2026-03-30

### M2.31 — PDF Export + Global Search
- [x] **S73** — Analytics PDF export, global cross-workspace search (Cmd+K) — 2026-03-29

---

## Phase 3

### M3.1 — MCP Server
- [x] **S74** — MCP server (`@dropsites/mcp` package, `deploy_site` / `list_sites` / `delete_site` / `update_site` tools, StdioServerTransport) — 2026-03-30

### M3.2 — End-to-End Test
- [x] **S75** — MCP integration + E2E tests (T-MCP-01 through T-MCP-10, live deploy smoke test) — 2026-03-30

### M3.3 — Connector Config Guide
- [x] **S76** — MCP setup guide (`docs/mcp-connector.md`), `/mcp` marketing page, footer link, homepage callout — 2026-03-30

### M3.4 — Closed Beta
- [x] **S77** — Beta invite system (`beta_invites` table, invite emails, accept flow, feedback widget, admin panel) — 2026-03-30

### M3.5 — GA Release
- [x] **S78** — GA release (npm publish prep, announcement blog post, README update, changelog v1.0, smoke tests) — 2026-03-30

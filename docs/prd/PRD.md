---
title: Product Requirements Document
owner: product
version: "2.0"
last_updated: 2026-03-26
depends_on: []
---

# DropSites — Product Requirements Document

**Version:** 2.0
**Date:** March 2026  
**Status:** Active  
**Stack:** Next.js 15 · Supabase · Cloudflare R2 · shadcn/ui  
**Domain:** dropsites.app

---

# 1. Executive Summary

## 1.1  Problem Statement

PowerPoint and PDF have been the default formats for sharing work for thirty years. They are static, linear, and built for printing. They cannot animate, respond to interaction, embed live data, or adapt to the device reading them. And yet they remain the default — not because they are the best medium, but because publishing HTML has always required technical knowledge most people do not have.

HTML is a better medium for sharing work. It can tell a richer story: interactive charts, animated transitions, responsive layouts, embedded video, live calculations. A well-crafted HTML deliverable is more persuasive, more memorable, and more useful than the same content in a slide deck. Design and development teams have known this for years. Everyone else has been locked out.

AI tools are changing that equation rapidly. Claude, ChatGPT, and similar tools now produce high-quality HTML — dashboards, reports, proposals, sprint trackers, data visualisations — in seconds, for anyone. The content creation barrier is gone. What remains is the distribution barrier: there is no fast, reliable, repeatable way to give an HTML output a permanent home and a shareable link.

Today that means sending file attachments nobody can open without a local server, pasting raw code into chat messages, or abandoning HTML entirely and falling back to a PDF export. None of these are acceptable. The last mile is broken.

## 1.2  Vision

DropSites is a self-hosted static site publishing platform. It gives anyone a single, frictionless mechanism to turn any static output — HTML, JavaScript apps, React builds, data visualisations, PDFs — whether produced by a person, an AI assistant, or an automated pipeline — into a permanent, shareable link.

The model is simple: drop a file or folder in, get a URL out. Everything else is handled by the platform.

## 1.3  Strategic Fit


| Dimension             | Position                                                                               |
| --------------------- | -------------------------------------------------------------------------------------- |
| Deployment model      | Proprietary SaaS (dropsites.app) + self-hosted enterprise licence                      |
| Primary user          | Anyone who produces or consumes HTML outputs — consultants, analysts, developers, PMs  |
| Distribution model    | Free SaaS tier drives adoption; enterprise self-hosted licences drive revenue          |
| Competitive reference | Tiiny.host — feature parity, AI-native, enterprise-grade                               |
| Integration path      | Phase 1: core platform → Phase 2: API + Stripe billing → Phase 3: Claude MCP connector |


## 1.4  Business Model

DropSites is proprietary software. The business runs on two parallel revenue streams that feed each other naturally — a freemium SaaS product that builds the user base, and enterprise contracts that generate meaningful revenue.


| Stream                              | Model                                                                                                                                                                     | Target customer                                                                                | Phase                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------- |
| SaaS — dropsites.app                | Freemium. Free tier with enforced limits. Paid tiers (Pro, Team) unlock higher limits and advanced features. Billed monthly or annually via Stripe.                       | Individual users, small teams, AI power users, consultants                                     | Phase 1 (free) → Phase 2 (paid tiers) |
| Enterprise — self-managed licence   | Annual contract. Customer deploys and operates DropSites entirely on their own infrastructure. Licence key unlocks enterprise profile, SSO, audit logs, priority support. | Organisations with strict data residency or security policies who can manage their own infra   | Phase 2                               |
| Enterprise — assisted deployment    | Annual contract + one-time setup fee. We deploy DropSites into the customer's cloud account (GCP, AWS, Azure) and hand it over. Customer operates it after go-live.       | Organisations that want DropSites in their cloud tenant but don't want to set it up themselves | Phase 2                               |
| Enterprise — private cloud instance | Monthly contract. We run a dedicated isolated DropSites instance for the customer on our infrastructure. Their domain, their SSO, their data fully separated.             | Organisations that want managed ops but need logical isolation from other customers            | Phase 3                               |


Phase 1 ships with all users on a single free limit profile. The limit profile system is architected from day one to accept multiple named profiles — Stripe integration in Phase 2 is wiring webhooks to profile assignment, not a rebuild.

## 1.5  Workspace Model

A workspace is an organisational container that sits between users and deployments. Every user gets a personal workspace automatically on signup. They can also create or be invited to additional workspaces. Billing, namespaces, and deployment ownership all live at the workspace level — not the individual user level.


| Entity     | Relationship                                                                                           | Notes                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| User       | Belongs to one or more workspaces via membership                                                       | Personal workspace created automatically on signup             |
| Workspace  | Has many members, one limit profile, one Stripe subscription, one optional namespace, many deployments | The billing and ownership unit                                 |
| Deployment | Belongs to exactly one workspace — owner_id tracks who published it                                    | Survives member departure — never deleted when a member leaves |
| Membership | User + Workspace + Role (Owner / Publisher / Viewer)                                                   | Invite-based. One user can be in multiple workspaces.          |



| Role      | Permissions                                                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Owner     | Everything — billing, member management, delete workspace, manage all deployments regardless of who published them                |
| Publisher | Create, update, and delete their own deployments. View all workspace deployments and analytics. Cannot manage members or billing. |
| Viewer    | View deployment list and analytics only. Cannot publish, modify, or delete anything.                                              |


## 1.6  Limit Profiles

A limit profile is a named configuration defining resource boundaries for a user or organisation. All users in Phase 1 are on the default free profile. Administrators can assign any profile manually. Phase 2 automates assignment via Stripe subscription events.


| Profile        | Deployments | Per-deploy size | Total storage | Monthly bandwidth | Notes               |
| -------------- | ----------- | --------------- | ------------- | ----------------- | ------------------- |
| free (default) | 5           | 25 MB           | 100 MB        | 5 GB              | All users Phase 1   |
| pro            | 50          | 100 MB          | 2 GB          | 50 GB             | Phase 2 — Stripe    |
| team           | 200         | 500 MB          | 10 GB         | 200 GB            | Phase 2 — Stripe    |
| enterprise     | Unlimited   | 2 GB            | Unlimited     | Unlimited         | Self-hosted licence |


Limit values are indicative — validate against infrastructure costs before Phase 2 launch. Profile names and the assignment API are fixed from Phase 1.

## 1.7  Hosting Architecture & Cost Basis

Bandwidth egress cost is the primary unit economics risk for a static file serving platform. The hosting stack is chosen to eliminate egress fees at the SaaS layer while remaining fully portable for enterprise deployments.

### SaaS Tier — Confirmed Stack


| Component                | Service                                   | Cost basis                                                                   |
| ------------------------ | ----------------------------------------- | ---------------------------------------------------------------------------- |
| Framework & hosting      | Next.js 15 on Cloudflare Pages + Workers  | $0 free tier → ~$25 / month at launch scale (Cloudflare Pages Pro)           |
| Database                 | Supabase (PostgreSQL)                     | Free tier (500 MB, 2 GB bandwidth) → Pro $25/month (8 GB, 250 GB bandwidth)  |
| Auth                     | Supabase Auth                             | Included in Supabase plan — no additional cost                               |
| Deployment file storage  | Cloudflare R2                             | $0.015 / GB stored · $0 egress — eliminates the primary cost driver at scale |
| CDN & serving            | Cloudflare CDN                            | Included — global edge, no egress fees                                       |
| Internal asset storage   | Supabase Storage                          | Included in Supabase plan — thumbnails, QR codes, analytics exports          |
| TLS & DNS                | Cloudflare                                | Free                                                                         |
| Transactional email      | Resend                                    | $0 free tier (3,000 emails/month) → $20 / month at scale                     |
| SMS                      | Twilio                                    | ~$0.0079 / SMS (US) — negligible at early scale                              |
| Abuse scanning (Phase 2) | Google Safe Browsing API + VirusTotal API | Free tier sufficient at launch; ~$50 / month at 100k users                   |
| Error monitoring         | Sentry                                    | Free tier (5k errors/month) → $26 / month                                    |


### Cost Model at Scale


| Scale         | Cloudflare R2 stack / month | AWS S3 stack / month | Delta                  |
| ------------- | --------------------------- | -------------------- | ---------------------- |
| 1,000 users   | ~$30                        | ~$120                | Cloudflare 4x cheaper  |
| 10,000 users  | ~$150                       | ~$1,200              | Cloudflare 8x cheaper  |
| 100,000 users | ~$800                       | ~$12,000             | Cloudflare 15x cheaper |


The delta is driven almost entirely by egress fees. AWS S3 charges $0.085/GB out. Cloudflare R2 charges $0. At 100k users with an average of 5 deployments each receiving 100 views of a 500 KB page, monthly egress is ~25 TB — $2,125 on AWS, $0 on Cloudflare R2.

### Enterprise Deployment — Cloud Portability

When a customer requires deployment into their own cloud account or on-premise environment, DropSites maps cleanly onto the major cloud providers. No cloud-specific SDK is hardcoded — all integrations use open standards.


| DropSites component | GCP equivalent                       | AWS equivalent    | Azure equivalent                   | On-premise           |
| ------------------- | ------------------------------------ | ----------------- | ---------------------------------- | -------------------- |
| Container runtime   | Cloud Run / GKE                      | ECS Fargate / EKS | Azure Container Apps / AKS         | Docker / Kubernetes  |
| File storage        | Google Cloud Storage (S3-compatible) | S3                | Azure Blob Storage (S3-compatible) | MinIO                |
| Database            | Cloud SQL (PostgreSQL)               | RDS PostgreSQL    | Azure Database for PostgreSQL      | PostgreSQL           |
| CDN                 | Cloud CDN                            | CloudFront        | Azure CDN                          | Nginx / Caddy        |
| SSO / identity      | Google Workspace OIDC                | Cognito / Okta    | Azure AD OIDC                      | Keycloak / LDAP      |
| Secrets             | Secret Manager                       | Secrets Manager   | Key Vault                          | Vault / env vars     |
| Monitoring          | Cloud Logging + Cloud Monitoring     | CloudWatch        | Azure Monitor                      | Prometheus + Grafana |
| TLS certificates    | Google-managed SSL                   | ACM               | App Gateway certs                  | Let's Encrypt / ACME |


All storage integrations use the S3-compatible API — GCS, Azure Blob, and MinIO all implement it. The application never calls a cloud-specific SDK directly. Switching storage backends requires only a configuration change.

## 1.8  Success Metrics


| Metric                                  | Target (90 days post-launch) |
| --------------------------------------- | ---------------------------- |
| Time from HTML output to shareable link | < 60 seconds                 |
| Upload-to-URL reliability               | > 99.9%                      |
| Time to first deployment (new user)     | < 2 minutes                  |
| Support tickets for deployment failures | 0                            |
| Weekly active publishers (hosted tier)  | ≥ 500                        |


# 2. Users & Use Cases

## 2.1  User Personas


| Persona              | Context                                                              | Core need                                                          |
| -------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| AI Power User        | Uses Claude, ChatGPT, or similar tools daily to produce HTML outputs | Publish Claude-generated deliverables without leaving the workflow |
| Delivery Consultant  | Produces sprint dashboards, retrospectives, and reports for clients  | Stable, professional link to share — no IT involvement             |
| Product Manager      | Shares roadmaps, scorecards, and ceremony outputs with stakeholders  | Password-protected link for sensitive or client-facing content     |
| Developer / Engineer | Builds internal tools, prototypes, and visualisations                | API access to publish programmatically from scripts or pipelines   |
| Platform / IT Admin  | Deploys and governs the self-hosted instance                         | Container-native deployment, SSO, audit logs, storage controls     |


## 2.2  Core Use Cases

### UC-01  Single-file publish

A user drags a single HTML file onto the upload zone. DropSites assigns a slug, serves the file at a stable URL, and copies the link to clipboard. The user pastes it into an email, chat, or document.

### UC-02  Multi-file publish

A user uploads a ZIP archive containing an index.html and supporting assets. DropSites unpacks the archive, serves it as a complete static site, and returns a single URL pointing to index.html.

### UC-03  Named deployment

Before uploading, the user types a custom slug (e.g. sprint-12-retro). DropSites registers the deployment at a predictable URL: dropsites.app/sprint-12-retro. The field shows a live preview of the URL as the user types.

### UC-04  Overwrite / update

A user re-uploads content to an existing slug. The URL remains unchanged. Anyone who already has the link sees the updated version immediately — no re-sharing required.

### UC-05  Password-protected share

A user enables password protection on a deployment. Visitors see a minimal password prompt before content loads. The publisher can rotate or remove the password at any time.

### UC-06  In-browser edit

A user opens a deployment and clicks "Edit". A minimal code editor loads with the HTML source of any file in the deployment. The user makes changes and clicks "Save & publish". The update is live immediately — no re-upload required.

### UC-07  Quick overwrite from dashboard

From the deployment list, the user clicks "Update" on any row. An upload zone appears inline. The user drops a new file or ZIP. Content is replaced in place, the URL is unchanged, and the list shows the new "Updated" timestamp.

### UC-08  Quick privacy actions from dashboard

Each deployment row in the dashboard exposes a one-click "Lock" icon to toggle password protection and a "Delete" icon. Both actions are reachable without opening a detail page. Enabling the lock prompts for a password; delete shows a brief confirmation.

### UC-09  Auto-navigation for multi-page deployments

When a multi-file deployment contains no navigation linking between its HTML pages, DropSites automatically injects a minimal floating navigation widget into each served page at render time. The widget lists all HTML files as named links, appears as a small collapsed button in the bottom-right corner, and expands on click. Source files are never modified.

### UC-10  Create workspace and invite members

A user creates a workspace, gives it a name and optional namespace slug, and invites colleagues by email. Invitees receive an email with a join link. On acceptance they appear in the workspace member list with Publisher role by default. The workspace owner can change roles at any time.

### UC-11  Publish into a workspace

A publisher selects a workspace from a dropdown before uploading. The deployment is created under the workspace namespace and appears in the shared deployment list. All workspace members can see it. Only the publisher and workspace owners can modify or delete it.

### UC-12  Member departure and deployment handoff

A workspace owner removes a member. All deployments that member published remain live and intact — ownership transfers automatically to the workspace owner. The owner can then reassign individual deployments to other members or manage them directly.

### UC-13  Workspace billing

The workspace owner manages a single Stripe subscription covering all members and their deployments. Limits (deployment count, storage, bandwidth) apply at the workspace level — shared across all members. Individual members have no separate billing relationship.

### UC-14  API publish (Phase 2)

A script or CI pipeline POSTs a ZIP to /api/v1/deployments with an API key. The response includes the deployment URL. This enables fully headless publishing from any tool or pipeline.

### UC-15  Claude connector (Phase 3)

A Claude MCP connector calls the DropSites API at the end of a generation task. The user receives a live URL in the Claude chat interface — no manual upload step required.

# 3. Functional Requirements

> *Priority notation: M = Must Have  ·  S = Should Have  ·  C = Could Have  ·  W = Won't Have (this release)*

## 3.1  Upload & Ingestion


| ID    | Requirement                                                      | P   |
| ----- | ---------------------------------------------------------------- | --- |
| FR-01 | Accept single HTML file upload via drag-and-drop web UI          | M   |
| FR-02 | Accept ZIP archive upload containing index.html and assets       | M   |
| FR-03 | Auto-detect index.html as the site entry point within a ZIP      | M   |
| FR-04 | Validate that ZIPs contain a valid index.html before accepting   | M   |
| FR-05 | Enforce configurable maximum upload size (default: 50 MB)        | M   |
| FR-06 | Show real-time upload progress indicator                         | S   |
| FR-07 | Support folder drag-and-drop via webkitdirectory (Chrome / Edge) | S   |
| FR-08 | Accept PDF uploads — serve inline via browser PDF viewer         | C   |


## 3.2  URL Routing & Slug Management


| ID     | Requirement                                                                                                                           | P   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-09  | Auto-generate a URL-safe slug for every deployment (e.g. teal-fox-7342)                                                               | M   |
| FR-10  | Allow user to specify a custom slug at upload time                                                                                    | M   |
| FR-11  | Enforce slug uniqueness — reject duplicates with a clear inline error                                                                 | M   |
| FR-12  | Show live URL preview as the user types a custom slug                                                                                 | M   |
| FR-13  | Support optional namespace prefix per org or team (e.g. /acme/)                                                                       | S   |
| FR-14  | Serve all deployments under a configurable base domain                                                                                | M   |
| FR-338 | When a deployment slug is renamed, the old slug automatically redirects (301) to the new slug for 90 days                             | M   |
| FR-339 | Publisher can define custom redirects in dropsites.json: { "redirects": [{ "from": "/old-path", "to": "/new-path", "status": 301 }] } | S   |
| FR-340 | Redirect rules are applied at the serving layer — no source file modification                                                         | M   |


## 3.3  Content Serving


| ID     | Requirement                                                                                                                      | P   |
| ------ | -------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-15  | Serve all content over HTTPS with a valid TLS certificate                                                                        | M   |
| FR-16  | Set correct MIME types for HTML, CSS, JS, images, fonts, and PDFs                                                                | M   |
| FR-17  | Resolve relative asset references within multi-file deployments                                                                  | M   |
| FR-18  | Return a custom branded 404 page for unknown slugs (platform-level — slug not found)                                             | M   |
| FR-335 | If a deployment contains a 404.html file, serve it for any asset request that resolves within the deployment but returns no file | M   |
| FR-336 | Custom 404.html is served with HTTP status 404 — not 200                                                                         | M   |
| FR-337 | If no 404.html exists in the deployment, fall back to the platform branded 404 page                                              | M   |
| FR-19  | Support HTTP cache headers (Cache-Control, ETag) on static assets                                                                | S   |
| FR-20  | Serve assets ≤ 1 MB within 200 ms on the same network                                                                            | M   |


## 3.4  Access Control & Security


| ID    | Requirement                                                                  | P   |
| ----- | ---------------------------------------------------------------------------- | --- |
| FR-21 | Require authentication to publish (SSO / OIDC on self-hosted; email on SaaS) | M   |
| FR-22 | Allow unauthenticated viewing of non-protected deployments by default        | M   |
| FR-23 | Allow publisher to toggle password protection on any deployment              | M   |
| FR-24 | Serve a password prompt before protected content loads                       | M   |
| FR-25 | Support roles: Publisher, Viewer, Administrator                              | M   |
| FR-26 | Administrators can delete or archive any deployment org-wide                 | M   |
| FR-27 | Publishers can delete or archive only their own deployments                  | M   |
| FR-28 | Support IP allowlist restriction per deployment                              | C   |


## 3.5  Publisher Dashboard


| ID    | Requirement                                                               | P   |
| ----- | ------------------------------------------------------------------------- | --- |
| FR-29 | List all deployments owned by the authenticated user                      | M   |
| FR-30 | Show name, URL, created date, last updated, and view count per deployment | M   |
| FR-31 | One-click copy of deployment URL to clipboard                             | M   |
| FR-32 | Allow publisher to rename the slug of an existing deployment              | S   |
| FR-33 | Allow publisher to overwrite content of an existing deployment            | M   |
| FR-34 | Allow publisher to delete a deployment with a confirmation step           | M   |
| FR-35 | Show storage usage per user and org-wide total                            | S   |
| FR-36 | Support search and filter on deployment list                              | S   |


## 3.6  Analytics


| ID     | Requirement                                                                                                           | P   |
| ------ | --------------------------------------------------------------------------------------------------------------------- | --- |
| FR-37  | Record a view event for every request to a deployment URL — after bot filtering                                       | M   |
| FR-331 | Filter known bots, crawlers, and monitoring agents before recording analytics events — use user-agent class detection | M   |
| FR-332 | Bot filter list: Googlebot, Bingbot, Slurp, DuckDuckBot, health checkers, uptime monitors, common scraper signatures  | M   |
| FR-333 | Requests filtered as bots are counted separately in admin analytics — not mixed with human views                      | M   |
| FR-334 | Bot filter is updatable via config without a deploy — list stored in database, not hardcoded                          | S   |
| FR-38  | Display total views and unique visitor count per deployment                                                           | M   |
| FR-39  | Show a daily/weekly time-series view chart per deployment                                                             | S   |
| FR-40  | Record referrer domain without storing PII                                                                            | S   |
| FR-41  | Provide org-wide usage summary for Administrators                                                                     | S   |
| FR-42  | Export analytics as CSV                                                                                               | C   |


## 3.8  In-Browser Editing


| ID    | Requirement                                                                 | P   |
| ----- | --------------------------------------------------------------------------- | --- |
| FR-51 | Provide a code editor accessible from any deployment's detail page          | M   |
| FR-52 | Load the full HTML source of any file in the deployment into the editor     | M   |
| FR-53 | Support syntax highlighting for HTML, CSS, and JavaScript                   | M   |
| FR-54 | Save & publish in one click — change is live immediately, no re-upload      | M   |
| FR-55 | For multi-file deployments, allow switching between files within the editor | M   |
| FR-56 | Show a diff summary of what changed since the last publish                  | S   |
| FR-57 | Auto-save a local draft if the user closes without publishing               | S   |


## 3.9  Quick Actions — Dashboard


| ID    | Requirement                                                                                           | P   |
| ----- | ----------------------------------------------------------------------------------------------------- | --- |
| FR-58 | Expose "Lock / Unlock" icon on every deployment row — toggles password protection in one click        | M   |
| FR-59 | Expose "Delete" icon on every deployment row — removes deployment after a single confirmation         | M   |
| FR-60 | When enabling password protection from the row, show an inline password input — no navigation away    | M   |
| FR-61 | Expose "Update" icon on every deployment row — opens inline upload zone without leaving the dashboard | M   |
| FR-62 | Show a lock badge on any password-protected deployment row so state is visible at a glance            | M   |
| FR-63 | Allow bulk delete of multiple deployments from a checkbox selection                                   | S   |


## 3.10  Auto-Navigation for Multi-Page Deployments


| ID    | Requirement                                                                                    | P   |
| ----- | ---------------------------------------------------------------------------------------------- | --- |
| FR-64 | Detect when a multi-file deployment contains no inter-page navigation links                    | M   |
| FR-65 | Inject a floating navigation widget at serve time — source files are never modified on disk    | M   |
| FR-66 | Widget style: collapsed button (bottom-right corner), expands on click to show page list       | M   |
| FR-67 | Widget lists all .html files in the deployment as human-readable named links                   | M   |
| FR-68 | Highlight the currently active page in the widget                                              | M   |
| FR-69 | Allow publisher to disable the auto-nav widget per deployment                                  | S   |
| FR-70 | Widget is responsive — works correctly on mobile viewports                                     | M   |
| FR-71 | Widget never obscures the deployment's own UI elements — z-index and position are configurable | S   |


## 3.11  REST API — Phase 2


| ID    | Requirement                                                         | P    |
| ----- | ------------------------------------------------------------------- | ---- |
| FR-43 | POST /api/v1/deployments — create a new deployment                  | M·P2 |
| FR-44 | Accept multipart/form-data with file and optional slug field        | M·P2 |
| FR-45 | Return JSON with deployment URL and metadata on success             | M·P2 |
| FR-46 | Support API key authentication for all API endpoints                | M·P2 |
| FR-47 | Allow API key generation and revocation from the dashboard          | M·P2 |
| FR-48 | GET /api/v1/deployments — list caller's deployments with pagination | S·P2 |
| FR-49 | DELETE /api/v1/deployments/:slug — archive a deployment             | S·P2 |
| FR-50 | Enforce per-key rate limiting (default: 60 req/min, configurable)   | M·P2 |


## 3.12  Supported File Types & Static Site Formats

DropSites is not HTML-only. It serves any file a browser can render or execute as a standalone static site. The constraint is execution context: files must not require a server-side runtime to function.


| Category         | Formats                                           | Notes                                                                                                 |
| ---------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Markup           | HTML (.html, .htm)                                | Primary entry point. index.html required for multi-file deployments.                                  |
| Styling          | CSS (.css)                                        | Served as linked assets. Inline styles in HTML are inherently supported.                              |
| JavaScript       | .js, .mjs, .cjs                                   | Client-side JS only. Node.js scripts are out of scope — they require a runtime.                       |
| Compiled JS apps | React, Vue, Svelte, Vite builds                   | Any framework that compiles to static HTML + JS + CSS is fully supported. Claude often outputs these. |
| Data             | .json, .geojson, .csv                             | Served as static assets, referenced by JS. Not executed server-side.                                  |
| Images           | .png, .jpg, .jpeg, .webp, .gif, .svg, .avif, .ico | All common web image formats. SVG served with correct MIME type.                                      |
| Fonts            | .woff, .woff2, .ttf, .otf, .eot                   | Self-hosted fonts within a deployment.                                                                |
| Documents        | .pdf                                              | Served inline via browser PDF viewer.                                                                 |
| WebAssembly      | .wasm                                             | Served with application/wasm MIME type. Increasingly common in AI-generated code.                     |
| Media            | .mp4, .webm, .mp3, .ogg                           | Served as static media assets. Subject to per-file size limits.                                       |
| Manifest         | dropsites.json                                    | DropSites-specific config file. Never served to visitors.                                             |



| ID     | Requirement                                                                                                                                      | P   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | --- |
| FR-193 | Serve all file types in the supported formats table with correct MIME types                                                                      | M   |
| FR-194 | A deployment with no index.html but a single .html file — serve that file as the entry point                                                     | M   |
| FR-195 | A deployment with no .html file at all — serve a directory listing of all files                                                                  | S   |
| FR-196 | A bare .js file uploaded alone — wrap it in a minimal HTML shell so it executes in a browser                                                     | S   |
| FR-197 | Explicitly reject file types that require server-side execution: .php, .py, .rb, .sh, .exe, .node                                                | M   |
| FR-198 | Serve .wasm files with Content-Type: application/wasm and Cross-Origin-Embedder-Policy headers                                                   | M   |
| FR-199 | Validate that uploaded ZIPs contain at least one web-renderable file before accepting                                                            | M   |
| FR-341 | Default behaviour: serve X-Robots-Tag: noindex, nofollow on all deployment responses — deployments are private by default                        | M   |
| FR-342 | Publisher can toggle indexing per deployment: "Allow search engines to index this deployment" — sets X-Robots-Tag: all                           | M   |
| FR-343 | If a deployment includes a robots.txt file, serve it at /robots.txt and remove the X-Robots-Tag header — publisher's robots.txt takes precedence | M   |
| FR-344 | Platform-level admin setting: allow or disallow indexing globally — overrides per-deployment setting                                             | S   |


## 3.13  Authentication & SSO

Authentication strategy differs between the SaaS hosted tier and self-hosted deployments. The SaaS tier prioritises zero-friction onboarding; self-hosted prioritises enterprise identity integration.


| Method             | Tier        | Phase   | Notes                                                                                     |
| ------------------ | ----------- | ------- | ----------------------------------------------------------------------------------------- |
| Email + magic link | SaaS        | Phase 1 | Default auth for dropsites.app. No password required. Link expires in 15 minutes.         |
| Google OAuth       | SaaS        | Phase 1 | One-click sign-in with Google account. Most common expectation for individual users.      |
| GitHub OAuth       | SaaS        | Phase 1 | One-click sign-in with GitHub. Targets developer users and AI power users.                |
| OIDC / OAuth 2.0   | Self-hosted | Phase 1 | SSO with Okta, Azure AD, Google Workspace, Keycloak. Required for enterprise deployments. |
| SAML 2.0           | Self-hosted | Phase 2 | Legacy enterprise SSO providers.                                                          |
| API Key (Bearer)   | Both        | Phase 2 | Machine-to-machine access for scripts, pipelines, and MCP connector.                      |



| ID     | Requirement                                                                                                                                                     | P   |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-200 | SaaS tier: support email magic link, Google OAuth, and GitHub OAuth at launch                                                                                   | M   |
| FR-201 | Self-hosted tier: support OIDC/OAuth 2.0 at launch                                                                                                              | M   |
| FR-202 | New users are auto-provisioned on first login from any supported auth method                                                                                    | M   |
| FR-203 | Users can link multiple auth methods to a single account (e.g. email + Google)                                                                                  | S   |
| FR-204 | Email must be verified before a user can publish their first deployment                                                                                         | M   |
| FR-205 | Account creation rate limit: max 5 new accounts per IP per hour                                                                                                 | M   |
| FR-328 | SaaS tier workspaces on Team profile can configure Google Workspace OIDC for all members — one SSO login for the whole team, no individual magic links required | M   |
| FR-329 | Workspace SSO config: client ID, client secret, discovery URL — set by workspace owner, applied to all members                                                  | M   |
| FR-330 | When workspace SSO is active, members are redirected to the IdP on login — magic link and social OAuth are disabled for that workspace                          | M   |


## 3.14  Share Flow

Sharing is a primary action, not an afterthought. Every deployment must be shareable in under 3 seconds from any context — dashboard row, detail page, or post-upload success screen.


| ID     | Requirement                                                                                             | P   |
| ------ | ------------------------------------------------------------------------------------------------------- | --- |
| FR-206 | Every deployment row and detail page has a single "Share" button as a primary action                    | M   |
| FR-207 | Share button opens a share sheet modal containing all sharing options in one place                      | M   |
| FR-208 | Share sheet shows: current URL (with one-click copy), access state (public / protected / disabled)      | M   |
| FR-209 | Share sheet includes: Copy link, Copy embed code, Download QR (PNG), Download QR (SVG)                  | M   |
| FR-210 | Share sheet includes: Send via email (opens mailto: with URL pre-filled)                                | M   |
| FR-211 | Share sheet includes: toggle password protection inline — no navigation away                            | M   |
| FR-212 | Share sheet is accessible from the post-upload success screen immediately after publish                 | M   |
| FR-213 | Copying the link from the share sheet shows a brief "Copied" confirmation                               | M   |
| FR-214 | Share sheet is keyboard navigable and screen-reader accessible                                          | S   |
| FR-215 | Share sheet remembers last-used action per user (e.g. if you always copy the embed, that tab is active) | C   |


## 3.15  Abuse Prevention — Posture A (Phase 1)

Posture A covers reactive controls and structural deterrents. The goal is to make DropSites a hostile environment for abuse without building a content moderation team. All Posture A items ship in Phase 1.


| ID     | Requirement                                                                                                                       | P   |
| ------ | --------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-216 | Email verification required before first publish — unverified accounts cannot deploy                                              | M   |
| FR-217 | Deployment creation rate limit per account: max 10 deployments per hour, 50 per day                                               | M   |
| FR-218 | Account creation rate limit: max 5 accounts per IP per hour                                                                       | M   |
| FR-219 | Every served page includes an unobtrusive "Report abuse" link in the footer                                                       | M   |
| FR-220 | Abuse report form captures: reporter email, reason (phishing / malware / CSAM / copyright / other), and optional description      | M   |
| FR-221 | Abuse reports trigger an email to the platform admin immediately                                                                  | M   |
| FR-222 | Admin can disable any deployment in one click from the admin console — takes effect within 5 seconds                              | M   |
| FR-223 | Admin can suspend any account (blocks all deployments and new publishes) from the admin console                                   | M   |
| FR-224 | Disabled deployments serve a neutral "This content is unavailable" page — no indication of why                                    | M   |
| FR-225 | DMCA takedown process documented at dropsites.app/dmca with a submission form                                                     | M   |
| FR-226 | Terms of Service and Acceptable Use Policy published and linked from every page footer                                            | M   |
| FR-227 | New users must accept Terms of Service at account creation — acceptance is timestamped and stored                                 | M   |
| FR-345 | Dashboard shows a cookie consent banner on first visit — required before any non-essential cookies are set                        | M   |
| FR-346 | Cookie consent records: timestamp, user agent, IP hash, consent version — stored for audit                                        | M   |
| FR-347 | Served deployments do not have cookie consent injected by DropSites — publishers are responsible for their own content compliance | M   |
| FR-348 | Cookie policy published at dropsites.app/cookies listing all cookies set, their purpose, and lifetime                             | M   |
| FR-349 | Dashboard uses strictly necessary cookies only until consent is given — no analytics or preference cookies before consent         | M   |
| FR-228 | Monitor dropsites.app domain against Google Safe Browsing blocklist daily — alert admin if flagged                                | M   |
| FR-229 | Content hash registry: store SHA-256 hash of every uploaded file — prevent byte-for-byte re-upload of previously removed content  | M   |
| FR-230 | Accounts with 3 or more confirmed abuse takedowns are automatically suspended pending review                                      | S   |


## 3.16  Abuse Prevention — Posture B (Phase 2)

Posture B adds proactive automated scanning. Every upload is checked before going live. This protects the dropsites.app domain reputation at scale and reduces admin burden as user numbers grow.


| ID     | Requirement                                                                                                      | P    |
| ------ | ---------------------------------------------------------------------------------------------------------------- | ---- |
| FR-231 | Scan every uploaded file against Google Safe Browsing API before the deployment goes live                        | M·P2 |
| FR-232 | Scan every uploaded file against VirusTotal API (or equivalent) for known malware signatures                     | M·P2 |
| FR-233 | Extract all outbound URLs from uploaded HTML/JS and check each against Safe Browsing — flag if any match         | M·P2 |
| FR-234 | If any scan returns a positive match, quarantine the deployment — do not publish, notify admin                   | M·P2 |
| FR-235 | Quarantined deployments are held for human review — admin can approve, reject, or escalate                       | M·P2 |
| FR-236 | Publisher is notified if their deployment is quarantined, with a generic reason — no scan details disclosed      | M·P2 |
| FR-237 | Scan processing must not block the upload response — scanning happens async, deployment shows "processing" state | M·P2 |
| FR-238 | Scanning SLA: deployment goes live within 60 seconds of upload if scan is clean                                  | M·P2 |
| FR-239 | Re-scan all active deployments weekly against updated signature databases                                        | S·P2 |
| FR-240 | Accounts with any confirmed malware or phishing deployment are automatically permanently suspended               | M·P2 |
| FR-241 | Transparency report: publish quarterly aggregate stats on takedowns, scan results, and account suspensions       | S·P2 |


## 3.17  Custom Domains


| ID    | Requirement                                                                  | P   |
| ----- | ---------------------------------------------------------------------------- | --- |
| FR-72 | Allow Pro/Team users to add a custom domain to any deployment                | M   |
| FR-73 | Auto-provision TLS certificate for custom domain via ACME / Let's Encrypt    | M   |
| FR-74 | Keep the dropsites.app URL active as a fallback after custom domain is added | M   |
| FR-75 | Show DNS setup instructions inline with CNAME target pre-filled              | M   |
| FR-76 | Display domain verification status (pending / verified / error) in dashboard | M   |


## 3.18  Link Expiry


| ID    | Requirement                                                                    | P   |
| ----- | ------------------------------------------------------------------------------ | --- |
| FR-77 | Allow publisher to set an expiry date/time on any deployment                   | M   |
| FR-78 | When expiry passes, deactivate and show a branded "This link has expired" page | M   |
| FR-79 | Publisher can reactivate an expired deployment or permanently delete it        | M   |
| FR-80 | Show expiry date badge on deployment rows that have an expiry set              | S   |
| FR-81 | Send email notification 24 hours before expiry                                 | S   |


## 3.19  QR Codes


| ID    | Requirement                                               | P   |
| ----- | --------------------------------------------------------- | --- |
| FR-82 | Generate a QR code for every deployment URL automatically | M   |
| FR-83 | One-click PNG download from dashboard row and detail page | M   |
| FR-84 | QR code updates if the deployment slug changes            | M   |
| FR-85 | Support SVG export in addition to PNG                     | S   |


## 3.20  Embed Codes


| ID    | Requirement                                                                     | P   |
| ----- | ------------------------------------------------------------------------------- | --- |
| FR-86 | Generate a pre-built </body> embed snippet for every deployment                 | M   |
| FR-87 | Snippet includes sensible defaults: width 100%, height 600px, sandbox attribute | M   |
| FR-88 | Allow publisher to customise iframe dimensions before copying                   | S   |
| FR-89 | One-click copy of embed snippet from dashboard row and detail page              | M   |


## 3.21  Per-Recipient Access Tokens


| ID    | Requirement                                                                | P   |
| ----- | -------------------------------------------------------------------------- | --- |
| FR-90 | Allow Team users to generate named access tokens for individual recipients | M   |
| FR-91 | Each token produces a unique URL — e.g. dropsites.app/slug?t=abc123        | M   |
| FR-92 | Analytics events record which token was used for each view                 | M   |
| FR-93 | Publisher can revoke individual tokens without affecting others            | M   |
| FR-94 | Dashboard shows per-token view count and last-seen timestamp               | M   |
| FR-95 | Tokens can optionally expire after N views or a date                       | S   |


## 3.22  Temporary Disable


| ID    | Requirement                                                                       | P   |
| ----- | --------------------------------------------------------------------------------- | --- |
| FR-96 | Allow publisher to deactivate a deployment without deleting it                    | M   |
| FR-97 | Deactivated deployments show a branded "temporarily unavailable" page to visitors | M   |
| FR-98 | Publisher can reactivate in one click — all metadata and files preserved          | M   |
| FR-99 | Show a "paused" badge on deactivated deployment rows                              | M   |


## 3.23  Duplicate Deployment


| ID     | Requirement                                                                    | P   |
| ------ | ------------------------------------------------------------------------------ | --- |
| FR-100 | Allow publisher to duplicate any deployment from the dashboard                 | M   |
| FR-101 | Duplicate creates a new independent deployment under a new auto-generated slug | M   |
| FR-102 | Edits to the copy do not affect the original                                   | M   |
| FR-103 | Publisher is taken directly to rename the slug after duplicating               | S   |


## 3.24  Version History


| ID     | Requirement                                                                           | P   |
| ------ | ------------------------------------------------------------------------------------- | --- |
| FR-104 | Retain the last 3 published versions of every deployment (Pro and above)              | M   |
| FR-105 | Version history accessible from the deployment detail page                            | M   |
| FR-106 | Publisher can preview any previous version before restoring                           | M   |
| FR-107 | Restore any previous version in one click — it becomes the new live version           | M   |
| FR-108 | Each version records: timestamp, file size, publisher, source (upload / editor / API) | S   |


## 3.25  Password Protection — Hardening


| ID     | Requirement                                                                    | P   |
| ------ | ------------------------------------------------------------------------------ | --- |
| FR-109 | Rate-limit password attempts per IP: max 5 failures in 10 min → 15-min lockout | M   |
| FR-110 | Return generic error on failure — do not reveal whether the deployment exists  | M   |
| FR-111 | Log all failed password attempts to the audit log                              | M   |
| FR-112 | Enforce minimum password length of 8 characters at save time                   | S   |


## 3.26  Image Optimisation


| ID     | Requirement                                                                     | P   |
| ------ | ------------------------------------------------------------------------------- | --- |
| FR-113 | At ingest, auto-compress images larger than 200 KB in uploaded HTML / ZIP files | M   |
| FR-114 | Convert PNG and BMP to WebP at ingest if size reduction exceeds 20%             | S   |
| FR-115 | Inject loading="lazy" on all tags at serve time — never modifies source files   | M   |
| FR-116 | Show a storage saving summary after ingest (e.g. "Images: 4.2 MB → 1.1 MB")     | S   |


## 3.27  Auto-Navigation — Title Inference & Page Order


| ID     | Requirement                                                                        | P   |
| ------ | ---------------------------------------------------------------------------------- | --- |
| FR-117 | Infer human-readable page name from tag of each HTML file                          | M   |
| FR-118 | Fall back to first text if no present                                              | M   |
| FR-119 | Fall back to filename (without .html extension) if neither nor present             | M   |
| FR-120 | Default widget page ordering: alphabetical by inferred title                       | M   |
| FR-121 | Support dropsites.json manifest in ZIP root to define custom page order and labels | S   |
| FR-122 | dropsites.json also supports per-deployment widget disable flag                    | S   |


## 3.28  Webhooks


| ID     | Requirement                                                               | P   |
| ------ | ------------------------------------------------------------------------- | --- |
| FR-123 | Allow Team users to register webhook endpoints per deployment or org-wide | M   |
| FR-124 | Fire on: deployment created, updated, deleted, deactivated, reactivated   | M   |
| FR-125 | Payload is JSON: event type, slug, URL, timestamp, actor                  | M   |
| FR-126 | Retry failed deliveries up to 3 times with exponential backoff            | M   |
| FR-127 | Show webhook delivery log (last 50 events) with status and response code  | S   |
| FR-128 | Sign payloads with HMAC-SHA256 so receivers can verify authenticity       | M   |


## 3.29  API — Single-File PATCH


| ID     | Requirement                                                                              | P    |
| ------ | ---------------------------------------------------------------------------------------- | ---- |
| FR-129 | PATCH /api/v1/deployments/:slug/files/:path — update one file in a multi-file deployment | M·P2 |
| FR-130 | Accept new file content as multipart/form-data                                           | M·P2 |
| FR-131 | All other files in the deployment are unchanged                                          | M·P2 |
| FR-132 | Response includes updated deployment metadata and a new version record                   | M·P2 |


## 3.30  Deployment Health Check


| ID     | Requirement                                                                  | P   |
| ------ | ---------------------------------------------------------------------------- | --- |
| FR-133 | Run a background health check after every publish or overwrite               | M   |
| FR-134 | Check that index.html returns HTTP 200 and all linked assets resolve         | M   |
| FR-135 | Display health status on every dashboard row: OK / Warning / Broken          | M   |
| FR-136 | Show list of specific broken asset paths when status is Warning or Broken    | S   |
| FR-137 | Allow publisher to re-run health check on demand from deployment detail page | S   |


## 3.31  Infrastructure Portability & Deployment Packaging

DropSites must be deployable into any cloud environment or on-premise infrastructure a customer requires. No cloud provider SDKs are hardcoded. All configuration is environment-variable driven.


| ID     | Requirement                                                                                                                                               | P   |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-191 | All storage operations use an S3-compatible API abstraction — no AWS SDK calls directly in application code                                               | M   |
| FR-192 | Storage backend is selected via environment variable: local | s3 | gcs | azure — all use the same S3-compatible interface                                 | M   |
| FR-193 | Database backend is selected via environment variable: sqlite | postgresql                                                                                | M   |
| FR-194 | All secrets (API keys, DB credentials, licence keys) loaded from environment variables or a mounted secrets volume — never from config files in the image | M   |
| FR-195 | Publish a Helm chart for Kubernetes deployment — tested on GKE, EKS, and AKS                                                                              | M   |
| FR-196 | Publish Terraform modules for GCP, AWS, and Azure — provisions all required infrastructure and deploys the container                                      | M   |
| FR-197 | Publish a docker-compose.yml for single-node on-premise deployments                                                                                       | M   |
| FR-198 | Publish a cloud mapping reference document: DropSites component → GCP / AWS / Azure / on-premise equivalent                                               | M   |
| FR-199 | All container images published to a registry accessible without egress to dropsites.app — supports air-gapped deployments                                 | S   |
| FR-200 | Provide a configuration validation command: dropsites validate-config — checks all required env vars and connectivity before first run                    | M   |
| FR-201 | Health check endpoint (/health) reports storage backend, database, and licence key status separately                                                      | M   |


## 3.32  Enterprise Deployment Delivery

Requirements covering the assisted deployment and private cloud instance commercial models.


| ID     | Requirement                                                                                                                           | P   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-202 | Licence key system: generate time-bound licence keys that unlock enterprise limit profiles and features                               | M   |
| FR-203 | Licence key validated at startup and rechecked every 24 hours — graceful degradation if validation fails (warn, do not break serving) | M   |
| FR-204 | Licence key encodes: customer name, expiry date, allowed deployment count, feature flags                                              | M   |
| FR-205 | Admin console shows licence key status, expiry date, and feature entitlements                                                         | M   |
| FR-206 | Support air-gapped licence validation — licence key must be verifiable without calling home to dropsites.app                          | M   |
| FR-207 | Private cloud instance isolation: each customer instance has a fully separate database and storage bucket — no shared data layer      | M   |
| FR-208 | Private cloud instance: customer brings their own domain and SSO — no dropsites.app branding required                                 | S   |
| FR-209 | Deployment runbook: step-by-step guide for assisted deployment into GCP, AWS, and Azure customer accounts                             | M   |
| FR-210 | Post-deployment verification checklist: confirms storage, database, auth, TLS, and health check all pass before handoff               | M   |


## 3.33  Limit Profile System

The limit profile system is the foundation for all resource enforcement. Every limit check routes through this abstraction. Built in Phase 1 even though paid tiers are Phase 2.


| ID     | Requirement                                                                                | P   |
| ------ | ------------------------------------------------------------------------------------------ | --- |
| FR-139 | Every user record has a limit_profile field (default: "free") set at registration          | M   |
| FR-140 | Expose an internal assignProfile(userId, profileName) API — sole point of profile mutation | M   |
| FR-141 | Expose an internal getProfile(userId) API returning the full limit set for that user       | M   |
| FR-142 | All resource checks call getProfile — no hardcoded limits anywhere in the codebase         | M   |
| FR-143 | Profile definitions stored in config, not in code — changeable without a deploy            | M   |
| FR-144 | Administrators can assign any profile to any user from the admin console                   | M   |
| FR-145 | Profile change takes effect immediately — no restart or cache flush required               | M   |
| FR-146 | Profile assignment is recorded in the audit log                                            | M   |


## 3.34  Upload & Storage Limits


| ID     | Requirement                                                                              | P   |
| ------ | ---------------------------------------------------------------------------------------- | --- |
| FR-147 | Enforce per-deployment file size limit from the user's limit profile                     | M   |
| FR-148 | Enforce per-user total storage cap from the limit profile                                | M   |
| FR-149 | Enforce per-file size limit within a ZIP (default: 10 MB per individual file)            | M   |
| FR-150 | Enforce active deployment count limit from the limit profile                             | M   |
| FR-151 | Check all limits before accepting an upload — fail fast with a specific error            | M   |
| FR-152 | Show remaining storage and deployment quota in the upload zone before upload starts      | M   |
| FR-153 | Reject non-web asset types: .exe, .dmg, .apk, .iso, .node, .sh, and similar              | M   |
| FR-154 | Type-specific size caps: HTML/CSS/JS max 5 MB per file, images max 20 MB, fonts max 2 MB | S   |


## 3.35  Bandwidth & Traffic Limits


| ID     | Requirement                                                                           | P   |
| ------ | ------------------------------------------------------------------------------------- | --- |
| FR-155 | Track bytes served per deployment per calendar month                                  | M   |
| FR-156 | Track bytes served per user across all deployments per calendar month                 | M   |
| FR-157 | Enforce monthly bandwidth cap from the limit profile                                  | M   |
| FR-158 | When bandwidth cap is reached, serve a branded "bandwidth limit reached" page         | M   |
| FR-159 | Rate-limit requests to the serving layer per deployment: max 100 req/s (configurable) | M   |
| FR-160 | Rate-limit per IP per deployment: max 30 req/min to prevent scraping                  | S   |
| FR-161 | Block hotlinking of assets: reject Referer from external domains not in an allowlist  | S   |
| FR-162 | Reset monthly bandwidth counters on the first of each calendar month                  | M   |


## 3.36  API Rate Limits (Phase 2)


| ID     | Requirement                                                                            | P    |
| ------ | -------------------------------------------------------------------------------------- | ---- |
| FR-163 | Enforce per-minute rate limit on API keys from the limit profile (default: 60 req/min) | M·P2 |
| FR-164 | Enforce daily and monthly API request quotas per key from the limit profile            | M·P2 |
| FR-165 | Return HTTP 429 with Retry-After header when any rate limit is exceeded                | M·P2 |
| FR-166 | Enforce upload payload size on API uploads: same limit as UI from the profile          | M·P2 |
| FR-167 | Support burst vs sustained limiting: allow short bursts up to 3x per-minute limit      | S·P2 |


## 3.37  Usage Visibility — Publisher


| ID     | Requirement                                                                                        | P   |
| ------ | -------------------------------------------------------------------------------------------------- | --- |
| FR-168 | Dashboard usage panel: storage used / cap, deployments used / cap, bandwidth used / cap this month | M   |
| FR-169 | Storage trend sparkline (last 30 days) — see if approaching limit                                  | M   |
| FR-170 | Bytes served per deployment this month alongside view count                                        | M   |
| FR-171 | Per-deployment storage footprint (total bytes on disk) in deployment detail                        | M   |
| FR-172 | Email alert at 80% of storage quota                                                                | M   |
| FR-173 | Email alert at 80% of monthly bandwidth quota                                                      | M   |
| FR-174 | Email alert at 100% of any quota at the moment of enforcement                                      | M   |
| FR-175 | Usage export (CSV) covering storage, bandwidth, and view counts by deployment                      | S   |


## 3.38  Usage Visibility — Admin / Platform


| ID     | Requirement                                                                               | P   |
| ------ | ----------------------------------------------------------------------------------------- | --- |
| FR-176 | Admin console: org-wide totals — total storage, bandwidth this month, active deployments  | M   |
| FR-177 | Admin console: per-user breakdown — storage, bandwidth, deployment count, current profile | M   |
| FR-178 | Admin console: top 10 deployments by bandwidth this month                                 | M   |
| FR-179 | Admin console: top 10 users by storage consumption                                        | M   |
| FR-180 | Abuse flag: user bandwidth exceeds 10x their daily average in a single hour               | S   |
| FR-181 | Abuse flag: deployment receiving > 1,000 req/hour from a single IP                        | S   |
| FR-182 | Mark deployments as stale if not viewed in 90 days — surface in admin for cleanup         | S   |
| FR-183 | Admin export: full usage report as CSV per user, per deployment, per month                | M   |
| FR-184 | Namespace-level usage rollup for self-hosted enterprise: storage and bandwidth per team   | S   |


## 3.39  Limit Enforcement UX


| ID     | Requirement                                                                                         | P   |
| ------ | --------------------------------------------------------------------------------------------------- | --- |
| FR-185 | Show remaining quota inline in the upload zone before upload starts — not after failure             | M   |
| FR-186 | When a limit is hit, show which limit was exceeded and by how much                                  | M   |
| FR-187 | When storage is full, disable the upload zone visually with explanation — never silent fail         | M   |
| FR-188 | When deployment count limit is reached, disable "New deployment" button with explanation            | M   |
| FR-189 | When bandwidth cap is reached mid-month, notify publisher by email immediately                      | M   |
| FR-190 | Limit enforcement errors must never result in a partially uploaded or partially unpacked deployment | M   |


## 3.40  Notification System — Email & SMS

DropSites uses a deliberate notification system across email and SMS. Email handles confirmations, summaries, and quota warnings. SMS is reserved for time-sensitive and security-critical events where a few seconds matter. All notifications are opt-in per type — never a single on/off toggle.

### Notification Types — Publisher


| Event                                            | Email | SMS | Default            | Notes                                                          |
| ------------------------------------------------ | ----- | --- | ------------------ | -------------------------------------------------------------- |
| Deployment published successfully                | Yes   | No  | On                 | Includes the deployment URL in the email body                  |
| Deployment viewed for the first time             | Yes   | Yes | Email on · SMS off | Triggers once per deployment — not on every view               |
| Named recipient viewed deployment (access token) | Yes   | Yes | Email on · SMS on  | "Alice just opened your proposal" — high value, time-sensitive |
| View milestone reached (10 / 100 / 1,000 views)  | Yes   | No  | On                 | Configurable milestone thresholds                              |
| Deployment expiring in 24 hours                  | Yes   | Yes | Email on · SMS off | Only sent if expiry is set on the deployment                   |
| Deployment expired and deactivated               | Yes   | No  | On                 | Includes reactivation link                                     |
| Password brute-force attempt on deployment       | Yes   | Yes | Both on            | Security alert — triggers after 5 failed attempts              |
| Deployment taken down by admin                   | Yes   | Yes | Both on            | Urgent — publisher needs to know immediately                   |
| Abuse report filed against deployment            | Yes   | No  | On                 | Informational — no action required unless escalated            |
| Storage quota at 80%                             | Yes   | No  | On                 | Early warning — no action required yet                         |
| Storage quota at 100% (enforcement active)       | Yes   | Yes | Both on            | Action required — uploads blocked                              |
| Bandwidth cap at 80%                             | Yes   | No  | On                 | Early warning                                                  |
| Bandwidth cap at 100% (enforcement active)       | Yes   | Yes | Both on            | Action required — deployments serving limit page               |
| Licence expiring in 30 days (enterprise)         | Yes   | No  | On                 | Enterprise self-hosted only                                    |


### Notification Types — Admin


| Event                                                       | Email | SMS | Default | Notes                                                         |
| ----------------------------------------------------------- | ----- | --- | ------- | ------------------------------------------------------------- |
| New abuse report filed                                      | Yes   | Yes | Both on | Needs fast review — SMS ensures visibility                    |
| Deployment quarantined by Posture B scan                    | Yes   | Yes | Both on | Requires human review decision                                |
| Account auto-suspended (3+ confirmed takedowns)             | Yes   | Yes | Both on | High severity — may indicate coordinated abuse                |
| dropsites.app domain flagged in Safe Browsing               | Yes   | Yes | Both on | Critical — requires immediate response                        |
| Storage anomaly: user exceeds 10x daily average in 1 hour   | Yes   | No  | On      | Possible abuse or runaway script                              |
| Traffic anomaly: deployment > 1,000 req/hour from single IP | Yes   | Yes | Both on | Possible scraping or DDoS                                     |
| Weekly platform usage summary                               | Yes   | No  | On      | Aggregate stats — deployments, users, bandwidth, abuse events |


### Notification Infrastructure & Preferences


| ID     | Requirement                                                                                                                         | P   |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-211 | Email delivery via Resend or Postmark — transactional, not marketing. Provider configurable via environment variable.               | M   |
| FR-212 | SMS delivery via Twilio — phone number collected at account settings, verified via OTP before first SMS is sent                     | M   |
| FR-213 | Notification preferences UI in account settings — toggle each notification type independently for email and SMS                     | M   |
| FR-214 | All SMS notifications are opt-in — no SMS sent until user provides and verifies a phone number                                      | M   |
| FR-215 | Notification preference changes take effect immediately — no restart required                                                       | M   |
| FR-216 | All notification emails include a one-click unsubscribe link for that specific notification type                                    | M   |
| FR-217 | All notification emails are plain-text compatible — no HTML-only emails                                                             | S   |
| FR-218 | Admin notifications go to a configurable admin email address and optional admin phone number — separate from any user account       | M   |
| FR-219 | Notification delivery failures are logged and retried up to 3 times with exponential backoff                                        | M   |
| FR-220 | Notification send log visible to admin: event, channel, recipient (masked), status, timestamp                                       | S   |
| FR-221 | Rate limit notifications per user: max 10 SMS per hour, max 50 email per day — prevents alert storms                                | M   |
| FR-222 | Self-hosted deployments can configure their own SMTP server instead of Resend — no dependency on dropsites.app email infrastructure | M   |
| FR-223 | Self-hosted deployments can configure their own Twilio credentials — no dependency on dropsites.app SMS infrastructure              | M   |


## 3.41  Workspace Management

Requirements covering the workspace entity, membership, roles, and handoff scenarios.


| ID     | Requirement                                                                                                               | P   |
| ------ | ------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-224 | Every user account has a personal workspace created automatically on signup                                               | M   |
| FR-225 | Users can create additional named workspaces — no artificial limit on workspace count                                     | M   |
| FR-226 | Each workspace has an optional namespace slug — unique across the platform                                                | M   |
| FR-227 | Workspace owners can invite members by email — invitee receives a join email with accept link                             | M   |
| FR-228 | Invitation link expires after 7 days — owner can resend                                                                   | M   |
| FR-229 | Default role on invitation is Publisher — owner can change before or after acceptance                                     | M   |
| FR-230 | Workspace roles: Owner, Publisher, Viewer — as defined in Section 1.5                                                     | M   |
| FR-231 | Workspace owner can change any member's role at any time                                                                  | M   |
| FR-232 | Workspace owner can remove any member — their deployments transfer to the owner, never deleted                            | M   |
| FR-233 | Deployment ownership can be explicitly reassigned to any workspace member by the owner                                    | M   |
| FR-234 | A user can belong to multiple workspaces — workspace selector in dashboard nav                                            | M   |
| FR-235 | Workspace owner can delete the workspace — requires explicit confirmation and lists all deployments that will be archived | M   |
| FR-236 | Workspace member list shows: name, email, role, joined date, deployment count, last active                                | M   |
| FR-237 | Workspace has a dedicated settings page: name, namespace, members, billing, danger zone                                   | M   |
| FR-238 | Publisher can only delete their own deployments within a workspace — not other members's                                  | M   |
| FR-239 | Viewer role can see deployment list and analytics but cannot publish, overwrite, delete, or share                         | M   |
| FR-240 | Audit log records all workspace membership changes — invites, role changes, removals                                      | M   |


## 3.42  Trial Period


| ID     | Requirement                                                                                                   | P   |
| ------ | ------------------------------------------------------------------------------------------------------------- | --- |
| FR-241 | New SaaS accounts get a 14-day trial of the Pro limit profile automatically on signup                         | M   |
| FR-242 | Trial period is clearly indicated in the dashboard with a countdown and what happens when it ends             | M   |
| FR-243 | On trial expiry, account reverts to free profile — no content deleted, serving continues within free limits   | M   |
| FR-244 | Notification sent at trial day 7, day 12, and day 14 (expiry) via email                                       | M   |
| FR-245 | Trial can only be used once per email address — no trial reset by creating a new account                      | M   |
| FR-246 | Enterprise assisted deployment and private cloud instance trials are negotiated manually — no automated trial | S   |


## 3.43  Referral & Growth


| ID     | Requirement                                                                                                                             | P   |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-247 | Every free-tier served page includes a small "Published with DropSites" badge in the footer — links to dropsites.app                    | M   |
| FR-248 | Publisher can remove the badge on Pro tier and above                                                                                    | M   |
| FR-249 | Referral programme: publisher gets a unique referral link — when a signup converts to paid, referrer gets a credit or extended Pro time | S   |
| FR-250 | Referral tracking: dashboard shows how many people signed up via the publisher's link and how many converted                            | S   |


## 3.44  White-Labelling (Enterprise)


| ID     | Requirement                                                                                                                     | P   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-251 | Enterprise private cloud instance: all DropSites branding removed from dashboard, served pages, emails, and abuse report footer | M   |
| FR-252 | Customer logo and name replaces DropSites branding in the dashboard and email notifications                                     | M   |
| FR-253 | Abuse report footer link points to customer's own abuse reporting process, not dropsites.app/report                             | M   |
| FR-254 | White-label config: logo URL, brand name, primary colour, support email — set via admin console or environment variables        | M   |
| FR-255 | "Powered by DropSites" badge suppressed on all served pages — no reference to DropSites in any customer-facing surface          | M   |


## 3.45  Account Deletion & Data Portability


| ID     | Requirement                                                                                                                                                | P   |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-256 | User can request full account deletion from account settings — requires password or re-auth confirmation                                                   | M   |
| FR-257 | Account deletion: all personal deployments archived within 24 hours, user record anonymised, auth tokens invalidated                                       | M   |
| FR-258 | Workspace deployments the user published are transferred to the workspace owner, not deleted                                                               | M   |
| FR-259 | User can export all their data before deletion: deployments (as ZIPs), analytics, notification preferences, audit trail — as a single downloadable archive | M   |
| FR-260 | Data export request is processed within 24 hours — user notified by email when ready                                                                       | M   |
| FR-261 | Stripe subscriptions are cancelled automatically on account deletion — no manual step required                                                             | M   |
| FR-262 | Deleted accounts cannot be recovered — deletion confirmation screen makes this explicit                                                                    | M   |


## 3.46  Session Management


| ID     | Requirement                                                                                                   | P   |
| ------ | ------------------------------------------------------------------------------------------------------------- | --- |
| FR-263 | Session tokens expire after 30 days of inactivity — user must re-authenticate                                 | M   |
| FR-264 | User can view all active sessions (device, location approximation, last active) from account settings         | M   |
| FR-265 | User can terminate any individual session or all sessions except current from account settings                | M   |
| FR-266 | Sensitive actions require re-authentication: account deletion, password change, billing changes, removing 2FA | M   |
| FR-267 | The in-browser editor checks session validity before allowing a publish action — prompts re-auth if expired   | M   |
| FR-268 | Admin can force-terminate all sessions for any user account (for compromise response)                         | M   |


## 3.47  Data Residency


| ID     | Requirement                                                                                                                                     | P   |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-269 | SaaS tier: document the Cloudflare R2 storage region used — default US, EU region available on Team and above                                   | M   |
| FR-270 | EU region option: all deployment files and metadata stored in Cloudflare EU region — no data written to US nodes                                | S   |
| FR-271 | Data residency selection made at workspace level — all workspace deployments inherit the setting                                                | S   |
| FR-272 | Self-hosted and enterprise deployments inherit data residency from their chosen cloud region — DropSites makes no independent storage decisions | M   |
| FR-273 | Data residency setting documented in the privacy policy with specific region names and cloud provider                                           | M   |


## 3.48  Penetration Testing & Security Validation


| ID     | Requirement                                                                                                         | P   |
| ------ | ------------------------------------------------------------------------------------------------------------------- | --- |
| FR-274 | Conduct a third-party penetration test before public launch — scoped to the web application, API, and serving layer | M   |
| FR-275 | All critical and high findings from the pentest resolved before M1.16 (public launch)                               | M   |
| FR-276 | Medium findings have a documented remediation plan with timeline                                                    | M   |
| FR-277 | Annual penetration test cadence post-launch — results shared with enterprise customers on request                   | S   |
| FR-278 | Bug bounty programme considered post-launch — not in scope for Phase 1                                              | C   |


## 3.49  Content-Security-Policy Defaults

The CSP default must be defined explicitly — not left to Claude Code to invent. The default must not break legitimate JS apps while still providing meaningful protection.


| ID     | Requirement                                                                                                                                                   | P   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-279 | Default CSP for served deployments: default-src self; script-src self unsafe-inline; style-src self unsafe-inline; img-src * data:; connect-src *; font-src * | M   |
| FR-280 | Publisher can override the default CSP per deployment via dropsites.json manifest                                                                             | S   |
| FR-281 | CSP violations logged server-side via report-uri — visible to admin for abuse detection                                                                       | S   |
| FR-282 | Dashboard UI (not served deployments) uses a strict CSP: no unsafe-inline, no unsafe-eval                                                                     | M   |
| FR-283 | Document the default CSP and its rationale in the self-hosted runbook — explain why unsafe-inline is permitted for user deployments                           | M   |


## 3.50  Account Compromise Recovery


| ID     | Requirement                                                                                                      | P   |
| ------ | ---------------------------------------------------------------------------------------------------------------- | --- |
| FR-284 | Publisher can report account compromise via a dedicated form — no auth required to submit                        | M   |
| FR-285 | Compromise report triggers immediate account freeze: all sessions terminated, publishing disabled, admin alerted | M   |
| FR-286 | Identity re-verification required before account is unfrozen: email OTP + secondary verification                 | M   |
| FR-287 | Audit log of all actions taken during the freeze period — shown to user on account recovery                      | M   |
| FR-288 | Admin can manually freeze and unfreeze any account from the admin console                                        | M   |


## 3.51  Support Channel


| ID     | Requirement                                                                                                             | P   |
| ------ | ----------------------------------------------------------------------------------------------------------------------- | --- |
| FR-289 | In-product help widget accessible from every dashboard page — links to documentation and opens a support ticket form    | M   |
| FR-290 | Support ticket form captures: user email, subject, description, severity (question / bug / urgent), optional screenshot | M   |
| FR-291 | Support tickets routed to admin email — acknowledged within 24 hours on free tier, 4 hours on Pro/Team                  | M   |
| FR-292 | Enterprise contracts include a dedicated support SLA — defined in the contract, not in the product                      | M   |
| FR-293 | Public status page at status.dropsites.app — shows current platform health and incident history                         | M   |
| FR-294 | Incidents posted to status page within 15 minutes of detection — automatically via monitoring or manually by admin      | M   |


## 3.52  In-Product Changelog


| ID     | Requirement                                                                                       | P   |
| ------ | ------------------------------------------------------------------------------------------------- | --- |
| FR-295 | In-product changelog accessible from the dashboard — shows last 20 releases with date and summary | M   |
| FR-296 | New release indicator (dot badge on changelog icon) when user has not seen the latest entry       | M   |
| FR-297 | Limit changes and breaking changes highlighted with a distinct badge in the changelog             | M   |
| FR-298 | Email notification sent to all users when a limit profile changes — with 30-day notice minimum    | M   |
| FR-299 | Changelog entries also published as an RSS feed at dropsites.app/changelog.xml                    | S   |


## 3.53  Mobile & Responsive


| ID     | Requirement                                                                                                                          | P   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------ | --- |
| FR-300 | Dashboard is fully functional on mobile (375px viewport minimum) — all actions reachable without horizontal scroll                   | M   |
| FR-301 | On mobile: deployment list shows name, status badge, and share/options icons — secondary columns (size, dates) hidden behind expand  | M   |
| FR-302 | Upload zone on mobile: tap-to-browse replaces drag-and-drop as primary action — drag still works if supported                        | M   |
| FR-303 | Share sheet modal is bottom-sheet on mobile — full-width, thumb-friendly tap targets                                                 | M   |
| FR-304 | In-browser editor on mobile: full-screen mode, virtual keyboard aware — editor does not scroll behind keyboard                       | S   |
| FR-305 | Admin console is desktop-only — not required to be mobile-functional                                                                 | M   |
| FR-350 | Dashboard UI meets WCAG 2.1 AA — all interactive elements keyboard accessible, sufficient colour contrast, screen reader compatible  | M   |
| FR-351 | Upload zone is fully keyboard and screen-reader accessible — tab to focus, Enter to open file picker, status announced via aria-live | M   |
| FR-352 | Share sheet modal traps focus correctly — Escape closes, Tab cycles within modal, focus returns to trigger on close                  | M   |
| FR-353 | Password prompt page meets WCAG 2.1 AA — form labels, error messages, keyboard navigation                                            | M   |
| FR-354 | All system pages (404, expiry, bandwidth limit, unavailable) meet WCAG 2.1 AA                                                        | M   |
| FR-355 | Accessibility audit run before M1.18 (public launch) — using axe or equivalent automated tool plus manual keyboard walkthrough       | M   |


## 3.54  Empty States


| ID     | Requirement                                                                                                                                                         | P   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-306 | New user empty dashboard: large upload zone, 3-step "how it works" inline guide, no other clutter                                                                   | M   |
| FR-307 | Empty workspace: prompt to invite first member with a single CTA button                                                                                             | M   |
| FR-308 | Empty analytics: "No views yet — share your link to get started" with the share sheet pre-opened on click                                                           | M   |
| FR-309 | Empty search results: "No deployments match — try a different name" with clear filter                                                                               | M   |
| FR-310 | All empty states include a single clear next action — never a dead end                                                                                              | M   |
| FR-356 | New user onboarding: after first login, show a 3-step checklist — Upload your first file, Share your link, Invite a team member                                     | M   |
| FR-357 | Onboarding checklist persists in the dashboard until all 3 steps are complete — then collapses permanently                                                          | M   |
| FR-358 | First deployment success screen is a celebration moment — large URL display, confetti or animation, prominent share button, "You're live in X seconds" timing shown | M   |
| FR-359 | Trial countdown shown in dashboard header during 14-day trial period — "X days left on your Pro trial"                                                              | M   |
| FR-360 | Day 7 of trial: in-product prompt (not just email) — "You've published N deployments. Keep everything after your trial ends."                                       | M   |


## 3.55  Offline & Degraded State


| ID     | Requirement                                                                                                                               | P   |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------- | --- |
| FR-311 | If the dashboard loses network connectivity, show an inline "You are offline" banner — do not show a blank screen                         | M   |
| FR-312 | Dashboard retains last-loaded deployment list in memory during brief disconnections — does not clear on network drop                      | M   |
| FR-313 | If the serving layer returns a 5xx for a deployment, serve a branded error page: "This site is temporarily unavailable" with a retry link | M   |
| FR-314 | Served page error states never expose internal error details, stack traces, or infrastructure information                                 | M   |
| FR-315 | Backend health check (/health) distinguishes between degraded (serving up, publishing down) and down (both unavailable)                   | M   |


## 3.56  Editor Conflict Resolution


| ID     | Requirement                                                                                                                                                                                                        | P   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- |
| FR-316 | When a user opens the in-browser editor, record an editor_lock: deployment_id, user_id, opened_at                                                                                                                  | M   |
| FR-317 | If another process (API, Claude connector, another user) overwrites the deployment while the editor is open, the editor shows a warning banner: "This deployment was updated externally since you started editing" | M   |
| FR-318 | On conflict, editor offers three options: Discard my changes and reload, Keep my changes and overwrite, View diff before deciding                                                                                  | M   |
| FR-319 | Editor lock expires after 30 minutes of inactivity — lock released, warning shown if user returns                                                                                                                  | M   |
| FR-320 | Two users editing the same deployment simultaneously: second user sees a warning "X is currently editing this file"                                                                                                | S   |


## 3.57  API — Search, Filter & Workspace Endpoints


| ID     | Requirement                                                                                                                                                                             | P    |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| FR-321 | GET /api/v1/deployments supports query params: q (slug search), status (active|archived|disabled), namespace, workspace_id, created_after, created_before, sort (created|updated|views) | M·P2 |
| FR-322 | POST /api/v1/workspaces — create a workspace                                                                                                                                            | M·P2 |
| FR-323 | GET /api/v1/workspaces — list workspaces the caller is a member of                                                                                                                      | M·P2 |
| FR-324 | POST /api/v1/workspaces/:id/members — invite a member by email                                                                                                                          | M·P2 |
| FR-325 | DELETE /api/v1/workspaces/:id/members/:user_id — remove a member                                                                                                                        | M·P2 |
| FR-326 | PATCH /api/v1/workspaces/:id/members/:user_id — update member role                                                                                                                      | M·P2 |
| FR-327 | GET /api/v1/workspaces/:id/analytics — aggregate analytics for all workspace deployments                                                                                                | S·P2 |


## 3.58  Two-Factor Authentication (Phase 2)


| ID     | Requirement                                                                                                 | P    |
| ------ | ----------------------------------------------------------------------------------------------------------- | ---- |
| FR-361 | Support TOTP-based 2FA (Google Authenticator, Authy) for all SaaS accounts                                  | M·P2 |
| FR-362 | Users can enable 2FA from account security settings — shows QR code for authenticator app setup             | M·P2 |
| FR-363 | On login, if 2FA is enabled, prompt for TOTP code after primary auth — before dashboard access              | M·P2 |
| FR-364 | Generate 8 single-use backup codes on 2FA setup — downloadable, shown once                                  | M·P2 |
| FR-365 | Workspace owners can require 2FA for all workspace members — non-compliant members locked out until enabled | S·P2 |
| FR-366 | Admin can disable 2FA for a specific account (for recovery) — action logged in audit trail                  | M·P2 |


## 3.59  Password-Based Authentication (Phase 2)


| ID     | Requirement                                                                                            | P    |
| ------ | ------------------------------------------------------------------------------------------------------ | ---- |
| FR-367 | Support email + password authentication as an alternative to magic link and OAuth on the SaaS tier     | M·P2 |
| FR-368 | Passwords stored as bcrypt hashes with cost factor ≥ 12 — never stored in plaintext or reversible form | M·P2 |
| FR-369 | Password requirements: minimum 10 characters, no maximum — strength meter shown in UI                  | M·P2 |
| FR-370 | Forgot password flow: email link valid for 15 minutes, invalidated after use                           | M·P2 |
| FR-371 | Pwned password check: reject passwords that appear in known breach databases (HaveIBeenPwned API)      | S·P2 |


## 3.60  Annual Billing & Invoice Access (Phase 2)


| ID     | Requirement                                                                                                                       | P    |
| ------ | --------------------------------------------------------------------------------------------------------------------------------- | ---- |
| FR-372 | Offer monthly and annual billing options for Pro and Team profiles — annual is 2 months free (16% discount)                       | M·P2 |
| FR-373 | Annual vs monthly toggle shown prominently on the upgrade/pricing page                                                            | M·P2 |
| FR-374 | Workspace billing page: list all past invoices with date, amount, status — each downloadable as PDF                               | M·P2 |
| FR-375 | Stripe customer portal accessible from workspace billing settings — handles payment method updates, invoice history, cancellation | M·P2 |
| FR-376 | Email invoice sent automatically by Stripe on each successful charge — no custom email needed                                     | M·P2 |


## 3.61  Failed Payment & Dunning (Phase 2)


| ID     | Requirement                                                                                                                     | P    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- | ---- |
| FR-377 | Enable Stripe Smart Retries for failed payments — automatic retry at optimal intervals                                          | M·P2 |
| FR-378 | On first payment failure: email notification to workspace owner — "Update your payment method"                                  | M·P2 |
| FR-379 | Grace period: 7 days after first failure before workspace is downgraded to free profile                                         | M·P2 |
| FR-380 | During grace period: dashboard shows persistent warning banner — "Your payment failed, update your card to avoid losing access" | M·P2 |
| FR-381 | After grace period expires: workspace downgraded to free profile — content continues serving, publishing limited to free limits | M·P2 |
| FR-382 | On payment recovery: workspace immediately restored to paid profile — no manual intervention required                           | M·P2 |


## 3.62  Geographic & Device Analytics (Phase 2)


| ID     | Requirement                                                                                          | P    |
| ------ | ---------------------------------------------------------------------------------------------------- | ---- |
| FR-383 | Record country-level geolocation for each view event — derived from IP, IP not stored                | M·P2 |
| FR-384 | Analytics dashboard shows top 10 countries by view count as a bar chart or map                       | M·P2 |
| FR-385 | Record device class (mobile / tablet / desktop) and browser family for each view event               | M·P2 |
| FR-386 | Analytics dashboard shows device and browser breakdown as percentage charts                          | M·P2 |
| FR-387 | Analytics comparison mode: select two date ranges and show delta — views, bandwidth, unique visitors | S·P2 |
| FR-388 | Shareable read-only analytics link per deployment — no login required for recipient                  | S·P2 |


## 3.63  CORS Header Control (Phase 2)


| ID     | Requirement                                                                                        | P    |
| ------ | -------------------------------------------------------------------------------------------------- | ---- |
| FR-389 | Publisher can configure CORS per deployment via dropsites.json: allowed origins, methods, headers  | M·P2 |
| FR-390 | Simple toggle in deployment settings: "Allow all origins (CORS *)" — for public APIs and open data | M·P2 |
| FR-391 | Default CORS behaviour: no Access-Control-Allow-Origin header — browser same-origin policy applies | M·P2 |
| FR-392 | CORS config validated at save time — malformed origins rejected with a clear error                 | S·P2 |


## 3.64  Workspace Transfer & Advanced Management (Phase 2)


| ID     | Requirement                                                                                                                                      | P    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| FR-393 | Workspace owner can transfer ownership to any current member — requires confirmation from the new owner                                          | M·P2 |
| FR-394 | On transfer: previous owner is demoted to Publisher role unless they choose to leave                                                             | M·P2 |
| FR-395 | Workspace default settings: owner can set defaults for all new deployments — expiry period, indexing, classification, password required          | M·P2 |
| FR-396 | Workspace activity feed: last 100 events across all workspace members — who published, updated, deleted, invited                                 | S·P2 |
| FR-397 | Guest access: workspace owner can generate a read-only workspace view link — recipient sees deployment list and analytics without being a member | S·P2 |


## 3.65  SDK, CLI & CI Integration (Phase 2)


| ID     | Requirement                                                                                           | P    |
| ------ | ----------------------------------------------------------------------------------------------------- | ---- |
| FR-398 | Publish an official JavaScript/TypeScript SDK — wraps all REST API endpoints, handles auth and errors | M·P2 |
| FR-399 | Publish an official Python SDK — same coverage as JS SDK                                              | S·P2 |
| FR-400 | Publish a CLI tool: dropsites deploy --slug --workspace                                               | M·P2 |
| FR-401 | CLI supports: deploy, list, delete, update, open (opens deployment URL in browser)                    | M·P2 |
| FR-402 | CLI auth: dropsites login generates an API key stored in ~/.dropsites/config                          | M·P2 |
| FR-403 | Publish an official GitHub Actions action: dropsites/deploy-action — deploys a directory on push      | M·P2 |
| FR-404 | Webhook payload includes deployment content hash (SHA-256 of all files) and version ID                | M·P2 |


## 3.66  Backup Strategy & Disaster Recovery (Phase 2)


| ID     | Requirement                                                                                                               | P    |
| ------ | ------------------------------------------------------------------------------------------------------------------------- | ---- |
| FR-405 | Automated daily backup of all deployment files and metadata — retained for 30 days                                        | M·P2 |
| FR-406 | Backup stored in a separate Cloudflare R2 bucket in a different region from the primary                                   | M·P2 |
| FR-407 | Monthly restoration test: restore a random sample of deployments from backup — results logged                             | M·P2 |
| FR-408 | Disaster recovery runbook documented: step-by-step for database loss, R2 unavailability, application tier crash           | M·P2 |
| FR-409 | RTO target of < 1 hour verified by a simulated failover test before Phase 2 GA                                            | M·P2 |
| FR-410 | Log retention policy: application logs retained 90 days, audit logs retained 2 years, analytics events retained 13 months | M·P2 |


## 3.67  SLA Document & Uptime Commitment (Phase 2)


| ID     | Requirement                                                                                                                                  | P    |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| FR-411 | Publish a Service Level Agreement at dropsites.app/sla before any paid tier launches                                                         | M·P2 |
| FR-412 | SLA defines: uptime commitment (99.9%), measurement period (calendar month), exclusions (planned maintenance, force majeure)                 | M·P2 |
| FR-413 | SLA defines service credits: if uptime falls below 99.9%, affected customers receive pro-rata credit — automatically applied to next invoice | M·P2 |
| FR-414 | Uptime measured and published on status.dropsites.app — 90-day rolling history visible to all                                                | M·P2 |
| FR-415 | Enterprise contracts include a negotiated SLA — minimum 99.5% (allows for maintenance windows)                                               | S·P2 |


## 3.68  Deployment Preview Thumbnail (Phase 2)


| ID     | Requirement                                                                                                      | P    |
| ------ | ---------------------------------------------------------------------------------------------------------------- | ---- |
| FR-416 | Generate a screenshot thumbnail of every deployment at publish time — 1280x800px, stored as WebP                 | M·P2 |
| FR-417 | Thumbnail displayed in the deployment list as a small preview image on each row                                  | M·P2 |
| FR-418 | Thumbnail regenerated on every overwrite or in-browser edit publish                                              | M·P2 |
| FR-419 | Thumbnail generation is async — deployment goes live before thumbnail is ready, placeholder shown until complete | M·P2 |
| FR-420 | Thumbnail generation uses a headless browser (Playwright or Puppeteer) running in a sandboxed container          | M·P2 |


## 3.69  Analytics PDF Export & Global Search (Phase 2)


| ID     | Requirement                                                                                                                                                     | P    |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| FR-421 | Generate a formatted analytics report PDF for any deployment — covers selected date range, views, bandwidth, top referrers, device breakdown, country breakdown | S·P2 |
| FR-422 | Analytics PDF branded with DropSites — publisher name, deployment name, date range on cover                                                                     | S·P2 |
| FR-423 | Global search across all workspaces the user is a member of — single search bar in app header, results grouped by workspace                                     | M·P2 |
| FR-424 | Global search searches deployment names, slugs, and custom domains — not file contents                                                                          | M·P2 |
| FR-425 | Global search results show workspace name, deployment health status, and last updated date                                                                      | M·P2 |


# 4. Non-Functional Requirements

## 4.1  Performance & Speed

DropSites must load fast in all contexts — both on internal networks and over the public internet on mobile connections. Speed is a first-class product requirement, not a nice-to-have.


| ID     | Requirement                                                                                                                       | Target                               |
| ------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| NFR-01 | Time to First Byte (TTFB) for a served deployment                                                                                 | < 100 ms (LAN) / < 300 ms (internet) |
| NFR-02 | Largest Contentful Paint (LCP) for a 500 KB deployment                                                                            | < 1.5 s on a 4G mobile connection    |
| NFR-03 | Upload + processing time for a 10 MB ZIP                                                                                          | < 5 seconds                          |
| NFR-04 | Dashboard first meaningful paint                                                                                                  | < 1 second                           |
| NFR-05 | Concurrent deployments served without degradation                                                                                 | ≥ 500                                |
| NFR-06 | Static assets served with aggressive cache headers (Cache-Control: max-age=31536000, immutable) on versioned assets               | Required                             |
| NFR-07 | Brotli and gzip compression enabled on all text assets (HTML, CSS, JS)                                                            | Required                             |
| NFR-08 | CDN-compatible architecture — deployments must be cacheable at edge nodes                                                         | Required                             |
| NFR-09 | CDN integration supported for SaaS tier (Cloudflare or equivalent)                                                                | Must Have — SaaS                     |
| NFR-10 | Self-hosted deployments can optionally sit behind any reverse proxy or CDN                                                        | Must Have — self-hosted              |
| NFR-11 | No render-blocking resources injected into served HTML (auto-nav widget loads async)                                              | Required                             |
| NFR-12 | Cache invalidation on overwrite: all CDN edge caches purged for the deployment within 30 seconds of a publish or overwrite action | Required                             |
| NFR-13 | Versioned asset paths used for dashboard SPA assets — hash in filename ensures no stale UI after releases                         | Required                             |


## 4.2  Availability & Reliability


| ID     | Requirement                                                                   | Target                                |
| ------ | ----------------------------------------------------------------------------- | ------------------------------------- |
| NFR-14 | Uptime SLA (excluding planned maintenance)                                    | 99.9% monthly                         |
| NFR-15 | Recovery Time Objective (RTO)                                                 | < 1 hour                              |
| NFR-16 | Recovery Point Objective (RPO)                                                | < 24 hours                            |
| NFR-17 | Health check endpoint distinguishes: serving up / publishing down / both down | GET /health → 200 OK with status JSON |
| NFR-18 | Graceful restart — serving continues during app restarts                      | Required                              |


## 4.3  Security


| ID     | Requirement                                            | Detail                                                               |
| ------ | ------------------------------------------------------ | -------------------------------------------------------------------- |
| NFR-11 | All traffic encrypted in transit                       | TLS 1.2 minimum, TLS 1.3 preferred                                   |
| NFR-12 | File type validation on upload                         | MIME + extension check — reject .exe, .sh, .php, and all executables |
| NFR-13 | Path traversal prevention                              | Requests must not escape the deployment root directory               |
| NFR-14 | Content-Security-Policy header on all served responses | Configurable per deployment; secure defaults enforced                |
| NFR-15 | XSS prevention on dashboard UI                         | All user-supplied content HTML-escaped in server responses           |
| NFR-16 | CSRF protection on all state-changing endpoints        | CSRF tokens or SameSite cookie policy                                |
| NFR-17 | Full audit log of publish, delete, and admin actions   | Append-only, exportable by Administrator                             |
| NFR-18 | No credentials in source code or environment files     | Secrets via environment variables or a secrets manager               |
| NFR-19 | Dependency vulnerability scanning in CI                | Zero critical CVEs at any release                                    |


## 4.4  Scalability


| ID     | Requirement                               | Detail                                                                       |
| ------ | ----------------------------------------- | ---------------------------------------------------------------------------- |
| NFR-20 | Horizontal scalability — application tier | Stateless app container; scale by adding replicas                            |
| NFR-21 | Storage backend abstraction               | Local filesystem (single-node) and S3-compatible object storage (multi-node) |
| NFR-22 | Database abstraction                      | SQLite (default, single-node) and PostgreSQL (HA / multi-node)               |
| NFR-23 | Zero-downtime deployments                 | Rolling update support via container orchestrator                            |


## 4.5  Compliance & Data Governance


| ID     | Requirement                   | Detail                                                                |
| ------ | ----------------------------- | --------------------------------------------------------------------- |
| NFR-24 | No external egress required   | All dependencies bundled; no calls to external SaaS or CDNs           |
| NFR-25 | GDPR-compatible analytics     | No PII stored in analytics — IP addresses hashed or omitted           |
| NFR-26 | Right to deletion             | Deleting a deployment removes all files and analytics within 24 hours |
| NFR-27 | Configurable retention policy | Auto-archive or delete deployments after N days (admin-configured)    |
| NFR-28 | Data classification labelling | Admins can tag deployments with a classification level                |


## 4.6  Operability


| ID     | Requirement                     | Detail                                                                       |
| ------ | ------------------------------- | ---------------------------------------------------------------------------- |
| NFR-29 | Container-native deployment     | Published as a Docker image; runs on Compose, Kubernetes, or Nomad           |
| NFR-30 | Environment-based configuration | All runtime options set via environment variables — no config files required |
| NFR-31 | Structured logging              | JSON logs to stdout/stderr; compatible with ELK, Splunk, Datadog, Loki       |
| NFR-32 | Prometheus metrics endpoint     | GET /metrics — request counts, latency percentiles, storage usage            |
| NFR-33 | Versioned database migrations   | Migrations run automatically on startup; version tracked in DB               |
| NFR-34 | Backup and restore CLI          | Command-line tool to export and import all deployments and metadata          |


# 5. Technical Architecture

## 5.1  Technology Stack

The DropSites technology stack has been locked to enable Claude Code to generate consistent, high-quality output from the first milestone. Every decision below is final — not a recommendation.


| Layer                            | Technology                                         | Rationale                                                                                                                                                                           |
| -------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full-stack framework             | Next.js 15 (App Router)                            | Single codebase for frontend and API. One deployment target. Claude Code generates excellent Next.js. Runs on Cloudflare Pages + Workers natively.                                  |
| UI components                    | shadcn/ui (Radix UI + Tailwind CSS)                | Components owned in the codebase, not a black-box library. Accessible by default via Radix primitives. Full design control. Best-in-class Claude Code output.                       |
| Typography                       | Geist (Vercel)                                     | Designed specifically for interfaces. Built into Next.js 15 — zero configuration. One font, two weights (400 and 500). No decorative fonts in the UI.                               |
| Styling                          | Tailwind CSS v4                                    | Utility-first, consistent spacing and colour system. Required by shadcn.                                                                                                            |
| Database                         | Supabase (PostgreSQL)                              | Managed PostgreSQL with row-level security (RLS), realtime subscriptions, and built-in auth. RLS enforces workspace permissions at the database level — not just application level. |
| Authentication                   | Supabase Auth                                      | Magic link, Google OAuth, and GitHub OAuth are native Supabase auth methods — zero custom auth code in Phase 1. OIDC/SAML for self-hosted via Supabase SSO in Phase 2.              |
| File storage — deployments       | Cloudflare R2                                      | Zero egress fees. S3-compatible API. Global CDN via Cloudflare network. Separate from Supabase Storage to preserve egress economics at scale.                                       |
| File storage — thumbnails/assets | Supabase Storage                                   | Screenshots, QR codes, and internal assets. Egress volume is low — Supabase Storage is appropriate here.                                                                            |
| CDN & serving                    | Cloudflare CDN                                     | Serves deployment files from R2 with global edge caching. TLS, DDoS protection, and cache invalidation included.                                                                    |
| Transactional email              | Resend                                             | Simple API, excellent deliverability, generous free tier. Configured via environment variable.                                                                                      |
| SMS                              | Twilio                                             | Industry standard for SMS delivery. Pay-per-message at low volume.                                                                                                                  |
| Background jobs                  | Supabase Edge Functions or Vercel Cron             | Image optimisation at ingest, thumbnail generation, bandwidth rollup, scheduled health checks, expiry processing.                                                                   |
| Monitoring & observability       | Supabase Dashboard + Cloudflare Analytics + Sentry | Database metrics from Supabase, CDN metrics from Cloudflare, application errors from Sentry.                                                                                        |
| Testing                          | Vitest + Playwright + Lighthouse CI + k6           | As defined in Section 11. Vitest for unit/integration, Playwright for E2E, Lighthouse CI for performance, k6 for load.                                                              |


## 5.2  High-Level Architecture

DropSites is a Next.js 15 application using the App Router. API routes live alongside UI pages in the same codebase. Supabase handles the database, auth, and internal asset storage. Cloudflare R2 stores deployment files and serves them via the Cloudflare CDN. A serving middleware layer intercepts requests to deployment URLs and applies runtime features (auto-nav injection, password protection, bandwidth enforcement) before returning content.

A key architectural constraint is that DropSites never modifies uploaded source files. The auto-navigation widget, password protection, robots headers, lazy-loading injection, and CSP headers are all applied at serve time via middleware — the stored files on R2 always remain exactly as uploaded.


| Component               | Technology                                | Responsibility                                                                                                        |
| ----------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Publisher UI            | Next.js App Router + shadcn/ui + Tailwind | Dashboard, upload zone, share sheet, analytics views, admin console, workspace management                             |
| API layer               | Next.js Route Handlers (App Router)       | Upload processing, slug management, auth, workspace APIs, webhooks, metrics                                           |
| Serving middleware      | Next.js Middleware + Cloudflare Worker    | Intercepts deployment URL requests — applies password check, bandwidth check, auto-nav injection, CSP, robots headers |
| Database                | Supabase PostgreSQL                       | All metadata: deployments, users, workspaces, analytics, audit log, notifications, API keys                           |
| Auth                    | Supabase Auth                             | Magic link, Google OAuth, GitHub OAuth. Sessions managed by Supabase. RLS policies enforce workspace permissions.     |
| Deployment file storage | Cloudflare R2                             | All uploaded HTML, JS, CSS, images, and other deployment assets. Zero egress cost.                                    |
| CDN                     | Cloudflare CDN                            | Serves R2 files at global edge. Cache invalidation via Cloudflare API on deployment overwrite.                        |
| Internal asset storage  | Supabase Storage                          | Deployment thumbnails, QR code PNGs, exported analytics PDFs                                                          |
| Background jobs         | Supabase Edge Functions                   | Image optimisation, thumbnail generation, bandwidth daily rollup, expiry processing, health checks                    |
| Email                   | Resend                                    | All transactional email — triggered from API route handlers                                                           |
| SMS                     | Twilio                                    | Time-sensitive and security notifications — triggered from API route handlers                                         |


## 5.2  Data Model

### users


| Field              | Type         | Notes                                                |
| ------------------ | ------------ | ---------------------------------------------------- |
| id                 | UUID         | Primary key                                          |
| email              | VARCHAR(256) | Unique — verified before first publish               |
| email_verified_at  | TIMESTAMP    | Null until verified                                  |
| phone_number       | VARCHAR(32)  | Nullable — verified via OTP before first SMS         |
| phone_verified_at  | TIMESTAMP    | Null until verified                                  |
| limit_profile      | VARCHAR(64)  | Current profile: free | pro | team | enterprise      |
| trial_started_at   | TIMESTAMP    | Nullable — set on first login, null if no trial      |
| trial_ends_at      | TIMESTAMP    | Nullable — 14 days after trial_started_at            |
| notification_prefs | JSONB        | Per-event email/SMS opt-in map                       |
| referral_code      | VARCHAR(32)  | Unique referral code for this user                   |
| referred_by        | UUID → users | Nullable — referrer user ID                          |
| created_at         | TIMESTAMP    | Registration time                                    |
| deleted_at         | TIMESTAMP    | Soft-delete — anonymised on account deletion         |
| frozen_at          | TIMESTAMP    | Nullable — set when account is frozen for compromise |


### workspaces


| Field                  | Type         | Notes                                                 |
| ---------------------- | ------------ | ----------------------------------------------------- |
| id                     | UUID         | Primary key                                           |
| name                   | VARCHAR(128) | Display name                                          |
| namespace_slug         | VARCHAR(64)  | Nullable — unique URL prefix (e.g. acme)              |
| owner_id               | UUID → users | Workspace owner — always has Owner role               |
| limit_profile          | VARCHAR(64)  | Profile applied to the entire workspace               |
| stripe_subscription_id | VARCHAR(256) | Nullable — Phase 2                                    |
| data_region            | ENUM         | us | eu — storage region for Cloudflare R2            |
| white_label_config     | JSONB        | Nullable — enterprise only: logo, brand name, colours |
| created_at             | TIMESTAMP    |                                                       |
| deleted_at             | TIMESTAMP    | Soft-delete                                           |


### workspace_members


| Field        | Type              | Notes                                     |
| ------------ | ----------------- | ----------------------------------------- |
| workspace_id | UUID → workspaces | Foreign key                               |
| user_id      | UUID → users      | Foreign key                               |
| role         | ENUM              | owner | publisher | viewer                |
| invited_by   | UUID → users      | Who sent the invitation                   |
| invited_at   | TIMESTAMP         | When invitation was sent                  |
| accepted_at  | TIMESTAMP         | Nullable — null until invitation accepted |
| invite_token | VARCHAR(128)      | Nullable — expires after 7 days           |


### bandwidth_daily

Bandwidth is tracked as daily aggregates per deployment — not per-request logging. This keeps storage cost linear with deployment count, not request volume.


| Field         | Type               | Notes                          |
| ------------- | ------------------ | ------------------------------ |
| deployment_id | UUID → deployments | Foreign key                    |
| date          | DATE               | Calendar day                   |
| bytes_served  | BIGINT             | Total bytes served on this day |
| request_count | INTEGER            | Total requests on this day     |


Monthly bandwidth totals are computed by summing bandwidth_daily rows for the current calendar month. A background job rolls up and archives rows older than 13 months.

### sessions


| Field          | Type         | Notes                                             |
| -------------- | ------------ | ------------------------------------------------- |
| id             | UUID         | Primary key — also the session token              |
| user_id        | UUID → users | Foreign key                                       |
| created_at     | TIMESTAMP    | Login time                                        |
| last_active_at | TIMESTAMP    | Updated on each authenticated request             |
| expires_at     | TIMESTAMP    | Created_at + 30 days; rolling on activity         |
| user_agent     | VARCHAR(512) | Browser/client identifier                         |
| ip_hash        | VARCHAR(64)  | Hashed IP for location display — no raw IP stored |
| terminated_at  | TIMESTAMP    | Nullable — set on logout or force-terminate       |


### deployments


| Field          | Type              | Notes                                                    |
| -------------- | ----------------- | -------------------------------------------------------- |
| id             | UUID              | Primary key                                              |
| slug           | VARCHAR(128)      | URL-safe identifier — unique per namespace               |
| namespace      | VARCHAR(64)       | Optional org/team prefix — nullable                      |
| workspace_id   | UUID → workspaces | Owning workspace — personal workspace if no team context |
| owner_id       | UUID → users      | Publishing user — for audit, not ownership               |
| entry_path     | VARCHAR(512)      | Relative path to index file within storage root          |
| storage_bytes  | BIGINT            | Total size of all assets                                 |
| password_hash  | VARCHAR(256)      | bcrypt hash of access password — nullable                |
| classification | ENUM              | internal | restricted | public                           |
| expires_at     | TIMESTAMP         | Auto-archive date — nullable                             |
| created_at     | TIMESTAMP         | Creation time                                            |
| updated_at     | TIMESTAMP         | Last content update                                      |
| archived_at    | TIMESTAMP         | Soft-delete time — nullable                              |


### analytics_events


| Field            | Type               | Notes                                         |
| ---------------- | ------------------ | --------------------------------------------- |
| id               | UUID               | Primary key                                   |
| deployment_id    | UUID → deployments | Target deployment                             |
| viewed_at        | TIMESTAMP          | Event time                                    |
| referrer_domain  | VARCHAR(256)       | Origin domain — no path, query string, or PII |
| user_agent_class | VARCHAR(64)        | Coarse UA class (browser, bot, API, unknown)  |


### audit_log


| Field         | Type         | Notes                                                                                                          |
| ------------- | ------------ | -------------------------------------------------------------------------------------------------------------- |
| id            | UUID         | Primary key                                                                                                    |
| actor_id      | UUID → users | User who performed the action                                                                                  |
| action        | ENUM         | publish | overwrite | delete | archive | password_set | password_clear | role_change | key_create | key_revoke |
| deployment_id | UUID         | Target deployment — nullable for org-level actions                                                             |
| occurred_at   | TIMESTAMP    | Event time                                                                                                     |
| metadata      | JSONB        | Action-specific context (e.g. previous slug, new slug, IP)                                                     |


## 5.3  REST API Contract

All endpoints versioned under /api/v1/. Authentication via Bearer token (session or API key). All responses are JSON. Full OpenAPI spec published at /api/docs.


| Method | Endpoint                            | Description                                                   |
| ------ | ----------------------------------- | ------------------------------------------------------------- |
| POST   | /api/v1/deployments                 | Upload a new deployment. Returns deployment object with URL.  |
| PUT    | /api/v1/deployments/:slug           | Overwrite content of an existing deployment.                  |
| GET    | /api/v1/deployments                 | List caller's deployments. Supports pagination and filtering. |
| GET    | /api/v1/deployments/:slug           | Get metadata for a specific deployment.                       |
| PATCH  | /api/v1/deployments/:slug           | Update metadata: slug, password, classification, expiry.      |
| DELETE | /api/v1/deployments/:slug           | Archive (soft-delete) a deployment.                           |
| GET    | /api/v1/deployments/:slug/analytics | Analytics summary for a deployment.                           |
| GET    | /api/v1/admin/deployments           | Admin: list all deployments org-wide.                         |
| GET    | /health                             | Health check — 200 OK with service status JSON.               |
| GET    | /metrics                            | Prometheus metrics (restrict to internal network).            |
| GET    | /api/docs                           | OpenAPI specification (Swagger UI).                           |
| POST   | /api/v1/workspaces                  | Create a workspace.                                           |
| GET    | /api/v1/workspaces                  | List workspaces the caller is a member of.                    |
| POST   | /api/v1/workspaces/:id/members      | Invite a member by email.                                     |
| DELETE | /api/v1/workspaces/:id/members/:uid | Remove a member.                                              |
| PATCH  | /api/v1/workspaces/:id/members/:uid | Update member role.                                           |
| GET    | /api/v1/workspaces/:id/analytics    | Aggregate analytics for all workspace deployments.            |


## 5.5  Authentication Architecture

Auth is handled entirely by Supabase Auth in Phase 1. No custom auth code is written — Supabase provides the magic link flow, Google OAuth, and GitHub OAuth out of the box. Sessions are managed via Supabase JWT tokens stored in httpOnly cookies. The Next.js middleware validates the session token on every request.


| Method                      | Implementation                                                                 | Phase   |
| --------------------------- | ------------------------------------------------------------------------------ | ------- |
| Email magic link            | Supabase Auth — built-in, zero config                                          | Phase 1 |
| Google OAuth                | Supabase Auth — configure Google Cloud OAuth app, enable in Supabase dashboard | Phase 1 |
| GitHub OAuth                | Supabase Auth — configure GitHub OAuth app, enable in Supabase dashboard       | Phase 1 |
| Workspace OIDC (SaaS teams) | Supabase SSO — OIDC provider config per workspace                              | Phase 1 |
| OIDC / SAML (self-hosted)   | Supabase self-hosted with custom OIDC/SAML config                              | Phase 2 |
| API Key (Bearer)            | Custom — API keys stored in Supabase, validated in middleware                  | Phase 2 |
| 2FA — TOTP                  | Supabase Auth MFA — built-in TOTP support                                      | Phase 2 |


Row-level security (RLS) policies in Supabase PostgreSQL enforce workspace permissions at the database level. A publisher can only query deployments where workspace_id matches a workspace they are a member of. This means permission errors are impossible to bypass even if application code has a bug — the database rejects the query.

# 6. User Experience

## 6.1  Design Direction

The DropSites dashboard aesthetic is utilitarian precision. The reference products are Linear, Vercel dashboard, and Raycast — interfaces where function is the aesthetic. Nothing decorates for the sake of decorating. Every pixel earns its place by communicating state, enabling action, or creating clarity.


| Dimension      | Decision                                                                                                                                  | Rationale                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Typography     | Geist — 400 (regular) and 500 (medium) only                                                                                               | Designed for interfaces. Built into Next.js 15. One font, two weights — no decorative display fonts anywhere in the UI. |
| Colour palette | Near-monochrome: white (#ffffff) backgrounds, zinc-900 (#18181b) text, zinc-100 (#f4f4f5) borders, zinc-50 (#fafafa) hover states         | Colour carries meaning only. Status colours (green/amber/red) reserved for health indicators and badges.                |
| Accent colour  | Blue-600 (#2563eb) used sparingly — active nav items, primary buttons, focus rings, links only                                            | One accent, used consistently. Never used for decoration.                                                               |
| Density        | Medium-tight: 8–10 deployment rows visible on 1080p without scrolling. 44px row height. 16px horizontal padding.                          | Publishers managing 50+ deployments need information density. Not so dense it overwhelms.                               |
| Motion         | Fade-in on dialogs (150ms ease-out). Slide-up on mobile bottom sheets (250ms). Nothing else animates unless it communicates state change. | Motion must mean something. Decorative animation is noise.                                                              |
| Icons          | Lucide React — 16px in tables, 20px in toolbars. Stroke width 1.5px. No filled icons.                                                     | Consistent weight across the UI. Lucide is included with shadcn.                                                        |
| Shadows        | Single shadow level: shadow-sm on cards and dialogs only. No layered or dramatic shadows.                                                 | Depth via colour and border, not shadow.                                                                                |
| Border radius  | rounded-md (6px) on inputs and buttons. rounded-lg (8px) on cards and dialogs. No pill shapes except badges.                              | Consistent rounding system throughout.                                                                                  |


## 6.2  shadcn Component Map

The following shadcn/ui components are used for specific UI surfaces. Claude Code must use these components — not custom implementations — to ensure consistency, accessibility, and maintainability.


| UI surface                                       | shadcn component                  | Notes                                                                                                                               |
| ------------------------------------------------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Deployment list                                  | Table                             | Sortable columns. Sticky header. Row hover state via bg-zinc-50.                                                                    |
| Share sheet                                      | Dialog (desktop) / Sheet (mobile) | Dialog on ≥768px. Sheet slides up from bottom on <768px.                                                                            |
| Confirmation dialogs (delete, disable)           | AlertDialog                       | Radix AlertDialog — keyboard navigable, focus trapped.                                                                              |
| Row actions menu (⋯)                             | DropdownMenu                      | Trigger: Button variant="ghost" size="icon". Items: Lock, Update, Duplicate, Rename, Delete.                                        |
| Upload progress                                  | Progress                          | Animated fill. Shows percentage and filename.                                                                                       |
| Status badges (locked, paused, expiring, broken) | Badge                             | variant="outline" with colour via className. Locked: zinc. Paused: amber. Expiring: orange. Broken: red. OK: green.                 |
| Analytics tabs (Overview, Views, Bandwidth)      | Tabs                              | Underline style tabs, not pill/card style.                                                                                          |
| Icon button tooltips                             | Tooltip                           | All icon-only buttons must have a Tooltip with a descriptive label.                                                                 |
| Global search                                    | Command                           | Opens on ⌘K / Ctrl+K. Searches across all workspace deployments. Results grouped by workspace.                                      |
| Success / error feedback                         | Toast (Sonner)                    | Bottom-right. Auto-dismiss 4 seconds. Max 3 visible simultaneously.                                                                 |
| Inline password input (lock toggle)              | Popover + Input                   | Opens inline from the lock icon. Not a full Dialog.                                                                                 |
| Usage quota display                              | Progress + custom                 | Three Progress bars (storage, deployments, bandwidth) in a compact panel.                                                           |
| In-browser editor                                | Custom (CodeMirror 6)             | shadcn does not provide a code editor. Use CodeMirror 6 with the shadcn visual language (border radius, border colour, background). |
| Date/time picker (link expiry)                   | Calendar + Popover                | shadcn Calendar component inside a Popover trigger.                                                                                 |
| Workspace selector                               | Select                            | In the top navigation — switches active workspace context.                                                                          |
| Navigation sidebar                               | Custom                            | Fixed left sidebar on desktop. Sheet on mobile. Uses shadcn Sheet for the mobile drawer.                                            |
| Form inputs                                      | Input, Label, FormField           | shadcn Form built on react-hook-form + zod validation.                                                                              |
| Page skeletons                                   | Skeleton                          | Used during data loading — matches the shape of the content it replaces.                                                            |


## 6.3  Design Principles


| Principle                 | What it means in practice                                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One action to publish     | Drop a file. Get a link. No required configuration for the core task. The upload zone is the hero element on the landing page.                                         |
| Zero learning curve       | A new user must be able to complete a first deployment within 60 seconds — without reading any documentation.                                                          |
| Clarity over features     | Surface copy URL, overwrite, and delete prominently on every row. Hide advanced options behind the ⋯ menu. No feature should be hidden more than two clicks away.      |
| Trust indicators          | Deployment status, access control state (locked / paused / expiring), and view count visible at a glance on every row.                                                 |
| Fail loudly and helpfully | Upload errors explain exactly what went wrong and what to do next. Never a generic "something went wrong". Never a silent failure.                                     |
| Keyboard first            | Every action reachable via keyboard. ⌘K opens global search. ⌘N opens new deployment. All modals trap focus and close on Escape.                                       |
| Mobile parity             | The mobile experience is not a degraded version of desktop. Share sheet is a bottom sheet. Upload zone supports tap-to-browse. Dashboard is fully functional at 375px. |


## 6.4  Key User Flows

### Flow 1 — First-time publish

1. User opens DropSites and authenticates (SSO or magic link).
2. Upload zone dominates the landing page. User drags a file or folder onto the zone.
3. Progress bar shows upload and processing status in real time.
4. On success: modal displays the deployment URL with a one-click copy button and a direct preview link.
5. Deployment appears at the top of the user's list.

### Flow 2 — Named publish

1. Before uploading, user types a custom name into the "Deployment name" field.
2. Field shows a live preview of the resulting URL as the user types.
3. If the slug is taken, field border turns red with inline "Name already in use" message.
4. On a valid name, user uploads the file. Remainder of flow is identical to Flow 1.

### Flow 3 — Overwrite

1. User finds the deployment in their list and clicks "Update content".
2. Upload zone reappears, labelled with the existing deployment name.
3. User drops new content. URL remains unchanged. List shows "Updated [time ago]".

### Flow 4 — Password protect

1. User opens the deployment options menu (⋯) and selects "Protect with password".
2. User sets a password. Deployment badge updates to show a lock icon.
3. Visitors to the URL see a minimal password entry screen before content loads.

## 6.5  Upload Zone States


| State      | Visual behaviour                                                                     |
| ---------- | ------------------------------------------------------------------------------------ |
| Idle       | Dashed border, upload icon, label: "Drop HTML, JS, ZIP, or PDF — or click to browse" |
| Drag-over  | Solid border, background darkens slightly, label: "Release to upload"                |
| Uploading  | Progress bar with percentage and file name                                           |
| Processing | Spinner with label: "Unpacking and deploying…"                                       |
| Success    | Checkmark, deployment URL displayed, copy button highlighted                         |
| Error      | Red border, specific error message (e.g. "No index.html found in ZIP"), retry button |


# 7. Phased Delivery Plan

## 7.1  Phase 1 — Core Platform

Goal: a production-ready Docker container covering the full publish, share, and abuse-prevention workflow. All users on the free limit profile. Built with Claude Code — timeline is milestone-gated by review and integration testing, not calendar weeks.

> *Dependencies: Cloudflare account + R2 bucket · Domain registrar for dropsites.app · Google and GitHub OAuth app credentials · Resend or Postmark account · Twilio account for SMS*


| #     | Milestone                                                                                                                     | Depends on              | Gate                                            |
| ----- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------- |
| M1.1  | Docker image builds and runs locally — docker compose up serves a working app                                                 | —                       | Claude Code review                              |
| M1.2  | Multi-format upload (HTML, JS, ZIP, PDF, WASM) — slug assignment — static serving with correct MIME types                     | M1.1                    | End-to-end upload test                          |
| M1.3  | Limit profile system: assignProfile / getProfile API — free profile enforced on all uploads                                   | M1.2                    | Unit tests pass                                 |
| M1.4  | Auth: email magic link + Google OAuth + GitHub OAuth (SaaS); OIDC (self-hosted)                                               | M1.1                    | Login flow tested on real accounts              |
| M1.5  | Publisher dashboard — list, share sheet, overwrite, delete, lock, disable, duplicate, health check                            | M1.2 M1.4               | Full dashboard walkthrough                      |
| M1.6  | Password protection + brute-force rate limiting                                                                               | M1.5                    | Attack simulation test                          |
| M1.7  | In-browser code editor — edit any file, save & publish instantly                                                              | M1.5                    | Edit → publish → verify live                    |
| M1.8  | Auto-navigation widget with page title inference — injected at serve time                                                     | M1.2                    | Multi-page deployment test                      |
| M1.9  | QR code, embed snippet, link expiry, share sheet modal                                                                        | M1.5                    | Share flow walkthrough                          |
| M1.10 | Email + SMS notification system — all publisher and admin notification types                                                  | M1.4                    | Each notification type triggered and received   |
| M1.11 | Abuse Posture A — email verification, rate limits, abuse report, admin takedown, content hash registry, Safe Browsing monitor | M1.4 M1.10              | Abuse simulation test                           |
| M1.12 | Audit log + analytics — view count, bandwidth, time-series chart                                                              | M1.2                    | Data verified against real traffic              |
| M1.13 | Performance pass — Brotli, cache headers, image optimisation, LCP < 1.5s on 4G                                                | M1.2                    | Lighthouse score ≥ 90                           |
| M1.14 | Security review — OWASP Top 10, ToS, AUP, DMCA process published                                                              | All M1                  | Sign-off                                        |
| M1.15 | Self-hosted runbook published — docker-compose, env var reference, first-run checklist                                        | M1.14                   | Clean install on fresh server                   |
| M1.16 | Trial period system — 14-day Pro trial on signup, countdown UI, revert to free on expiry                                      | M1.4                    | Trial flow end-to-end                           |
| M1.17 | Status page at status.dropsites.app — automated health posting, incident history                                              | M1.1                    | Status page reflects real health check          |
| M1.18 | Bot filtering in analytics — human vs bot view events separated from day one                                                  | M1.12                   | Bot traffic verified as filtered in analytics   |
| M1.19 | Custom 404 per deployment + redirect rules (slug rename → 301)                                                                | M1.2                    | 404.html served correctly, old slug redirects   |
| M1.20 | robots.txt control — noindex by default, publisher toggle, custom robots.txt respected                                        | M1.2                    | Googlebot blocked by default on test deployment |
| M1.21 | Cookie consent banner — dashboard only, GDPR compliant                                                                        | M1.4                    | Legal review sign-off                           |
| M1.22 | Accessibility audit — WCAG 2.1 AA on dashboard, upload zone, share sheet, password prompt, system pages                       | All M1 UI               | Axe audit zero critical issues                  |
| M1.23 | Onboarding flow — 3-step checklist, first deployment celebration, trial countdown, day-7 in-product prompt                    | M1.4 M1.16              | New user activation walkthrough                 |
| M1.24 | SaaS team SSO — workspace OIDC config for Google Workspace on Team profile                                                    | M1.4                    | Full team SSO login tested                      |
| M1.25 | Public launch — dropsites.app live on Cloudflare CDN                                                                          | M1.14 M1.15 M1.17 M1.24 | Smoke test on production                        |


## 7.2  Phase 2 — API, Billing, Enterprise & Abuse Scanning

Goal: headless publishing via REST API, paid tiers via Stripe, enterprise self-hosted licences, Posture B abuse scanning, and cloud deployment packaging. Each milestone is unblocked independently — Claude Code can parallelise across tracks.

> *Dependencies: Stripe account + webhook config · VirusTotal API key · Google Safe Browsing API key · Twilio for per-SMS billing · GCP/AWS/Azure test accounts for Terraform validation*


| #     | Milestone                                                                                                  | Track      | Depends on | Gate                                                           |
| ----- | ---------------------------------------------------------------------------------------------------------- | ---------- | ---------- | -------------------------------------------------------------- |
| M2.1  | REST API v1 — all endpoints, OpenAPI spec at /api/docs                                                     | API        | M1.16      | API contract test suite passes                                 |
| M2.2  | API key management — generation, revocation, dashboard UI                                                  | API        | M2.1       | Key create → use → revoke cycle tested                         |
| M2.3  | API rate limiting — per-minute, daily, monthly quotas, HTTP 429 + Retry-After                              | API        | M2.1       | Rate limit hit tested under load                               |
| M2.4  | Single-file PATCH endpoint — update one file in a multi-file deployment                                    | API        | M2.1       | Patch single page, verify others unchanged                     |
| M2.5  | Custom domain support — CNAME verification, ACME TLS provisioning                                          | Features   | M1.16      | Custom domain live with valid cert                             |
| M2.6  | Per-recipient access tokens — unique URLs, per-token analytics, revocation                                 | Features   | M1.16      | Token view tracked, revocation blocks access                   |
| M2.7  | Webhooks — event firing, HMAC signing, retry logic, delivery log                                           | Features   | M2.1       | Webhook received and verified on test endpoint                 |
| M2.8  | Version history — last 3 versions, preview, restore                                                        | Features   | M1.16      | Restore previous version, verify live                          |
| M2.9  | Namespace support — team-scoped URL prefixes                                                               | Features   | M1.16      | Namespace deployment resolves correctly                        |
| M2.10 | Stripe integration — subscription webhooks → assignProfile()                                               | Billing    | M1.16      | Stripe test mode: subscribe → profile changes                  |
| M2.11 | Upgrade / downgrade / cancel flows + usage-gated UI                                                        | Billing    | M2.10      | Full billing lifecycle walkthrough                             |
| M2.12 | Licence key system — generation, validation, air-gapped mode                                               | Enterprise | M1.16      | Licence validates offline, expiry enforced                     |
| M2.13 | Helm chart + Terraform modules — GCP, AWS, Azure                                                           | Enterprise | M1.16      | Clean deploy on each provider from scratch                     |
| M2.14 | S3-compatible + PostgreSQL backends for HA deployments                                                     | Infra      | M1.16      | Swap backends via config, verify no data loss                  |
| M2.15 | Abuse Posture B — Safe Browsing + VirusTotal at ingest, quarantine queue, weekly re-scan                   | Abuse      | M1.16 M2.1 | Known malicious file quarantined within 60s                    |
| M2.16 | First assisted deployment — customer GCP or AWS account, runbook validated                                 | Enterprise | M2.13      | Customer signs off on deployed instance                        |
| M2.17 | Workspace model: creation, member invite, roles, deployment ownership, handoff on removal                  | Features   | M1.18      | Full workspace lifecycle walkthrough                           |
| M2.18 | Third-party penetration test — all critical/high findings resolved before Phase 2 GA                       | Security   | M2.17      | Pentest report, no open critical/high                          |
| M2.19 | Data residency: EU region option for workspace storage on R2                                               | Infra      | M2.14      | EU workspace deployment verified in EU bucket                  |
| M2.20 | 2FA — TOTP setup, backup codes, workspace-enforced 2FA                                                     | Security   | M1.25      | Full 2FA lifecycle tested                                      |
| M2.21 | Password-based auth + HaveIBeenPwned check                                                                 | Auth       | M1.25      | Password login, forgot password, strength meter tested         |
| M2.22 | Annual billing option + Stripe customer portal + invoice access                                            | Billing    | M2.10      | Annual subscription created and invoice downloaded             |
| M2.23 | Failed payment dunning — grace period, downgrade, recovery                                                 | Billing    | M2.10      | Simulated failed payment goes through full dunning cycle       |
| M2.24 | Geographic + device analytics, comparison mode, shareable analytics link                                   | Analytics  | M1.25      | Country map and device chart visible with real traffic         |
| M2.25 | CORS header control per deployment via dropsites.json and settings toggle                                  | Features   | M1.25      | CORS wildcard verified with cross-origin JS fetch              |
| M2.26 | Workspace transfer, default settings, activity feed, guest access                                          | Features   | M2.17      | Workspace transfer tested end-to-end                           |
| M2.27 | JS + Python SDK, CLI tool (deploy/list/delete/open), GitHub Actions action                                 | Developer  | M2.1       | CLI deploys a React build in under 10 seconds                  |
| M2.28 | Backup strategy — automated daily backup, separate region, monthly restore test, disaster recovery runbook | Infra      | M2.14      | Restore test passes, runbook reviewed                          |
| M2.29 | SLA document published, service credits wired to Stripe, 90-day uptime history on status page              | Legal      | M2.10      | SLA live and linked from pricing page                          |
| M2.30 | Deployment preview thumbnails — headless browser screenshot at publish time                                | Features   | M1.25      | Thumbnails visible in deployment list within 30s of publish    |
| M2.31 | Analytics PDF export + global cross-workspace search                                                       | Features   | M2.24      | PDF generated, global search returns results across workspaces |


## 7.3  Phase 3 — Claude Connector

Goal: DropSites becomes a native output destination inside Claude. The user receives a live URL in the chat interface — no manual upload step. This phase is short because the REST API (Phase 2) does the heavy lifting.

> *Dependencies: Phase 2 REST API live · Claude MCP protocol documentation · Anthropic developer account for MCP server registration*


| #    | Milestone                                                                   | Depends on | Gate                                          |
| ---- | --------------------------------------------------------------------------- | ---------- | --------------------------------------------- |
| M3.1 | MCP server wrapping POST /api/v1/deployments — returns URL as tool output   | M2.2       | Claude Code calls tool, URL returned in chat  |
| M3.2 | End-to-end test — Claude generates multi-file site, MCP publishes, URL live | M3.1       | Real Claude output deployed and accessible    |
| M3.3 | Connector config guide published for claude.ai web interface                | M3.1       | Non-technical user follows guide successfully |
| M3.4 | Closed beta — 20 users, structured feedback, bug fixes                      | M3.2 M3.3  | No P0/P1 bugs open                            |
| M3.5 | GA release — connector available to all DropSites users                     | M3.4       | Announcement + docs live                      |


# 8. Constraints & Assumptions

## 8.1  Constraints


| Constraint                      | Detail                                                                                                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static content only             | DropSites serves static files exclusively. It does not execute server-side code, support databases, or run application runtimes. All deployed content must be self-contained HTML, CSS, JavaScript, images, and fonts. |
| No vendor lock-in               | All infrastructure dependencies (object storage, database, identity) must be swappable. No cloud-provider SDK may be called directly from application code.                                                            |
| S3-compatible storage API only  | All storage operations use the S3-compatible API. GCS, Azure Blob, MinIO, and Cloudflare R2 all implement this interface. Switching providers requires only configuration.                                             |
| Air-gapped licence validation   | Enterprise licence keys must be verifiable without network access to dropsites.app. Customers in restricted environments cannot be dependent on an external call-home.                                                 |
| Single Docker image for Phase 1 | The application must ship as one container. Multi-container architectures are optional from Phase 2 onwards.                                                                                                           |
| No injected tracking            | The serving layer must never inject third-party scripts, analytics beacons, or tracking pixels into served HTML.                                                                                                       |
| Content responsibility          | DropSites is a distribution layer. It does not inspect, moderate, or transform content. Publishers are responsible for the content they deploy.                                                                        |


## 8.2  Assumptions


| Assumption                                                                                          | Risk if incorrect                                                                |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Claude-generated HTML always includes an index.html at the ZIP root.                                | Upload validation rejects Claude outputs; generator integration needs adjusting. |
| Target users have access to a modern browser (Chrome, Edge, Firefox, Safari — latest two versions). | Upload zone drag-and-drop may not work; fallback file picker required.           |
| Self-hosted users have access to a container runtime (Docker or equivalent).                        | Additional deployment paths (bare metal, serverless) required.                   |
| An OIDC-compatible identity provider is available on the target internal network.                   | Auth integration requires rework; Phase 1 scope expands.                         |
| SaaS tier users are comfortable with email + magic link authentication.                             | Additional auth providers required sooner than Phase 2.                          |


# 9. Out of Scope

The following capabilities are explicitly excluded from all phases covered by this document.


| Capability                             | Rationale                                                        |
| -------------------------------------- | ---------------------------------------------------------------- |
| Server-side rendering / code execution | Security and operational complexity — DropSites is a static host |
| Database-backed dynamic applications   | Requires an application runtime — out of scope                   |
| Collaborative editing                  | Use source-controlled authoring tools upstream                   |
| Built-in CDN or geo-distribution       | Infrastructure concern, not a product feature                    |
| Mobile native application              | Web UI is responsive and sufficient for all target use cases     |
| Digital rights management              | Out of scope — publishers are responsible for content licensing  |


# 10. Open Questions


| #     | Question                                                                                                                                                               | Owner                 | Status   |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | -------- |
| OQ-00 | Technology stack — RESOLVED. Next.js 15 + shadcn/ui + Tailwind + Supabase (DB + Auth) + Cloudflare R2 (deployment files) + Resend + Twilio.                            | Engineering           | Resolved |
| OQ-01 | Validate indicative free limit profile values (5 deployments, 25 MB, 100 MB storage, 5 GB bandwidth) against Cloudflare R2 infrastructure costs before Phase 2 launch. | Founder / Eng         | Open     |
| OQ-02 | Should free tier deployments expire after N days of inactivity, or be permanent within the storage cap? Recommend: permanent.                                          | Product               | Open     |
| OQ-03 | Confirm paid tier price points for Pro and Team before Phase 2 launch. Indicative: $9 / $29 per month.                                                                 | Founder               | Open     |
| OQ-04 | TLS / ACME provider for custom domain certificate provisioning — Let's Encrypt or ZeroSSL?                                                                             | Engineering           | Open     |
| OQ-05 | Target IdP for self-hosted OIDC testing — Keycloak, Okta, or Azure AD?                                                                                                 | Engineering           | Open     |
| OQ-06 | Should the Phase 3 MCP connector target Claude Code only, or also the claude.ai web interface?                                                                         | Product               | Open     |
| OQ-07 | Version history storage strategy: full file snapshots vs diffs? Snapshots are simpler; diffs reduce storage costs at scale.                                            | Engineering           | Open     |
| OQ-08 | Maximum number of named access tokens per deployment on the Team profile?                                                                                              | Product               | Open     |
| OQ-09 | Should abuse detection flags (FR-180, FR-181) trigger automatic rate-limiting or admin notification only?                                                              | Product               | Open     |
| OQ-10 | Enterprise licence model: perpetual + annual support contract, or annual subscription? Affects contract structure and renewal mechanics.                               | Founder               | Open     |
| OQ-11 | Confirm Cloudflare R2 as primary storage backend for dropsites.app SaaS — validate egress cost model against projected traffic.                                        | Engineering / Founder | Open     |
| OQ-12 | Setup fee for assisted deployment into customer cloud account? Recommend: $5,000–$15,000 one-time depending on provider and complexity.                                | Founder               | Open     |
| OQ-13 | Monthly price for private cloud instance? Recommend: 3–5x the Team tier SaaS monthly rate as a floor.                                                                  | Founder               | Open     |
| OQ-14 | Terraform module scope at Phase 2 launch: all three major clouds simultaneously, or GCP first given the Google Workspace / Claude alignment?                           | Engineering           | Open     |


# 11. Testing Strategy

Testing in DropSites is not a phase that happens after building — it is built alongside the product, milestone by milestone. Every acceptance gate in the delivery plan maps to a named, automated test. This section defines the testing philosophy, tooling, coverage targets, CI/CD pipeline, and the full test surface across all 15 system areas.

## 11.1  Philosophy


| Principle                                        | What it means in practice                                                                                                                                                                                      |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test the failure modes, not just the happy paths | Every boundary condition, every rejected input, every concurrent operation edge case gets a test. Happy paths alone are insufficient.                                                                          |
| Silent failures are the worst failures           | Analytics recording bot traffic as human views, bandwidth counters incrementing incorrectly, a deployment serving the wrong file — these are all invisible without explicit tests. Each gets a dedicated test. |
| Security tests are not optional                  | Path traversal, CSRF, XSS, IDOR, password bypass — these are tested as rigorously as functionality. They run on every PR, not just before launch.                                                              |
| Gates are binary                                 | A milestone is not complete until every test in its gate suite passes. No exceptions, no partial credit.                                                                                                       |
| Tests are documentation                          | Every test name describes a behaviour in plain English. Reading the test suite should explain what the system does.                                                                                            |


## 11.2  Testing Stack


| Layer         | Tool                   | Scope                                     | Why                                                                         |
| ------------- | ---------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| Unit          | Vitest                 | Individual functions and modules          | Fast, Jest-compatible, native ESM, excellent Claude Code output quality     |
| Integration   | Vitest + Supertest     | API endpoints with real test database     | Tests the full request/response cycle including auth, middleware, and DB    |
| End-to-end    | Playwright             | Full user flows in a real browser         | Industry standard, multi-browser, excellent for milestone gate verification |
| Accessibility | axe-core + Playwright  | WCAG 2.1 AA compliance on all UI surfaces | Automated scan catches the majority of accessibility violations             |
| Performance   | Lighthouse CI          | Core Web Vitals, performance score        | Runs on every release candidate, gates on score ≥ 90                        |
| Security      | OWASP ZAP + npm audit  | OWASP Top 10, dependency CVEs             | Automated scan before every release; zero critical CVEs policy              |
| Load          | k6                     | 500 concurrent users, serving layer       | Run before Phase 2 GA to validate NFR-05 (≥ 500 concurrent)                 |
| Coverage      | v8 (built into Vitest) | Line, branch, function coverage           | Reports generated on every CI run; gates enforced per area                  |


## 11.3  Coverage Targets


| Area                                                                            | Target | Rationale                                                                 |
| ------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| Core business logic (limit enforcement, slug generation, auth, file validation) | 95%    | No silent failures in the critical path                                   |
| API endpoints — happy paths                                                     | 100%   | Every documented route must have a passing test                           |
| API endpoints — error paths (auth failure, rate limit, invalid input)           | 100%   | Error behaviour is as important as success behaviour                      |
| File serving layer (MIME types, path traversal, cache headers)                  | 90%    | Security-critical — high bar                                              |
| Notification system (each event type triggers correct channel)                  | 100%   | Notification failures are invisible without explicit tests                |
| Limit enforcement boundaries                                                    | 100%   | Exact quota boundaries — at limit and one byte over — must both be tested |
| Workspace permissions (every role × every action matrix)                        | 100%   | Permission failures are silent and dangerous                              |
| Dashboard UI components                                                         | 70%    | Logic tested in unit/integration; rendering covered by E2E                |
| E2E milestone gates                                                             | 100%   | Every M1 and M2 acceptance gate is a named Playwright test that must pass |


## 11.4  CI/CD Pipeline


| Trigger                    | Tests run                                                                              | Must pass to proceed            |
| -------------------------- | -------------------------------------------------------------------------------------- | ------------------------------- |
| Every commit to any branch | Unit tests · Lint · Type check                                                         | Yes — blocks the commit from CI |
| Every pull request         | Unit · Integration · E2E · Accessibility scan · npm audit                              | Yes — blocks merge to main      |
| Merge to main              | Full suite including performance benchmarks (Lighthouse CI)                            | Yes — blocks deployment         |
| Release candidate tag      | Full suite + OWASP ZAP security scan + load test (k6)                                  | Yes — blocks release            |
| Phase 2 GA gate            | All of the above + third-party penetration test sign-off + backup restore verification | Yes — blocks Phase 2 launch     |



| Performance target     | Limit        |
| ---------------------- | ------------ |
| Unit test suite        | < 60 seconds |
| Integration test suite | < 90 seconds |
| E2E suite (full)       | < 3 minutes  |
| Accessibility scan     | < 60 seconds |
| Total CI time per PR   | < 6 minutes  |


## 11.5  Test Surface — Upload & Ingestion

> *Every test in this section maps to FR-01 through FR-08 and FR-147 through FR-154.*


| Test ID  | Scenario                                                                     | Expected result                                                 | Layer       |
| -------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------- |
| T-UPL-01 | Single valid HTML file upload                                                | Deployment created, URL returned, file served                   | Integration |
| T-UPL-02 | ZIP with index.html at root                                                  | Deployment created, index.html served at root URL               | Integration |
| T-UPL-03 | ZIP with index.html nested in subfolder                                      | index.html found and served as entry point                      | Integration |
| T-UPL-04 | ZIP with no index.html, single .html file                                    | That file served as entry point                                 | Integration |
| T-UPL-05 | ZIP with no .html file — directory listing enabled                           | Directory listing served                                        | Integration |
| T-UPL-06 | ZIP containing another ZIP                                                   | Rejected with clear error — no nested ZIPs                      | Unit        |
| T-UPL-07 | ZIP with path traversal filename (../../etc/passwd)                          | Rejected — no crash, no file written                            | Unit        |
| T-UPL-08 | ZIP with 10,000 files                                                        | Processed without memory explosion — completes or fails cleanly | Integration |
| T-UPL-09 | File exactly at per-deployment size limit                                    | Accepted                                                        | Integration |
| T-UPL-10 | File one byte over per-deployment size limit                                 | Rejected with specific size error                               | Integration |
| T-UPL-11 | File with correct extension but wrong MIME (script.js that is an executable) | Rejected — MIME + magic byte check fails                        | Unit        |
| T-UPL-12 | Interrupted upload mid-stream                                                | No partial deployment created, storage clean                    | Integration |
| T-UPL-13 | Two concurrent uploads from same user                                        | Both succeed or both fail cleanly — no corruption               | Integration |
| T-UPL-14 | Upload when total storage is exactly at quota cap                            | Rejected with storage quota error                               | Integration |
| T-UPL-15 | Upload when total storage is one byte under cap                              | Accepted                                                        | Integration |
| T-UPL-16 | Malformed ZIP (corrupt archive)                                              | Clean error returned, no crash                                  | Unit        |
| T-UPL-17 | Every supported file type (.html .js .css .json .png .woff2 .pdf .wasm .mp4) | Correct MIME type served for each                               | Integration |
| T-UPL-18 | Image over 200 KB at ingest                                                  | Compressed and stored at reduced size                           | Unit        |
| T-UPL-19 | Image under 200 KB at ingest                                                 | Stored unchanged                                                | Unit        |
| T-UPL-20 | Re-upload of a previously removed file (content hash match)                  | Rejected by content hash registry                               | Integration |


## 11.6  Test Surface — URL Routing & Slug Management

> *Maps to FR-09 through FR-14 and FR-338 through FR-340.*


| Test ID  | Scenario                                                          | Expected result                                                         | Layer       |
| -------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------- |
| T-SLG-01 | Auto-generated slug                                               | URL-safe characters only, no collisions across 10,000 rapid generations | Unit        |
| T-SLG-02 | Custom slug — valid                                               | Accepted, deployment served at that slug                                | Integration |
| T-SLG-03 | Custom slug — contains spaces                                     | Rejected with inline validation error                                   | Unit        |
| T-SLG-04 | Custom slug — reserved word (api, health, admin, metrics, static) | Rejected                                                                | Unit        |
| T-SLG-05 | Two users claim the same slug simultaneously (race condition)     | Exactly one succeeds, other receives 409 conflict                       | Integration |
| T-SLG-06 | Slug rename — old slug accessed after rename                      | 301 redirect to new slug, immediate                                     | Integration |
| T-SLG-07 | Slug at maximum allowed length                                    | Accepted                                                                | Unit        |
| T-SLG-08 | Slug one character over maximum length                            | Rejected                                                                | Unit        |
| T-SLG-09 | Namespace + slug combination resolves correctly                   | Correct deployment served, no collision with non-namespaced slug        | Integration |
| T-SLG-10 | Custom domain serves correct deployment                           | Right deployment, not another user's                                    | E2E         |
| T-SLG-11 | Missing deployment URL                                            | Platform 404 page, HTTP 404 status — not a 500                          | Integration |
| T-SLG-12 | Custom 404.html in deployment — missing asset within deployment   | Custom 404.html served with HTTP 404 status                             | Integration |


## 11.7  Test Surface — Content Serving

> *Maps to FR-15 through FR-20, FR-335 through FR-344, and NFR-12 through NFR-13.*


| Test ID  | Scenario                                                 | Expected result                                                  | Layer       |
| -------- | -------------------------------------------------------- | ---------------------------------------------------------------- | ----------- |
| T-SRV-01 | Large file streaming (100 MB video)                      | Streamed — not buffered into memory before serving               | Integration |
| T-SRV-02 | Cache headers on index.html                              | Cache-Control: no-cache (content changes)                        | Integration |
| T-SRV-03 | Cache headers on versioned assets (bundle.abc123.js)     | Cache-Control: max-age=31536000, immutable                       | Integration |
| T-SRV-04 | CDN cache after overwrite                                | Old content not served from edge — invalidated within 30 seconds | E2E         |
| T-SRV-05 | Brotli compression on HTML/CSS/JS                        | Content-Encoding: br returned when Accept-Encoding: br sent      | Integration |
| T-SRV-06 | Brotli not applied to binary files (images, video)       | No Content-Encoding header on binary responses                   | Integration |
| T-SRV-07 | Relative asset paths within a ZIP                        | All relative paths resolve correctly from deployment root        | Integration |
| T-SRV-08 | Path traversal in serving request (/../../../etc/passwd) | Returns 404 — does not serve file outside deployment root        | Unit        |
| T-SRV-09 | Password-protected deployment — no password provided     | Password prompt served, content not accessible                   | E2E         |
| T-SRV-10 | Password-protected deployment — correct password         | Content served after correct password entry                      | E2E         |
| T-SRV-11 | Disabled deployment — all asset requests                 | "Temporarily unavailable" page returned for all paths            | Integration |
| T-SRV-12 | Expired deployment — accessed after expiry time          | "Link has expired" page, immediate                               | Integration |
| T-SRV-13 | Bandwidth cap reached — deployment request               | "Bandwidth limit reached" page served                            | Integration |
| T-SRV-14 | robots.txt — no custom file, no toggle                   | X-Robots-Tag: noindex, nofollow on all responses                 | Integration |
| T-SRV-15 | robots.txt — publisher enables indexing toggle           | X-Robots-Tag: all                                                | Integration |
| T-SRV-16 | robots.txt — custom robots.txt in deployment             | Custom file served at /robots.txt, X-Robots-Tag header removed   | Integration |
| T-SRV-17 | Auto-nav widget injection — multi-page no navigation     | Widget injected, loads async, does not block render              | E2E         |
| T-SRV-18 | Auto-nav widget — deployment has own navigation          | Widget not injected                                              | Integration |
| T-SRV-19 | Auto-nav widget — page titles from , , filename fallback | Correct label shown for each page                                | Integration |
| T-SRV-20 | WASM file served                                         | Content-Type: application/wasm + COEP headers                    | Integration |
| T-SRV-21 | loading=lazy injected on img tags at serve time          | Present in response, not in stored source file                   | Integration |


## 11.8  Test Surface — Authentication & Session

> *Maps to FR-200 through FR-205, FR-263 through FR-268, FR-361 through FR-366.*


| Test ID   | Scenario                                                             | Expected result                                      | Layer       |
| --------- | -------------------------------------------------------------------- | ---------------------------------------------------- | ----------- |
| T-AUTH-01 | Magic link — valid, first use                                        | Login succeeds, session created                      | Integration |
| T-AUTH-02 | Magic link — second use of same link                                 | Rejected — link already consumed                     | Integration |
| T-AUTH-03 | Magic link — used after 15 minutes                                   | Rejected — link expired                              | Integration |
| T-AUTH-04 | Google OAuth — happy path                                            | Login succeeds, user auto-provisioned on first login | E2E         |
| T-AUTH-05 | GitHub OAuth — happy path                                            | Login succeeds                                       | E2E         |
| T-AUTH-06 | OIDC (self-hosted) — happy path                                      | Login succeeds with configured IdP                   | E2E         |
| T-AUTH-07 | OIDC — misconfigured IdP                                             | Clean error page, no crash, no stack trace exposed   | Integration |
| T-AUTH-08 | Session expiry — 30 days inactive                                    | Next request redirects to login                      | Integration |
| T-AUTH-09 | Two active sessions — logout from one                                | Other session unaffected                             | Integration |
| T-AUTH-10 | Admin force-terminates all user sessions                             | All sessions invalidated, user must re-authenticate  | Integration |
| T-AUTH-11 | Re-auth gate — account deletion attempt in active session            | Re-authentication required before proceeding         | E2E         |
| T-AUTH-12 | Re-auth gate — password change in active session                     | Re-authentication required                           | E2E         |
| T-AUTH-13 | Account creation rate limit — 5th account from same IP               | Accepted                                             | Integration |
| T-AUTH-14 | Account creation rate limit — 6th account from same IP within 1 hour | Blocked with 429                                     | Integration |
| T-AUTH-15 | Unverified user attempts to publish                                  | Blocked — email verification required                | Integration |
| T-AUTH-16 | Verified user publishes                                              | Succeeds                                             | Integration |
| T-AUTH-17 | 2FA — TOTP code required after primary auth                          | Dashboard not accessible until code entered          | E2E         |
| T-AUTH-18 | 2FA — backup code works, then is invalidated                         | First use succeeds, second use rejected              | Integration |
| T-AUTH-19 | In-browser editor — session expires while editing                    | Re-auth prompt before publish is allowed             | E2E         |


## 11.9  Test Surface — Access Control & Permissions

> *Maps to FR-21 through FR-28, FR-230 through FR-240. Permission failures are silent and dangerous — 100% coverage required.*


| Test ID   | Scenario                                                                     | Expected result                                                   | Layer       |
| --------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------- |
| T-PERM-01 | Publisher publishes to own workspace                                         | Succeeds                                                          | Integration |
| T-PERM-02 | Publisher publishes to workspace they are not a member of                    | Blocked — 403                                                     | Integration |
| T-PERM-03 | Publisher deletes own deployment                                             | Succeeds                                                          | Integration |
| T-PERM-04 | Publisher deletes another member's deployment in same workspace              | Blocked — 403                                                     | Integration |
| T-PERM-05 | Publisher deletes deployment in workspace they are not in                    | Blocked — 403                                                     | Integration |
| T-PERM-06 | Viewer attempts to publish                                                   | Blocked — 403                                                     | Integration |
| T-PERM-07 | Viewer attempts to delete                                                    | Blocked — 403                                                     | Integration |
| T-PERM-08 | Viewer accesses admin console                                                | Blocked — redirect or 403                                         | E2E         |
| T-PERM-09 | Owner deletes any workspace deployment                                       | Succeeds                                                          | Integration |
| T-PERM-10 | Owner changes any member role                                                | Succeeds — new role takes effect on next request without re-login | Integration |
| T-PERM-11 | Removed member's deployments                                                 | Still live, owned by workspace owner                              | Integration |
| T-PERM-12 | Removed member's API keys                                                    | Revoked immediately — 401 on next API call                        | Integration |
| T-PERM-13 | Platform admin disables any deployment                                       | Takes effect within 5 seconds                                     | Integration |
| T-PERM-14 | Platform admin cannot read deployment file contents                          | No endpoint exists that returns raw file content to admin         | Unit        |
| T-PERM-15 | Unauthenticated user views public deployment                                 | Succeeds                                                          | Integration |
| T-PERM-16 | Unauthenticated user views password-protected deployment without password    | Password prompt shown, content blocked                            | E2E         |
| T-PERM-17 | Password brute-force — 5 failures in 10 minutes                              | Lockout triggered, 6th attempt returns 429                        | Integration |
| T-PERM-18 | Password brute-force — attempt during lockout period                         | 429 returned, lockout timer not reset                             | Integration |
| T-PERM-19 | Per-recipient access token — valid                                           | Content accessible, view event recorded with token ID             | Integration |
| T-PERM-20 | Per-recipient access token — revoked                                         | Content blocked — 403                                             | Integration |
| T-PERM-21 | Per-recipient access token — expired (N views reached)                       | Content blocked                                                   | Integration |
| T-PERM-22 | IDOR — user A accesses user B's deployment metadata via API by guessing UUID | Blocked — 403, not 404                                            | Integration |
| T-PERM-23 | IP allowlist — request from allowed IP                                       | Content served                                                    | Integration |
| T-PERM-24 | IP allowlist — request from blocked IP                                       | 403 returned                                                      | Integration |


## 11.10  Test Surface — Limit Enforcement

> *Maps to FR-139 through FR-192. Boundary conditions at exact limits must be tested — not just clearly-over and clearly-under.*


| Test ID  | Scenario                                                            | Expected result                                                       | Layer       |
| -------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------- |
| T-LIM-01 | Upload at exactly the per-deployment size limit                     | Accepted                                                              | Integration |
| T-LIM-02 | Upload one byte over per-deployment size limit                      | Rejected with specific size error message                             | Integration |
| T-LIM-03 | Upload when total storage is exactly at cap                         | Rejected                                                              | Integration |
| T-LIM-04 | Upload when total storage is one byte under cap                     | Accepted                                                              | Integration |
| T-LIM-05 | Deployment count at limit — new deployment                          | Rejected — "deployment limit reached" error                           | Integration |
| T-LIM-06 | Deployment count at limit — existing deployments                    | Unaffected — still served                                             | Integration |
| T-LIM-07 | Bandwidth at 80% of monthly cap                                     | Warning notification sent once                                        | Integration |
| T-LIM-08 | Bandwidth warning — subsequent requests after 80%                   | No duplicate notification sent                                        | Integration |
| T-LIM-09 | Bandwidth at exactly 100%                                           | Enforcement page served immediately, notification sent                | Integration |
| T-LIM-10 | Bandwidth counter reset on 1st of month (time-mocked)               | Counter returns to 0, serving resumes                                 | Unit        |
| T-LIM-11 | Profile upgrade — new limits apply immediately                      | Next upload succeeds without restart                                  | Integration |
| T-LIM-12 | Profile downgrade — existing deployments over new limit             | Not deleted — serving continues, new uploads blocked                  | Integration |
| T-LIM-13 | Two concurrent uploads both hitting storage quota simultaneously    | Exactly one accepted, other rejected — no double-write, no corruption | Integration |
| T-LIM-14 | getProfile always called — no hardcoded limits anywhere in codebase | Code audit — grep for any hardcoded numeric limits                    | Unit        |
| T-LIM-15 | Pre-flight quota display in upload zone                             | Shows correct remaining storage before upload starts                  | E2E         |
| T-LIM-16 | Upload zone disabled when storage full                              | Zone visually disabled with explanation, upload attempt blocked       | E2E         |


## 11.11  Test Surface — Analytics

> *Maps to FR-37 through FR-42, FR-331 through FR-334, FR-383 through FR-388.*


| Test ID  | Scenario                                             | Expected result                                               | Layer       |
| -------- | ---------------------------------------------------- | ------------------------------------------------------------- | ----------- |
| T-ANL-01 | Human browser request to deployment                  | View event recorded                                           | Integration |
| T-ANL-02 | Googlebot request (User-Agent: Googlebot)            | No view event recorded — filtered as bot                      | Integration |
| T-ANL-03 | Health check request (User-Agent: kube-probe)        | No view event recorded                                        | Integration |
| T-ANL-04 | Bandwidth bytes — request for 500 KB file            | bandwidth_daily incremented by exactly 500,000 bytes          | Integration |
| T-ANL-05 | Unique visitor — same IP + UA within 30 minutes      | Counted as one unique visitor                                 | Unit        |
| T-ANL-06 | Unique visitor — same IP, different UA               | Counted as two unique visitors                                | Unit        |
| T-ANL-07 | Referrer — only domain stored, not full URL          | referrer_domain contains only domain, no path or query        | Unit        |
| T-ANL-08 | Analytics after deployment disabled                  | No events recorded for requests to disabled deployment        | Integration |
| T-ANL-09 | Analytics after deployment deleted — events retained | Events still queryable for 90 days after deletion             | Integration |
| T-ANL-10 | Time-series chart — daily grouping                   | Correct count per day for last 30 days                        | Integration |
| T-ANL-11 | Analytics CSV export — all fields present, no PII    | IP addresses absent, all other fields correct                 | Integration |
| T-ANL-12 | Geographic analytics — country derived from IP       | Country code stored, raw IP not stored                        | Unit        |
| T-ANL-13 | Device class recorded (mobile/tablet/desktop)        | Correct class for known user-agent strings                    | Unit        |
| T-ANL-14 | Shareable analytics link — no login required         | Analytics page accessible without auth                        | E2E         |
| T-ANL-15 | Bot filter list updatable without deploy             | New bot UA added to DB, next request filtered without restart | Integration |


## 11.12  Test Surface — Notifications

> *Maps to FR-211 through FR-223. Every notification type must have an explicit trigger test.*


| Test ID  | Scenario                                                                     | Expected result                                   | Layer       |
| -------- | ---------------------------------------------------------------------------- | ------------------------------------------------- | ----------- |
| T-NOT-01 | Deployment published successfully                                            | Email sent to publisher with URL                  | Integration |
| T-NOT-02 | Deployment viewed for the first time                                         | Email sent (SMS only if opted in)                 | Integration |
| T-NOT-03 | Named recipient (access token) views deployment                              | Email + SMS sent to publisher with recipient name | Integration |
| T-NOT-04 | View milestone — 10th view                                                   | Email sent                                        | Integration |
| T-NOT-05 | View milestone — 11th view                                                   | No email sent (only at milestone)                 | Integration |
| T-NOT-06 | Deployment expiring in 24 hours                                              | Email sent (if expiry set)                        | Integration |
| T-NOT-07 | Deployment with no expiry — 24 hours before nothing                          | No notification sent                              | Integration |
| T-NOT-08 | Password brute-force — 5th failed attempt                                    | Email + SMS sent to publisher                     | Integration |
| T-NOT-09 | Deployment taken down by admin                                               | Email + SMS sent to publisher immediately         | Integration |
| T-NOT-10 | Storage at 80%                                                               | Email sent once                                   | Integration |
| T-NOT-11 | Storage at 81% (one more upload after 80%)                                   | No duplicate email                                | Integration |
| T-NOT-12 | Storage at 100%                                                              | Email + SMS sent                                  | Integration |
| T-NOT-13 | Bandwidth at 80%                                                             | Email sent once                                   | Integration |
| T-NOT-14 | Bandwidth at 100%                                                            | Email + SMS sent                                  | Integration |
| T-NOT-15 | New abuse report — admin notification                                        | Email + SMS sent to admin address                 | Integration |
| T-NOT-16 | User opts out of a notification type                                         | That notification not sent after opt-out          | Integration |
| T-NOT-17 | SMS sent before phone number verified                                        | SMS not sent                                      | Unit        |
| T-NOT-18 | SMS rate limit — 10th SMS in 1 hour                                          | Sent                                              | Integration |
| T-NOT-19 | SMS rate limit — 11th SMS in 1 hour                                          | Not sent, queued or dropped                       | Integration |
| T-NOT-20 | Notification delivery failure                                                | Retried 3 times, logged in delivery log           | Integration |
| T-NOT-21 | Self-hosted — notification routes through configured SMTP, not dropsites.app | Email headers show configured SMTP server         | Integration |


## 11.13  Test Surface — API (Phase 2)

> *Maps to FR-43 through FR-50, FR-321 through FR-327, FR-129 through FR-132. Every endpoint requires happy path + auth failure + permission failure + input validation test.*


| Test ID  | Scenario                                                            | Expected result                                 | Layer       |
| -------- | ------------------------------------------------------------------- | ----------------------------------------------- | ----------- |
| T-API-01 | POST /deployments — valid ZIP, valid auth                           | 201 with deployment URL                         | Integration |
| T-API-02 | POST /deployments — no auth                                         | 401                                             | Integration |
| T-API-03 | POST /deployments — revoked API key                                 | 401                                             | Integration |
| T-API-04 | POST /deployments — invalid ZIP                                     | 422 with specific error                         | Integration |
| T-API-05 | POST /deployments — slug conflict                                   | 409 Conflict                                    | Integration |
| T-API-06 | GET /deployments — returns only caller's deployments                | Other users' deployments absent from response   | Integration |
| T-API-07 | GET /deployments — search by slug query param                       | Filtered results returned                       | Integration |
| T-API-08 | PATCH /deployments/:slug/files/:path — updates one file             | Correct file updated, others unchanged          | Integration |
| T-API-09 | PATCH /deployments/:slug/files/:path — path outside deployment root | 400 Bad Request                                 | Integration |
| T-API-10 | DELETE /deployments/:slug — soft delete                             | Deployment returns 410 Gone, metadata retained  | Integration |
| T-API-11 | Rate limit — 60th request in 1 minute                               | 200 OK                                          | Integration |
| T-API-12 | Rate limit — 61st request in 1 minute                               | 429 with Retry-After header                     | Integration |
| T-API-13 | Monthly quota — at limit                                            | 429 with quota error                            | Integration |
| T-API-14 | Webhook fires on deployment created                                 | POST received at endpoint, payload correct      | Integration |
| T-API-15 | Webhook payload — HMAC-SHA256 signature valid                       | Signature verifiable with shared secret         | Unit        |
| T-API-16 | Webhook delivery failure — retry logic                              | 3 retries with backoff, delivery log updated    | Integration |
| T-API-17 | OpenAPI spec — every documented endpoint matches actual behaviour   | Contract test — spec vs implementation diff = 0 | Integration |
| T-API-18 | Workspace endpoints — create, invite, role change, remove member    | Full lifecycle passes                           | Integration |
| T-API-19 | SDK — JS client publishes a deployment end-to-end                   | URL returned, deployment accessible             | Integration |
| T-API-20 | CLI — dropsites deploy ./dist publishes and returns URL             | URL printed to stdout, deployment live          | E2E         |
| T-API-21 | GitHub Actions action — workflow deploys on push                    | Deployment live after action completes          | E2E         |


## 11.14  Test Surface — Security

> *Security tests run on every PR and before every release. Zero tolerance for critical or high findings.*


| Test ID  | Scenario                                                          | Expected result                                           | Layer              |
| -------- | ----------------------------------------------------------------- | --------------------------------------------------------- | ------------------ |
| T-SEC-01 | SQL injection — all query parameters                              | No injection possible — parameterised queries throughout  | Unit + Integration |
| T-SEC-02 | XSS — deployment name displayed in dashboard                      | HTML-escaped, script not executed                         | E2E                |
| T-SEC-03 | XSS — slug displayed in URL preview                               | HTML-escaped                                              | Unit               |
| T-SEC-04 | CSRF — state-changing endpoint without CSRF token                 | Rejected — 403                                            | Integration        |
| T-SEC-05 | Path traversal — file serving                                     | Cannot access files outside deployment root               | Unit               |
| T-SEC-06 | Path traversal — ZIP extraction                                   | Cannot write files outside deployment storage             | Unit               |
| T-SEC-07 | Password prompt bypass — direct asset URL on protected deployment | 403 returned — not the asset                              | Integration        |
| T-SEC-08 | IDOR — guess another user's deployment UUID via API               | 403 — not 404 (no information leakage)                    | Integration        |
| T-SEC-09 | CSP — dashboard UI has no unsafe-inline, no unsafe-eval           | CSP header present and strict on dashboard routes         | Integration        |
| T-SEC-10 | CSP — served deployments have default CSP applied                 | Default CSP header present on deployment responses        | Integration        |
| T-SEC-11 | Clickjacking — dashboard                                          | X-Frame-Options: DENY present                             | Integration        |
| T-SEC-12 | Dependency audit — npm audit                                      | Zero critical vulnerabilities                             | CI (every PR)      |
| T-SEC-13 | OWASP ZAP automated scan                                          | Zero high or critical findings                            | Pre-release        |
| T-SEC-14 | Third-party penetration test                                      | All critical/high findings resolved before Phase 2 GA     | Phase 2 gate       |
| T-SEC-15 | Error responses — no stack traces or internal paths exposed       | All error responses return generic messages in production | Integration        |
| T-SEC-16 | Served deployment error pages — no internal info exposed          | Generic messages only on 404, 500, bandwidth limit pages  | Integration        |
| T-SEC-17 | Session token entropy                                             | Tokens are cryptographically random — minimum 128 bits    | Unit               |
| T-SEC-18 | Password hashing — bcrypt cost factor                             | Cost factor ≥ 12 verified                                 | Unit               |


## 11.15  Test Surface — Performance

> *Maps to NFR-01 through NFR-13. Performance tests run before every release and are gates for Phase 2 GA.*


| Test ID   | Scenario                                                  | Target                     | Layer                         |
| --------- | --------------------------------------------------------- | -------------------------- | ----------------------------- |
| T-PERF-01 | TTFB for 500 KB deployment on LAN                         | < 100 ms                   | Load test                     |
| T-PERF-02 | TTFB for 500 KB deployment from internet                  | < 300 ms                   | Load test                     |
| T-PERF-03 | LCP for 500 KB deployment on throttled 4G                 | < 1.5 seconds              | Lighthouse CI                 |
| T-PERF-04 | 500 concurrent requests to single deployment — error rate | 0 errors                   | k6 load test                  |
| T-PERF-05 | 500 concurrent requests — p95 response time               | < 500 ms                   | k6 load test                  |
| T-PERF-06 | ZIP processing — 10 MB ZIP upload to serving              | < 5 seconds end-to-end     | Integration                   |
| T-PERF-07 | Dashboard first meaningful paint                          | < 1 second                 | Lighthouse CI                 |
| T-PERF-08 | Lighthouse performance score — dashboard                  | ≥ 90                       | Lighthouse CI (every release) |
| T-PERF-09 | Lighthouse accessibility score — dashboard                | ≥ 90                       | Lighthouse CI                 |
| T-PERF-10 | Deployment list query — 10,000 deployments                | < 50 ms                    | Integration                   |
| T-PERF-11 | Thumbnail generation — headless browser screenshot        | < 30 seconds after publish | Integration                   |


## 11.16  Test Surface — Data Integrity

> *Tests that verify the system never corrupts or loses data — particularly during concurrent operations and failure scenarios.*


| Test ID  | Scenario                                                        | Expected result                                            | Layer       |
| -------- | --------------------------------------------------------------- | ---------------------------------------------------------- | ----------- |
| T-DAT-01 | Overwrite deployment while it is being served                   | No visitor sees partial state — atomic swap                | Integration |
| T-DAT-02 | Delete deployment while upload in progress                      | Upload fails cleanly, no orphaned files in storage         | Integration |
| T-DAT-03 | Account deletion — files purged within 24 hours                 | Zero files remaining in storage after 24 hours             | Integration |
| T-DAT-04 | Version history — restore previous version                      | Correct files served after restore, not current version    | Integration |
| T-DAT-05 | Backup restore — restore from yesterday's backup                | All deployments accessible, metadata correct               | Integration |
| T-DAT-06 | Content hash — stored hash matches actual file content          | SHA-256 of served file equals stored hash                  | Unit        |
| T-DAT-07 | Bandwidth daily rollup — bytes match sum of request log         | No double-counting or gaps                                 | Unit        |
| T-DAT-08 | Workspace deletion — all deployments archived, Stripe cancelled | Zero live deployments, subscription status cancelled       | Integration |
| T-DAT-09 | Editor conflict — API overwrites while editor is open           | Conflict warning shown, user prompted before their publish | E2E         |
| T-DAT-10 | Concurrent slug rename — two requests for same new slug         | Exactly one succeeds                                       | Integration |


## 11.17  Test Surface — Accessibility

> *Maps to FR-350 through FR-355. Axe automated scan runs on every PR. Manual keyboard and screen reader tests run before every release.*


| Test ID   | Scenario                                                                | Expected result                                                       | Layer                |
| --------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------- |
| T-A11Y-01 | Axe scan — dashboard                                                    | Zero critical or serious violations                                   | E2E (every PR)       |
| T-A11Y-02 | Axe scan — upload zone                                                  | Zero violations                                                       | E2E (every PR)       |
| T-A11Y-03 | Axe scan — share sheet modal                                            | Zero violations                                                       | E2E (every PR)       |
| T-A11Y-04 | Axe scan — password prompt page                                         | Zero violations                                                       | E2E (every PR)       |
| T-A11Y-05 | Axe scan — all system pages (404, expiry, bandwidth limit, unavailable) | Zero violations                                                       | E2E (every PR)       |
| T-A11Y-06 | Keyboard navigation — full dashboard without mouse                      | All actions reachable                                                 | Manual (pre-release) |
| T-A11Y-07 | Upload zone — keyboard access                                           | Tab to focus, Enter opens file picker, status announced via aria-live | E2E                  |
| T-A11Y-08 | Share sheet modal — focus trap                                          | Escape closes, Tab cycles within modal, focus returns to trigger      | E2E                  |
| T-A11Y-09 | Colour contrast — all text                                              | WCAG 2.1 AA contrast ratios met (4.5:1 normal, 3:1 large)             | Axe + manual         |
| T-A11Y-10 | Screen reader — VoiceOver on iOS — upload and share flow                | Fully navigable, all controls announced correctly                     | Manual (pre-release) |


## 11.18  Test Surface — Cross-Browser & Device


| Test ID   | Scenario                                              | Expected result                                  | Layer                |
| --------- | ----------------------------------------------------- | ------------------------------------------------ | -------------------- |
| T-XBRO-01 | Core upload flow — Chrome latest                      | Passes                                           | E2E                  |
| T-XBRO-02 | Core upload flow — Firefox latest                     | Passes                                           | E2E                  |
| T-XBRO-03 | Core upload flow — Safari latest                      | Passes                                           | E2E                  |
| T-XBRO-04 | Core upload flow — Edge latest                        | Passes                                           | E2E                  |
| T-XBRO-05 | Drag-and-drop upload — Chrome desktop                 | Passes                                           | E2E                  |
| T-XBRO-06 | Drag-and-drop upload — Safari (no dataTransfer.items) | Graceful fallback to file picker                 | E2E                  |
| T-XBRO-07 | webkitdirectory folder upload — Chrome, Edge          | Folder uploaded as ZIP                           | E2E                  |
| T-XBRO-08 | webkitdirectory — Firefox (not supported)             | File picker shown instead, no error              | E2E                  |
| T-XBRO-09 | iOS Safari — tap to browse upload                     | File picker opens, upload succeeds               | E2E (Playwright iOS) |
| T-XBRO-10 | iOS Safari — share sheet bottom sheet                 | Opens correctly, all options tappable            | E2E                  |
| T-XBRO-11 | iOS Safari — password prompt                          | Fully functional, keyboard does not obscure form | Manual               |
| T-XBRO-12 | Android Chrome — full upload flow                     | Passes                                           | E2E                  |
| T-XBRO-13 | Auto-nav widget — mobile viewport (375px)             | Widget visible and functional, not obscured      | E2E                  |


## 11.19  Milestone Gate Test Map

Every milestone acceptance gate in the delivery plan corresponds to one or more named automated tests. The following table maps each gate to its test suite. A milestone is closed only when all mapped tests pass in CI.


| Milestone | Gate description                                  | Test suite                                                    |
| --------- | ------------------------------------------------- | ------------------------------------------------------------- |
| M1.1      | Docker image builds and runs locally              | docker compose up returns 200 on /health — manual + T-PERF-07 |
| M1.2      | Multi-format upload end-to-end                    | T-UPL-01 through T-UPL-17, T-SRV-20                           |
| M1.3      | Limit profile system — unit tests pass            | T-LIM-01 through T-LIM-14                                     |
| M1.4      | Auth — login flow on real accounts                | T-AUTH-01 through T-AUTH-08                                   |
| M1.5      | Full dashboard walkthrough                        | T-PERM-01 through T-PERM-08, Playwright E2E dashboard flow    |
| M1.6      | Password protection + brute-force                 | T-PERM-16 through T-PERM-18, T-SEC-07                         |
| M1.7      | In-browser editor — edit → publish → verify live  | T-DAT-09, T-AUTH-19, Playwright editor E2E                    |
| M1.8      | Auto-nav widget multi-page test                   | T-SRV-17 through T-SRV-19                                     |
| M1.9      | Share flow walkthrough                            | T-XBRO-10, Playwright share sheet E2E                         |
| M1.10     | Each notification type triggered and received     | T-NOT-01 through T-NOT-21                                     |
| M1.11     | Abuse simulation test                             | T-SEC-12, T-AUTH-13, T-AUTH-14, content hash T-UPL-20         |
| M1.12     | Analytics data verified against real traffic      | T-ANL-01 through T-ANL-11                                     |
| M1.13     | Lighthouse score ≥ 90                             | T-PERF-07 through T-PERF-09                                   |
| M1.14     | Security review sign-off                          | T-SEC-01 through T-SEC-13                                     |
| M1.18     | Bot filtering verified                            | T-ANL-02, T-ANL-03, T-ANL-15                                  |
| M1.22     | WCAG 2.1 AA accessibility audit                   | T-A11Y-01 through T-A11Y-09                                   |
| M1.25     | Public launch smoke test                          | Full E2E suite green on production                            |
| M2.1      | API contract test suite passes                    | T-API-01 through T-API-17                                     |
| M2.15     | Posture B — malicious file quarantined within 60s | T-SEC-13 + known-malicious fixture upload test                |
| M2.18     | Pentest — no open critical/high findings          | T-SEC-14 (third-party report attached)                        |
| M2.27     | CLI deploys a React build in under 10 seconds     | T-API-20                                                      |
| M2.28     | Backup restore verification                       | T-DAT-05                                                      |
| M2.31     | Phase 2 GA — full suite green                     | All T-* tests passing on Phase 2 release candidate            |


# Appendix A — Glossary


| Term                    | Definition                                                                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deployment              | A published set of one or more HTML files, accessible at a unique URL                                                                                             |
| Slug                    | The URL-safe identifier assigned to a deployment (e.g. sprint-retro-q1)                                                                                           |
| Namespace               | An optional team or org prefix that scopes slugs (e.g. /acme/)                                                                                                    |
| Publisher               | A user with permission to create, update, and delete their own deployments                                                                                        |
| Static content          | HTML, CSS, JavaScript, images, and fonts requiring no server-side execution                                                                                       |
| MCP connector           | A Model Context Protocol server exposing DropSites as a callable tool in Claude                                                                                   |
| IdP                     | Identity Provider — the SSO system managing user auth (e.g. Okta, Azure AD, Keycloak)                                                                             |
| OIDC                    | OpenID Connect — the protocol used for SSO integration                                                                                                            |
| RPO                     | Recovery Point Objective — maximum acceptable data loss on failure                                                                                                |
| RTO                     | Recovery Time Objective — maximum acceptable time to restore service                                                                                              |
| Limit profile           | A named configuration defining resource boundaries for a user — deployment count, storage, bandwidth, and feature flags                                           |
| Bandwidth cap           | Maximum bytes served from a user's deployments in a calendar month before enforcement kicks in                                                                    |
| Stripe                  | Payment processor used in Phase 2 to manage subscriptions and automate limit profile assignment                                                                   |
| Enterprise licence      | Annual contract granting an organisation the right to run DropSites on their own infrastructure with enterprise limit profiles                                    |
| Assisted deployment     | A commercial engagement where the DropSites team deploys the platform into a customer's own cloud account                                                         |
| Private cloud instance  | A dedicated isolated DropSites instance managed by the DropSites team on their own infrastructure for a single customer                                           |
| Helm chart              | A Kubernetes deployment package for DropSites — parameterised for different cloud providers                                                                       |
| Terraform module        | Infrastructure-as-code that provisions all cloud resources required to run DropSites on GCP, AWS, or Azure                                                        |
| Air-gapped              | A deployment environment with no outbound internet access — licence validation and all features must work without calling dropsites.app                           |
| S3-compatible API       | The object storage interface implemented by AWS S3, Cloudflare R2, GCS, Azure Blob, and MinIO — DropSites's only storage interface                                |
| Cloudflare R2           | The recommended object storage backend for the SaaS tier — identical S3 API, zero egress fees                                                                     |
| Resend                  | Transactional email provider used for all DropSites email notifications — configurable via environment variable                                                   |
| Twilio                  | SMS delivery provider for time-sensitive and security-critical notifications — requires verified phone number from user                                           |
| Notification preference | A per-user, per-notification-type setting controlling which channel (email, SMS, or both) receives each event                                                     |
| Workspace               | An organisational container owning deployments, members, a limit profile, and a Stripe subscription                                                               |
| Workspace member        | A user belonging to a workspace with an assigned role: Owner, Publisher, or Viewer                                                                                |
| Editor lock             | A temporary record indicating a user has the in-browser editor open for a deployment — used for conflict detection                                                |
| Trial period            | A 14-day automatic Pro profile granted to new SaaS accounts — reverts to free on expiry                                                                           |
| White-label             | Enterprise configuration replacing all DropSites branding with customer branding across dashboard, emails, and served pages                                       |
| Data residency          | The geographic region where deployment files and metadata are stored — US or EU                                                                                   |
| bandwidth_daily         | The database table tracking daily bytes-served per deployment — used to compute monthly bandwidth totals                                                          |
| Access token            | A unique URL parameter tied to a named recipient enabling per-person view tracking                                                                                |
| Webhook                 | An HTTP callback sent to an external endpoint when a deployment event occurs                                                                                      |
| dropsites.json          | Optional manifest file in the ZIP root configuring DropSites behaviour (page order, labels, widget settings)                                                      |
| Health check            | Background verification that a deployment's index and all linked assets resolve correctly                                                                         |
| Supabase                | The managed PostgreSQL + Auth + Storage platform used as the database and authentication backend for DropSites                                                    |
| RLS                     | Row-Level Security — Supabase/PostgreSQL feature that enforces workspace permissions at the database level, making permission bypasses architecturally impossible |
| shadcn/ui               | The UI component system used in DropSites — components owned in the codebase, built on Radix UI primitives with Tailwind CSS                                      |
| Geist                   | The typography used throughout the DropSites UI — designed for interfaces, built into Next.js 15                                                                  |
| Cloudflare R2           | Object storage for deployment files — S3-compatible API, zero egress fees, served via Cloudflare CDN                                                              |
| Next.js App Router      | The routing and server architecture used — UI pages and API route handlers coexist in the same Next.js codebase                                                   |
| Resend                  | Transactional email provider for all DropSites notification emails                                                                                                |
| Twilio                  | SMS delivery provider for time-sensitive and security notifications                                                                                               |
| CodeMirror 6            | The code editor library used for the in-browser HTML editor — styled to match the shadcn visual language                                                          |
| Sonner                  | The toast notification library used for success/error feedback — part of the shadcn ecosystem                                                                     |


# Appendix B — Document Control


| Version | Date       | Summary                                                                                                                                                                                                                                                                                                                           |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | March 2026 | Initial release — full PRD for DropSites v1 through Phase 3                                                                                                                                                                                                                                                                       |
| 1.1     | March 2026 | Added: in-browser editing, quick dashboard actions, auto-navigation widget, expanded performance & CDN requirements                                                                                                                                                                                                               |
| 1.2     | March 2026 | Added: custom domains, link expiry, QR codes, embed codes, per-recipient tokens, temporary disable, duplicate, version history, password hardening, image optimisation, auto-nav title inference, webhooks, single-file PATCH API, health check                                                                                   |
| 1.3     | March 2026 | Business model defined (proprietary, freemium SaaS + enterprise self-hosted licence). Pay tiers replaced with limit profile system. Stripe scoped to Phase 2. Added FRs 139-192: limit profiles, storage limits, bandwidth limits, API rate limits, usage visibility (publisher + admin), limit enforcement UX                    |
| 1.4     | March 2026 | Expanded from HTML-only to full static site platform. Added: supported file types, SSO/auth clarification, share flow, abuse Posture A (Phase 1), abuse Posture B (Phase 2). Phase 1 extended to week 8, Phase 2 to week 14.                                                                                                      |
| 1.5     | March 2026 | Added: enterprise delivery models (self-managed, assisted deployment, private cloud instance). Hosting architecture & cost basis (Cloudflare R2, egress cost model, cloud portability mapping). Infrastructure portability FRs (FR-191-201), enterprise delivery FRs (FR-202-210). Helm chart + Terraform to Phase 2.             |
| 1.6     | March 2026 | Added: notification system (FR-211-223). Timeline revised to milestone-driven dependency-sequenced plan with explicit gates.                                                                                                                                                                                                      |
| 1.7     | March 2026 | Added workspace model (Section 1.5, FR-224-240). Added 20 blind spots across session management, data residency, pentest, CSP defaults, account compromise, support channel, changelog, mobile/responsive, empty states, offline states, editor conflict, API search, cache invalidation.                                         |
| 1.8     | March 2026 | Added 8 MVP blind spots (FR-328-360) and 12 Phase 2 blind spots (FR-361-425). Phase 1 extended to M1.25. Phase 2 extended to M2.31.                                                                                                                                                                                               |
| 1.9     | March 2026 | Added Section 11 — Testing Strategy with 200+ named test cases. CI/CD pipeline, coverage targets, and milestone gate test map defined.                                                                                                                                                                                            |
| 2.0     | March 2026 | Technology stack locked: Next.js 15 + shadcn/ui + Geist + Tailwind + Supabase (PostgreSQL + Auth) + Cloudflare R2 + Resend + Twilio + Sentry. Section 5 rewritten with confirmed stack. Section 6 expanded with full design direction, shadcn component map, colour system, typography, density, and motion spec. OQ-00 resolved. |



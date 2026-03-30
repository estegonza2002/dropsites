# DropSites — Deployment Verification Checklist

> Run through this checklist after every deployment to confirm the system is fully operational. All items must pass before the deployment is considered complete.

---

## Automated Verification

Run the automated verification script first:

```bash
tsx scripts/verify-deployment.ts --url https://app.dropsites.example.com
```

This checks health endpoint, TLS validity, upload, and serve. Review the pass/fail output before proceeding with manual checks below.

---

## Infrastructure

- [ ] **Health endpoint** — `GET /health` returns HTTP 200 with `{"status":"ok"}`
- [ ] **Response time** — Health endpoint responds in < 500ms
- [ ] **Container/process running** — Application process is up and accepting connections

## Database Connectivity

- [ ] **Connection established** — App connects to PostgreSQL without errors (check logs)
- [ ] **Migrations applied** — All migration files have been applied (`supabase migration list`)
- [ ] **RLS policies active** — Row-level security is enabled on all tables
- [ ] **Read/write test** — Can create and read back a test record

## Storage Connectivity

- [ ] **Bucket accessible** — Storage backend (S3/GCS/Blob) is reachable from the app
- [ ] **Upload test** — Can upload a test file via the API
- [ ] **Download test** — Can retrieve the uploaded test file
- [ ] **Delete test** — Can delete the test file after verification

## TLS / Certificate

- [ ] **Certificate valid** — TLS certificate is present and not expired
- [ ] **Certificate chain** — Full chain is served (intermediate + root)
- [ ] **HTTPS enforced** — HTTP requests redirect to HTTPS (301/308)
- [ ] **HSTS header** — `Strict-Transport-Security` header is present

## DNS

- [ ] **A/CNAME record** — Domain resolves to the correct IP or load balancer
- [ ] **Propagation complete** — `dig` from multiple locations returns correct records
- [ ] **No NXDOMAIN** — Domain does not return NXDOMAIN errors

## Authentication

- [ ] **Login page loads** — `/login` renders without errors
- [ ] **Magic link flow** — Email sign-in sends a magic link and completes auth
- [ ] **OAuth flow** — Google/GitHub OAuth redirects work and complete auth
- [ ] **Session persistence** — After login, refreshing the page keeps the user authenticated
- [ ] **Logout** — Signing out clears the session and redirects to login

## Core Functionality

- [ ] **File upload** — Upload a ZIP or single HTML file via the dashboard
- [ ] **Slug generation** — Deployment receives a unique slug
- [ ] **File serving** — Visiting `https://slug.domain.com` (or the deployment URL) serves the uploaded content
- [ ] **MIME types** — HTML served as `text/html`, CSS as `text/css`, JS as `application/javascript`
- [ ] **404 handling** — Non-existent paths within a deployment return the configured 404 page or a default 404

## Dashboard

- [ ] **Dashboard loads** — `/dashboard` renders the deployment table
- [ ] **Deployment list** — Previously deployed sites appear in the table
- [ ] **Search works** — Filtering deployments by name returns correct results
- [ ] **Row actions** — Context menu actions (disable, delete, duplicate) function correctly

## Performance

- [ ] **Page load** — Dashboard loads in < 3s on a standard connection
- [ ] **Static file serving** — Deployed static files serve in < 200ms from CDN edge
- [ ] **No console errors** — Browser console shows no JavaScript errors

## Monitoring

- [ ] **Error tracking** — Sentry is receiving events (trigger a test error if needed)
- [ ] **Logs accessible** — Application logs are available in the cloud provider's log service
- [ ] **Alerts configured** — Critical alerts (downtime, error spike, DB connection failure) are set up

## Licence

- [ ] **Licence key valid** — If applicable, the licence key is configured and accepted
- [ ] **Feature flags** — Licenced features are enabled; unlicenced features are gated

---

## Sign-off

| Item | Verified By | Date |
|------|-------------|------|
| All checks pass | | |
| Automated script passes | | |
| Production traffic enabled | | |

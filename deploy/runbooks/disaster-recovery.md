# Disaster Recovery Runbook

> **RTO Target: < 1 hour** | **RPO Target: < 24 hours** (daily backups)

## Overview

This runbook covers recovery procedures for the three critical infrastructure failure scenarios. All steps assume the operator has access to the DropSites admin credentials, cloud provider console, and the `deploy/` directory.

---

## Scenario 1: Database Loss (Supabase PostgreSQL)

**Symptoms:** Application returns 500 errors, health endpoint reports `database: down`, audit log writes fail.

### Recovery Steps

1. **Confirm the outage**
   ```bash
   curl https://your-domain.com/api/health
   ```
   If `services.database` is `down`, proceed.

2. **Check Supabase status**
   - Visit [status.supabase.com](https://status.supabase.com)
   - If Supabase-wide outage, wait for their resolution and monitor.

3. **If self-hosted Supabase — restore from backup**
   ```bash
   # List available backups
   ls /var/backups/supabase/

   # Restore the most recent backup
   pg_restore --clean --if-exists \
     -h localhost -U supabase_admin -d postgres \
     /var/backups/supabase/latest.dump
   ```

4. **If managed Supabase — restore via dashboard**
   - Go to Supabase Dashboard > Project > Database > Backups
   - Select the most recent point-in-time backup
   - Click "Restore"
   - Wait for restore to complete (typically 5-15 minutes)

5. **Run schema migrations to ensure consistency**
   ```bash
   cd dropsites/
   npx supabase db push
   ```

6. **Verify recovery**
   ```bash
   curl https://your-domain.com/api/health
   # Expect: { "status": "healthy", "services": { "database": "healthy" } }
   ```

7. **Post-recovery**
   - Check audit_log for any gaps
   - Notify affected workspace owners if data loss occurred
   - File an incident report

**Estimated Recovery Time:** 15-30 minutes

---

## Scenario 2: R2/Storage Down (Cloudflare R2)

**Symptoms:** Deployment pages return 502/503, file uploads fail, health endpoint reports `storage: down`.

### Recovery Steps

1. **Confirm the outage**
   ```bash
   curl https://your-domain.com/api/health
   ```
   If `services.storage` is `down`, proceed.

2. **Check Cloudflare status**
   - Visit [cloudflarestatus.com](https://www.cloudflarestatus.com)
   - If R2-specific outage, proceed to failover.

3. **If transient — wait and retry**
   - R2 outages are typically resolved within 15-30 minutes
   - The serving middleware will return cached responses where available
   - CDN edge cache continues serving previously-cached assets

4. **If prolonged — switch to backup bucket**
   ```bash
   # Update environment variable to point to backup bucket
   # In your deployment platform (Vercel, Docker, etc.):
   R2_BUCKET_NAME=dropsites-backups

   # Restart the application
   # Vercel: trigger redeploy
   # Docker: docker compose restart app
   ```

5. **If R2 completely unavailable — switch storage backend**
   ```bash
   # Switch to S3 or MinIO fallback
   STORAGE_BACKEND=s3
   R2_ACCESS_KEY_ID=<aws-access-key>
   R2_SECRET_ACCESS_KEY=<aws-secret-key>
   # Set endpoint for S3-compatible target

   # Restore from most recent backup
   npx tsx scripts/monthly-restore-test.ts
   ```

6. **Restore files from backup to new storage**
   ```bash
   # Using the restore library
   npx tsx -e "
     import { restoreFromBackup } from './lib/backup/restore';
     const yesterday = new Date();
     yesterday.setDate(yesterday.getDate() - 1);
     const date = yesterday.toISOString().slice(0, 10);
     restoreFromBackup(date).then(r => console.log(JSON.stringify(r, null, 2)));
   "
   ```

7. **Verify recovery**
   - Load 3-5 deployments in a browser
   - Confirm file serving works end-to-end
   - Check upload flow with a test deployment

8. **Post-recovery**
   - Switch back to primary bucket once R2 is restored
   - Run monthly restore test to verify backup integrity
   - File an incident report

**Estimated Recovery Time:** 15-45 minutes

---

## Scenario 3: Application Tier Crash (Next.js / Vercel)

**Symptoms:** All pages return 502/503, health endpoint unreachable, deployment serving fails.

### Recovery Steps

1. **Confirm the outage**
   ```bash
   curl -I https://your-domain.com/api/health
   # If connection refused or 502/503, proceed
   ```

2. **If hosted on Vercel**
   - Check [vercel-status.com](https://www.vercel-status.com)
   - If Vercel-wide outage, wait for resolution
   - If project-specific: check Vercel dashboard > Deployments for errors

3. **Rollback to last known good deployment**
   ```bash
   # Vercel
   vercel rollback

   # Docker
   docker compose down
   docker compose up -d --pull always
   ```

4. **If self-hosted (Docker)**
   ```bash
   # Check container status
   docker compose ps

   # View logs for crash reason
   docker compose logs --tail 100 app

   # Restart the container
   docker compose restart app

   # If image is corrupted, force rebuild
   docker compose build --no-cache app
   docker compose up -d app
   ```

5. **If the crash is caused by a bad deployment**
   ```bash
   # Revert to previous git commit
   git log --oneline -5
   git revert HEAD
   git push origin main
   # Trigger redeploy
   ```

6. **Verify recovery**
   ```bash
   curl https://your-domain.com/api/health
   # Test a few deployment URLs
   curl -I https://your-domain.com/s/test-slug
   ```

7. **Post-recovery**
   - Review application logs for root cause
   - Add monitoring alert if not already present
   - File an incident report

**Estimated Recovery Time:** 5-15 minutes

---

## General Post-Incident Checklist

- [ ] Verify `/api/health` returns `healthy`
- [ ] Verify 3-5 random deployments load correctly
- [ ] Verify upload flow works end-to-end
- [ ] Check audit_log for gaps during outage window
- [ ] Send status update to affected users (if applicable)
- [ ] Update status page
- [ ] Write incident post-mortem within 48 hours
- [ ] Schedule follow-up to address root cause

## Contact Escalation

| Priority | Channel | Response SLA |
|----------|---------|-------------|
| P0 (full outage) | PagerDuty / on-call | 15 minutes |
| P1 (partial degradation) | Slack #incidents | 30 minutes |
| P2 (minor issue) | Slack #engineering | 4 hours |

## Backup Schedule

| Data | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Deployment files | Daily 02:00 UTC | 30 days | R2 backup bucket |
| Database (Supabase) | Continuous PITR | 7 days | Supabase managed |
| Audit logs | Append-only | 2 years | PostgreSQL |
| Analytics | Daily aggregate | 13 months | PostgreSQL |

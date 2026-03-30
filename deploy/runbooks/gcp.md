# DropSites — GCP Deployment Runbook

> Deploy DropSites on Google Cloud Platform using Cloud Run, Cloud SQL (PostgreSQL), and GCS.

---

## Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated (`gcloud auth login`)
- Terraform >= 1.5 installed
- Domain name with DNS access
- DropSites container image built and pushed to a registry

---

## Step 1: Create GCP Project

```bash
export PROJECT_ID="dropsites-prod"
export REGION="us-central1"

gcloud projects create $PROJECT_ID --name="DropSites Production"
gcloud config set project $PROJECT_ID
gcloud beta billing projects link $PROJECT_ID --billing-account=YOUR_BILLING_ACCOUNT_ID
```

## Step 2: Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  compute.googleapis.com \
  servicenetworking.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  secretmanager.googleapis.com
```

## Step 3: Create Service Account

```bash
gcloud iam service-accounts create dropsites-app \
  --display-name="DropSites Application"

export SA_EMAIL="dropsites-app@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant required roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 4: Configure Terraform Variables

Create `deploy/terraform/gcp/terraform.tfvars`:

```hcl
project_id       = "dropsites-prod"
region           = "us-central1"
db_tier          = "db-custom-2-4096"    # 2 vCPU, 4 GB RAM
db_password      = "CHANGE_ME"           # Use a strong password
container_image  = "gcr.io/dropsites-prod/dropsites:latest"
domain           = "app.dropsites.example.com"
```

## Step 5: Apply Terraform

```bash
cd deploy/terraform/gcp

terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

Terraform provisions:
- Cloud SQL PostgreSQL 15 instance with private IP
- GCS bucket for deployment file storage
- Cloud Run service with auto-scaling (min 1, max 10)
- VPC connector for Cloud SQL access
- Secret Manager entries for DB credentials and app secrets
- Cloud Run domain mapping

## Step 6: Run Database Migrations

```bash
# Connect to Cloud SQL via proxy
gcloud sql connect dropsites-db --user=dropsites --database=dropsites

# Or use Cloud SQL Auth Proxy locally
cloud-sql-proxy --port 5433 ${PROJECT_ID}:${REGION}:dropsites-db &

# Apply migrations
DATABASE_URL="postgresql://dropsites:PASSWORD@localhost:5433/dropsites" \
  npx supabase db push
```

## Step 7: Configure DNS

Point your domain to the Cloud Run service URL.

```bash
# Get the Cloud Run service URL
gcloud run services describe dropsites --region=$REGION --format='value(status.url)'

# Add a CNAME record in your DNS provider:
#   app.dropsites.example.com  CNAME  ghs.googlehosted.com.

# Verify domain mapping
gcloud run domain-mappings describe --domain=app.dropsites.example.com --region=$REGION
```

## Step 8: TLS Configuration

Cloud Run provides TLS automatically via Google-managed certificates. Verify:

```bash
# Check certificate status
gcloud run domain-mappings describe \
  --domain=app.dropsites.example.com \
  --region=$REGION \
  --format='value(status.resourceRecords)'

# Verify TLS is active (may take up to 15 minutes)
curl -vI https://app.dropsites.example.com/health 2>&1 | grep "SSL certificate"
```

## Step 9: Set Environment Variables

```bash
gcloud run services update dropsites --region=$REGION \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="STORAGE_BACKEND=gcs" \
  --set-env-vars="GCS_BUCKET=dropsites-deployments" \
  --set-env-vars="NEXT_PUBLIC_APP_URL=https://app.dropsites.example.com" \
  --update-secrets="DATABASE_URL=dropsites-db-url:latest" \
  --update-secrets="SUPABASE_SERVICE_ROLE_KEY=supabase-service-key:latest"
```

## Step 10: Health Check Verification

```bash
# Check health endpoint
curl -s https://app.dropsites.example.com/health | jq .

# Expected response:
# { "status": "ok", "timestamp": "..." }

# Check Cloud Run logs
gcloud run services logs read dropsites --region=$REGION --limit=50
```

---

## Post-Deployment Verification Checklist

- [ ] `/health` returns `200 OK` with `{"status":"ok"}`
- [ ] Cloud SQL connection is established (check logs for DB errors)
- [ ] GCS bucket is accessible (upload a test file)
- [ ] TLS certificate is valid and auto-renewing
- [ ] DNS resolves correctly (`dig app.dropsites.example.com`)
- [ ] Auth flow works (sign up, login, OAuth callbacks)
- [ ] File upload and serving works end-to-end
- [ ] Cloud Run auto-scaling is configured (min 1, max 10)
- [ ] Monitoring and alerting are active
- [ ] Run `tsx scripts/verify-deployment.ts --url https://app.dropsites.example.com`

---

## Rollback

```bash
# List revisions
gcloud run revisions list --service=dropsites --region=$REGION

# Route traffic to previous revision
gcloud run services update-traffic dropsites \
  --region=$REGION \
  --to-revisions=dropsites-PREVIOUS_REVISION=100
```

## Cost Estimate (Monthly)

| Resource | Estimated Cost |
|----------|---------------|
| Cloud Run (min 1 instance) | ~$15 |
| Cloud SQL (db-custom-2-4096) | ~$50 |
| GCS (10 GB storage) | ~$0.20 |
| Networking / Egress | ~$5 |
| **Total** | **~$70/month** |

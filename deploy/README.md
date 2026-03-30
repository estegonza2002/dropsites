# DropSites — Deployment

This directory contains everything needed to deploy DropSites to production infrastructure.

## Directory Structure

```
deploy/
├── README.md                  # This file
├── helm/                      # Helm chart for Kubernetes deployments
│   └── dropsites/
├── terraform/                 # Infrastructure-as-Code per cloud provider
│   ├── aws/
│   ├── azure/
│   └── gcp/
└── runbooks/                  # Step-by-step deployment guides
    ├── gcp.md                 # Google Cloud Platform (Cloud Run + Cloud SQL + GCS)
    ├── aws.md                 # Amazon Web Services (ECS + RDS + S3)
    ├── azure.md               # Microsoft Azure (ACI + PostgreSQL + Blob Storage)
    └── verification-checklist.md  # Post-deployment verification checklist
```

## Runbooks

| Cloud Provider | Runbook | Compute | Database | Storage |
|---------------|---------|---------|----------|---------|
| GCP | [gcp.md](runbooks/gcp.md) | Cloud Run | Cloud SQL PostgreSQL | GCS |
| AWS | [aws.md](runbooks/aws.md) | ECS Fargate | RDS PostgreSQL | S3 |
| Azure | [azure.md](runbooks/azure.md) | Container Instances | PostgreSQL Flexible | Blob Storage |

## Verification

After deploying, run the automated verification script:

```bash
tsx scripts/verify-deployment.ts --url https://your-instance.example.com
```

Then work through the full [verification checklist](runbooks/verification-checklist.md).

## Quick Start

1. Choose your cloud provider and follow the corresponding runbook
2. Apply the Terraform configuration in `terraform/<provider>/`
3. Run database migrations
4. Configure DNS and TLS
5. Run the verification script to confirm everything works

# DropSites — AWS Deployment Runbook

> Deploy DropSites on Amazon Web Services using ECS Fargate, RDS PostgreSQL, and S3.

---

## Prerequisites

- AWS account with appropriate permissions
- AWS CLI v2 installed and configured (`aws configure`)
- Terraform >= 1.5 installed
- Domain name with DNS access (Route 53 recommended)
- DropSites container image built and pushed to ECR

---

## Step 1: AWS Account Setup

```bash
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
```

## Step 2: Create IAM Roles

```bash
# Create ECS task execution role
aws iam create-role \
  --role-name dropsites-ecs-execution \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name dropsites-ecs-execution \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Create ECS task role (for app-level permissions)
aws iam create-role \
  --role-name dropsites-ecs-task \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach S3 access policy
aws iam put-role-policy \
  --role-name dropsites-ecs-task \
  --policy-name dropsites-s3-access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::dropsites-deployments",
        "arn:aws:s3:::dropsites-deployments/*"
      ]
    }]
  }'
```

## Step 3: Push Container Image to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name dropsites --region $AWS_REGION

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Tag and push
docker tag dropsites:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/dropsites:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/dropsites:latest
```

## Step 4: Configure Terraform Variables

Create `deploy/terraform/aws/terraform.tfvars`:

```hcl
aws_region       = "us-east-1"
db_instance_class = "db.t3.medium"
db_password      = "CHANGE_ME"           # Use a strong password
container_image  = "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/dropsites:latest"
domain           = "app.dropsites.example.com"
hosted_zone_id   = "Z0123456789ABCDEFGHIJ"
```

## Step 5: Apply Terraform

```bash
cd deploy/terraform/aws

terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

Terraform provisions:
- VPC with public and private subnets across 2 AZs
- RDS PostgreSQL 15 in private subnets (Multi-AZ optional)
- S3 bucket for deployment file storage
- ECS Fargate cluster and service (desired count 2)
- Application Load Balancer with HTTPS listener
- ACM certificate for TLS
- Security groups isolating DB from public access
- Secrets Manager entries for DB credentials
- CloudWatch log group

## Step 6: Run Database Migrations

```bash
# Use ECS Exec to connect to a running task
TASK_ARN=$(aws ecs list-tasks --cluster dropsites --service-name dropsites --query 'taskArns[0]' --output text)

aws ecs execute-command \
  --cluster dropsites \
  --task $TASK_ARN \
  --container dropsites \
  --interactive \
  --command "/bin/sh"

# Or connect via bastion / VPN and run migrations directly
DATABASE_URL="postgresql://dropsites:PASSWORD@rds-endpoint:5432/dropsites" \
  npx supabase db push
```

## Step 7: Configure DNS with Route 53

```bash
# Get ALB DNS name from Terraform output
ALB_DNS=$(terraform output -raw alb_dns_name)

# Create alias record (if using Route 53)
aws route53 change-resource-record-sets --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.dropsites.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "ALB_HOSTED_ZONE_ID",
          "DNSName": "'$ALB_DNS'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# Verify DNS propagation
dig app.dropsites.example.com
```

## Step 8: ACM Certificate (TLS)

```bash
# Request certificate (if not done via Terraform)
aws acm request-certificate \
  --domain-name app.dropsites.example.com \
  --validation-method DNS \
  --region $AWS_REGION

# Complete DNS validation (add the CNAME record ACM provides)
# Check certificate status
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:${AWS_REGION}:${AWS_ACCOUNT_ID}:certificate/CERT_ID \
  --query 'Certificate.Status'

# Expected: "ISSUED"
```

## Step 9: Set Environment Variables

Environment variables are configured via ECS task definition. Update via Terraform or directly:

```bash
# Update task definition with new environment variables
# Edit deploy/terraform/aws/main.tf or use:
aws ecs describe-task-definition --task-definition dropsites --query 'taskDefinition' > task-def.json

# Edit task-def.json to update environment variables:
# NODE_ENV=production
# STORAGE_BACKEND=s3
# S3_BUCKET=dropsites-deployments
# S3_REGION=us-east-1
# NEXT_PUBLIC_APP_URL=https://app.dropsites.example.com

aws ecs register-task-definition --cli-input-json file://task-def.json
aws ecs update-service --cluster dropsites --service dropsites --force-new-deployment
```

## Step 10: Health Check Verification

```bash
# Check health endpoint
curl -s https://app.dropsites.example.com/health | jq .

# Expected response:
# { "status": "ok", "timestamp": "..." }

# Check ALB target group health
aws elbv2 describe-target-health \
  --target-group-arn $(terraform output -raw target_group_arn)

# Check ECS service events
aws ecs describe-services --cluster dropsites --services dropsites \
  --query 'services[0].events[:10]'
```

---

## Post-Deployment Verification Checklist

- [ ] `/health` returns `200 OK` with `{"status":"ok"}`
- [ ] RDS connection is established (check CloudWatch logs)
- [ ] S3 bucket is accessible (upload a test file)
- [ ] ACM certificate is issued and attached to ALB
- [ ] DNS resolves correctly (`dig app.dropsites.example.com`)
- [ ] Auth flow works (sign up, login, OAuth callbacks)
- [ ] File upload and serving works end-to-end
- [ ] ECS tasks are running with desired count
- [ ] CloudWatch alarms are configured
- [ ] Run `tsx scripts/verify-deployment.ts --url https://app.dropsites.example.com`

---

## Rollback

```bash
# List task definition revisions
aws ecs list-task-definitions --family-prefix dropsites --sort DESC

# Update service to previous revision
aws ecs update-service \
  --cluster dropsites \
  --service dropsites \
  --task-definition dropsites:PREVIOUS_REVISION
```

## Cost Estimate (Monthly)

| Resource | Estimated Cost |
|----------|---------------|
| ECS Fargate (2 tasks, 0.5 vCPU, 1 GB) | ~$30 |
| RDS PostgreSQL (db.t3.medium) | ~$50 |
| S3 (10 GB storage) | ~$0.25 |
| ALB | ~$20 |
| NAT Gateway | ~$35 |
| **Total** | **~$135/month** |

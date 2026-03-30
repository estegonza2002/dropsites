# DropSites — Azure Deployment Runbook

> Deploy DropSites on Microsoft Azure using Azure Container Instances (ACI), Azure Database for PostgreSQL, and Azure Blob Storage.

---

## Prerequisites

- Azure subscription with appropriate permissions
- Azure CLI installed and authenticated (`az login`)
- Terraform >= 1.5 installed
- Domain name with DNS access
- DropSites container image built and pushed to a registry

---

## Step 1: Azure Subscription Setup

```bash
export SUBSCRIPTION_ID=$(az account show --query id --output tsv)
export RESOURCE_GROUP="dropsites-prod"
export LOCATION="eastus"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION
```

## Step 2: Create Container Registry

```bash
export ACR_NAME="dropsitesprod"

az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic

# Login to ACR
az acr login --name $ACR_NAME

# Tag and push image
docker tag dropsites:latest ${ACR_NAME}.azurecr.io/dropsites:latest
docker push ${ACR_NAME}.azurecr.io/dropsites:latest
```

## Step 3: Create Service Principal

```bash
az ad sp create-for-rbac \
  --name "dropsites-app" \
  --role Contributor \
  --scopes /subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}

# Save the output — you need appId, password, and tenant
```

## Step 4: Configure Terraform Variables

Create `deploy/terraform/azure/terraform.tfvars`:

```hcl
resource_group_name = "dropsites-prod"
location            = "eastus"
db_sku_name         = "B_Standard_B1ms"
db_password         = "CHANGE_ME"           # Use a strong password
container_image     = "dropsitesprod.azurecr.io/dropsites:latest"
domain              = "app.dropsites.example.com"
```

## Step 5: Apply Terraform

```bash
cd deploy/terraform/azure

terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

Terraform provisions:
- Azure Database for PostgreSQL Flexible Server
- Azure Blob Storage account with a container for deployments
- Azure Container Instances group (or Azure Container Apps)
- Virtual Network with subnets for DB and app
- Azure Key Vault for secrets
- Azure DNS zone (optional, if using Azure DNS)
- Application Gateway with TLS termination

## Step 6: Run Database Migrations

```bash
# Connect to PostgreSQL (allow your IP in firewall first)
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name dropsites-db \
  --rule-name allow-local \
  --start-ip-address YOUR_IP \
  --end-ip-address YOUR_IP

# Apply migrations
DATABASE_URL="postgresql://dropsites:PASSWORD@dropsites-db.postgres.database.azure.com:5432/dropsites?sslmode=require" \
  npx supabase db push

# Remove temporary firewall rule
az postgres flexible-server firewall-rule delete \
  --resource-group $RESOURCE_GROUP \
  --name dropsites-db \
  --rule-name allow-local \
  --yes
```

## Step 7: Configure DNS

```bash
# Get the public IP of the Application Gateway or ACI
PUBLIC_IP=$(az container show \
  --resource-group $RESOURCE_GROUP \
  --name dropsites \
  --query 'ipAddress.ip' \
  --output tsv)

echo "Point your domain to: $PUBLIC_IP"

# If using Azure DNS:
az network dns record-set a add-record \
  --resource-group $RESOURCE_GROUP \
  --zone-name dropsites.example.com \
  --record-set-name app \
  --ipv4-address $PUBLIC_IP

# Verify DNS
dig app.dropsites.example.com
```

## Step 8: TLS Configuration

```bash
# Option A: Use Azure Application Gateway with managed certificate
az network application-gateway ssl-cert create \
  --resource-group $RESOURCE_GROUP \
  --gateway-name dropsites-appgw \
  --name dropsites-cert \
  --key-vault-secret-id "https://dropsites-kv.vault.azure.net/secrets/tls-cert"

# Option B: Use Azure Container Apps with managed TLS (if using ACA)
az containerapp hostname bind \
  --resource-group $RESOURCE_GROUP \
  --name dropsites \
  --hostname app.dropsites.example.com \
  --environment dropsites-env \
  --validation-method CNAME

# Verify TLS
curl -vI https://app.dropsites.example.com/health 2>&1 | grep "SSL certificate"
```

## Step 9: Set Environment Variables

```bash
# For ACI — update container group
az container create \
  --resource-group $RESOURCE_GROUP \
  --name dropsites \
  --image ${ACR_NAME}.azurecr.io/dropsites:latest \
  --environment-variables \
    NODE_ENV=production \
    STORAGE_BACKEND=azure-blob \
    AZURE_STORAGE_ACCOUNT=dropsitesstorage \
    NEXT_PUBLIC_APP_URL=https://app.dropsites.example.com \
  --secure-environment-variables \
    DATABASE_URL="postgresql://dropsites:PASSWORD@dropsites-db.postgres.database.azure.com:5432/dropsites?sslmode=require" \
    AZURE_STORAGE_KEY="STORAGE_ACCOUNT_KEY" \
    SUPABASE_SERVICE_ROLE_KEY="YOUR_KEY"
```

## Step 10: Health Check Verification

```bash
# Check health endpoint
curl -s https://app.dropsites.example.com/health | jq .

# Expected response:
# { "status": "ok", "timestamp": "..." }

# Check ACI logs
az container logs \
  --resource-group $RESOURCE_GROUP \
  --name dropsites \
  --follow

# Check container status
az container show \
  --resource-group $RESOURCE_GROUP \
  --name dropsites \
  --query 'instanceView.state'
```

---

## Post-Deployment Verification Checklist

- [ ] `/health` returns `200 OK` with `{"status":"ok"}`
- [ ] PostgreSQL connection is established (check container logs)
- [ ] Blob Storage is accessible (upload a test file)
- [ ] TLS certificate is valid
- [ ] DNS resolves correctly (`dig app.dropsites.example.com`)
- [ ] Auth flow works (sign up, login, OAuth callbacks)
- [ ] File upload and serving works end-to-end
- [ ] Container is running and healthy
- [ ] Azure Monitor alerts are configured
- [ ] Run `tsx scripts/verify-deployment.ts --url https://app.dropsites.example.com`

---

## Rollback

```bash
# Redeploy previous image tag
az container create \
  --resource-group $RESOURCE_GROUP \
  --name dropsites \
  --image ${ACR_NAME}.azurecr.io/dropsites:PREVIOUS_TAG \
  --restart-policy Always

# Or restore from a previous Terraform state
cd deploy/terraform/azure
terraform apply -target=azurerm_container_group.dropsites
```

## Cost Estimate (Monthly)

| Resource | Estimated Cost |
|----------|---------------|
| ACI (1 vCPU, 2 GB, always-on) | ~$50 |
| PostgreSQL Flexible Server (B1ms) | ~$25 |
| Blob Storage (10 GB) | ~$0.20 |
| Application Gateway (basic) | ~$20 |
| **Total** | **~$95/month** |

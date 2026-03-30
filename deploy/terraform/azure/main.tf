terraform {
  required_version = ">= 1.5"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# ---------- Resource Group ----------

resource "azurerm_resource_group" "dropsites" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    App         = var.app_name
    Environment = var.environment
  }
}

# ---------- Container Instances ----------

resource "azurerm_container_group" "dropsites" {
  name                = var.app_name
  location            = azurerm_resource_group.dropsites.location
  resource_group_name = azurerm_resource_group.dropsites.name
  os_type             = "Linux"
  ip_address_type     = "Public"
  dns_name_label      = var.app_name

  container {
    name   = var.app_name
    image  = var.image
    cpu    = "1"
    memory = "1"

    ports {
      port     = 3000
      protocol = "TCP"
    }

    environment_variables = {
      NODE_ENV        = "production"
      PORT            = "3000"
      STORAGE_BACKEND = "s3"
      S3_ENDPOINT     = azurerm_storage_account.dropsites.primary_blob_endpoint
      S3_BUCKET       = azurerm_storage_container.deployments.name
      SUPABASE_URL    = var.supabase_url
      SENTRY_DSN      = var.sentry_dsn
    }

    secure_environment_variables = {
      DATABASE_URL              = "postgresql://dropsites:${var.db_password}@${azurerm_postgresql_flexible_server.dropsites.fqdn}:5432/${var.app_name}?sslmode=require"
      SUPABASE_ANON_KEY         = var.supabase_anon_key
      SUPABASE_SERVICE_ROLE_KEY = var.supabase_service_role_key
      S3_ACCESS_KEY_ID          = azurerm_storage_account.dropsites.name
      S3_SECRET_ACCESS_KEY      = azurerm_storage_account.dropsites.primary_access_key
      RESEND_API_KEY            = var.resend_api_key
    }

    liveness_probe {
      http_get {
        path   = "/api/health"
        port   = 3000
        scheme = "Http"
      }
      initial_delay_seconds = 15
      period_seconds        = 20
    }

    readiness_probe {
      http_get {
        path   = "/api/health"
        port   = 3000
        scheme = "Http"
      }
      initial_delay_seconds = 5
      period_seconds        = 10
    }
  }

  tags = {
    App         = var.app_name
    Environment = var.environment
  }
}

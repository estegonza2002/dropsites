# ---------- Azure Blob Storage ----------

resource "azurerm_storage_account" "dropsites" {
  name                     = replace("${var.app_name}${var.environment}", "-", "")
  resource_group_name      = azurerm_resource_group.dropsites.name
  location                 = azurerm_resource_group.dropsites.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  blob_properties {
    delete_retention_policy {
      days = 7
    }
  }

  tags = {
    App         = var.app_name
    Environment = var.environment
  }
}

resource "azurerm_storage_container" "deployments" {
  name                  = "deployments"
  storage_account_name  = azurerm_storage_account.dropsites.name
  container_access_type = "private"
}

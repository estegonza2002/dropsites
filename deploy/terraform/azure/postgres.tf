# ---------- Azure Database for PostgreSQL Flexible Server ----------

resource "azurerm_postgresql_flexible_server" "dropsites" {
  name                   = "${var.app_name}-db"
  resource_group_name    = azurerm_resource_group.dropsites.name
  location               = azurerm_resource_group.dropsites.location
  version                = "15"
  administrator_login    = "dropsites"
  administrator_password = var.db_password
  sku_name               = var.db_sku
  storage_mb             = 32768
  zone                   = "1"

  backup_retention_days = 7

  tags = {
    App         = var.app_name
    Environment = var.environment
  }
}

resource "azurerm_postgresql_flexible_server_database" "dropsites" {
  name      = var.app_name
  server_id = azurerm_postgresql_flexible_server.dropsites.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Allow Azure services to connect
resource "azurerm_postgresql_flexible_server_firewall_rule" "azure_services" {
  name             = "allow-azure-services"
  server_id        = azurerm_postgresql_flexible_server.dropsites.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

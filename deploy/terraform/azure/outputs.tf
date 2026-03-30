output "container_fqdn" {
  description = "Container group FQDN"
  value       = azurerm_container_group.dropsites.fqdn
}

output "container_ip" {
  description = "Container group public IP"
  value       = azurerm_container_group.dropsites.ip_address
}

output "storage_account_name" {
  description = "Storage account name"
  value       = azurerm_storage_account.dropsites.name
}

output "storage_container_name" {
  description = "Blob storage container name"
  value       = azurerm_storage_container.deployments.name
}

output "postgresql_fqdn" {
  description = "PostgreSQL server FQDN"
  value       = azurerm_postgresql_flexible_server.dropsites.fqdn
}

output "postgresql_database_name" {
  description = "PostgreSQL database name"
  value       = azurerm_postgresql_flexible_server_database.dropsites.name
}

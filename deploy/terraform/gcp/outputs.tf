output "cloud_run_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.dropsites.uri
}

output "gcs_bucket" {
  description = "GCS bucket for deployment files"
  value       = google_storage_bucket.deployments.name
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL instance connection name"
  value       = google_sql_database_instance.dropsites.connection_name
}

output "service_account_email" {
  description = "Service account email for Cloud Run"
  value       = google_service_account.dropsites.email
}

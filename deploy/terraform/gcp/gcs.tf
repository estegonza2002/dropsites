# ---------- GCS bucket for deployment files ----------

resource "google_storage_bucket" "deployments" {
  name          = "${var.project_id}-${var.app_name}-deployments"
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true

  versioning {
    enabled = false
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }

  labels = {
    app         = var.app_name
    environment = var.environment
  }
}

# Service account for Cloud Run to access GCS
resource "google_service_account" "dropsites" {
  account_id   = "${var.app_name}-sa"
  display_name = "DropSites Cloud Run Service Account"
}

resource "google_storage_bucket_iam_member" "dropsites_rw" {
  bucket = google_storage_bucket.deployments.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.dropsites.email}"
}

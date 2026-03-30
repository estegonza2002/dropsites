terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ---------- Cloud Run service ----------

resource "google_cloud_run_v2_service" "dropsites" {
  name     = var.app_name
  location = var.region

  template {
    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    containers {
      image = var.image

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "PORT"
        value = "3000"
      }
      env {
        name  = "STORAGE_BACKEND"
        value = "s3"
      }
      env {
        name  = "S3_ENDPOINT"
        value = "https://storage.googleapis.com"
      }
      env {
        name  = "S3_BUCKET"
        value = google_storage_bucket.deployments.name
      }
      env {
        name  = "DATABASE_URL"
        value = "postgresql://dropsites:${var.db_password}@/${google_sql_database.dropsites.name}?host=/cloudsql/${google_sql_database_instance.dropsites.connection_name}"
      }
      env {
        name  = "SUPABASE_URL"
        value = var.supabase_url
      }
      env {
        name  = "SUPABASE_ANON_KEY"
        value = var.supabase_anon_key
      }
      env {
        name  = "SUPABASE_SERVICE_ROLE_KEY"
        value = var.supabase_service_role_key
      }
      env {
        name  = "RESEND_API_KEY"
        value = var.resend_api_key
      }
      env {
        name  = "SENTRY_DSN"
        value = var.sentry_dsn
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.dropsites.connection_name]
      }
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }
}

# Allow unauthenticated access (public site)
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = google_cloud_run_v2_service.dropsites.project
  location = google_cloud_run_v2_service.dropsites.location
  name     = google_cloud_run_v2_service.dropsites.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

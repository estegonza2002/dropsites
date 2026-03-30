# ---------- Cloud SQL PostgreSQL ----------

resource "google_sql_database_instance" "dropsites" {
  name             = "${var.app_name}-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier              = var.db_tier
    availability_type = "ZONAL"
    disk_size         = 10
    disk_type         = "PD_SSD"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
    }

    ip_configuration {
      ipv4_enabled = false
    }

    database_flags {
      name  = "max_connections"
      value = "100"
    }
  }

  deletion_protection = true
}

resource "google_sql_database" "dropsites" {
  name     = var.app_name
  instance = google_sql_database_instance.dropsites.name
}

resource "google_sql_user" "dropsites" {
  name     = "dropsites"
  instance = google_sql_database_instance.dropsites.name
  password = var.db_password
}

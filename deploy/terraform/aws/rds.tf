# ---------- RDS PostgreSQL ----------

resource "aws_db_subnet_group" "dropsites" {
  name       = "${var.app_name}-db"
  subnet_ids = var.subnet_ids

  tags = {
    App         = var.app_name
    Environment = var.environment
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "${var.app_name}-rds-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  tags = {
    App         = var.app_name
    Environment = var.environment
  }
}

resource "aws_db_instance" "dropsites" {
  identifier     = "${var.app_name}-db"
  engine         = "postgres"
  engine_version = "15"
  instance_class = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.app_name
  username = "dropsites"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.dropsites.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  multi_az            = false
  publicly_accessible = false
  skip_final_snapshot = false

  final_snapshot_identifier = "${var.app_name}-db-final"

  deletion_protection = true

  tags = {
    App         = var.app_name
    Environment = var.environment
  }
}

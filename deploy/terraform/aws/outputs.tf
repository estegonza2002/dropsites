output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.dropsites.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.dropsites.name
}

output "s3_bucket" {
  description = "S3 bucket for deployment files"
  value       = aws_s3_bucket.deployments.id
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.dropsites.endpoint
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.dropsites.db_name
}

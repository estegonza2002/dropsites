terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# ---------- ECS Cluster ----------

resource "aws_ecs_cluster" "dropsites" {
  name = var.app_name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    App         = var.app_name
    Environment = var.environment
  }
}

# ---------- IAM ----------

resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.app_name}-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task" {
  name = "${var.app_name}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "s3_access" {
  name = "${var.app_name}-s3-access"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ]
      Resource = [
        aws_s3_bucket.deployments.arn,
        "${aws_s3_bucket.deployments.arn}/*"
      ]
    }]
  })
}

# ---------- CloudWatch Logs ----------

resource "aws_cloudwatch_log_group" "dropsites" {
  name              = "/ecs/${var.app_name}"
  retention_in_days = 30

  tags = {
    App         = var.app_name
    Environment = var.environment
  }
}

# ---------- Security Groups ----------

resource "aws_security_group" "ecs" {
  name_prefix = "${var.app_name}-ecs-"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    App         = var.app_name
    Environment = var.environment
  }
}

# ---------- ECS Task Definition ----------

resource "aws_ecs_task_definition" "dropsites" {
  family                   = var.app_name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = var.app_name
    image = var.image

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3000" },
      { name = "STORAGE_BACKEND", value = "s3" },
      { name = "S3_BUCKET", value = aws_s3_bucket.deployments.id },
      { name = "S3_ENDPOINT", value = "https://s3.${var.region}.amazonaws.com" },
      { name = "DATABASE_URL", value = "postgresql://dropsites:${var.db_password}@${aws_db_instance.dropsites.endpoint}/${var.app_name}" },
      { name = "SUPABASE_URL", value = var.supabase_url },
      { name = "SUPABASE_ANON_KEY", value = var.supabase_anon_key },
      { name = "SUPABASE_SERVICE_ROLE_KEY", value = var.supabase_service_role_key },
      { name = "RESEND_API_KEY", value = var.resend_api_key },
      { name = "SENTRY_DSN", value = var.sentry_dsn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.dropsites.name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 15
    }
  }])

  tags = {
    App         = var.app_name
    Environment = var.environment
  }
}

# ---------- ECS Service (Fargate) ----------

resource "aws_ecs_service" "dropsites" {
  name            = var.app_name
  cluster         = aws_ecs_cluster.dropsites.id
  task_definition = aws_ecs_task_definition.dropsites.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  tags = {
    App         = var.app_name
    Environment = var.environment
  }
}

# ---------- Auto Scaling ----------

resource "aws_appautoscaling_target" "dropsites" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.dropsites.name}/${aws_ecs_service.dropsites.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "cpu" {
  name               = "${var.app_name}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.dropsites.resource_id
  scalable_dimension = aws_appautoscaling_target.dropsites.scalable_dimension
  service_namespace  = aws_appautoscaling_target.dropsites.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

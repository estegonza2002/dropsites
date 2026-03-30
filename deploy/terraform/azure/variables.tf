variable "location" {
  description = "Azure region"
  type        = string
  default     = "East US"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "dropsites"
}

variable "image" {
  description = "Container image URL"
  type        = string
}

variable "resource_group_name" {
  description = "Azure Resource Group name"
  type        = string
  default     = "dropsites-rg"
}

variable "db_password" {
  description = "PostgreSQL administrator password"
  type        = string
  sensitive   = true
}

variable "db_sku" {
  description = "Azure PostgreSQL SKU name"
  type        = string
  default     = "B_Standard_B1ms"
}

variable "supabase_url" {
  description = "Supabase project URL"
  type        = string
  default     = ""
}

variable "supabase_anon_key" {
  description = "Supabase anonymous key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "supabase_service_role_key" {
  description = "Supabase service role key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "resend_api_key" {
  description = "Resend API key for transactional email"
  type        = string
  sensitive   = true
  default     = ""
}

variable "sentry_dsn" {
  description = "Sentry DSN for error monitoring"
  type        = string
  default     = ""
}

variable "environment" {
  description = "Deployment environment (production, staging)"
  type        = string
  default     = "production"
}

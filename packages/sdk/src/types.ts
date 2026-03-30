/**
 * Configuration for the DropSites SDK client.
 */
export interface ClientConfig {
  /** API key for authentication. */
  apiKey: string;
  /** Base URL of the DropSites API. Defaults to https://dropsites.app/api/v1 */
  baseUrl?: string;
  /** Optional request timeout in milliseconds. Defaults to 30000. */
  timeout?: number;
}

/**
 * Represents a deployed site.
 */
export interface Deployment {
  id: string;
  slug: string;
  namespace: string | null;
  workspace_id: string;
  owner_id: string;
  entry_path: string;
  storage_bytes: number;
  file_count: number;
  is_disabled: boolean;
  classification: string;
  allow_indexing: boolean;
  auto_nav_enabled: boolean;
  health_status: string;
  expires_at: string | null;
  total_views: number;
  created_at: string;
  updated_at: string;
  url: string;
}

/**
 * Options for deploying a new site.
 */
export interface DeployOptions {
  /** The file content to deploy (as a Blob, File, Buffer, or ReadableStream). */
  file: Blob | ReadableStream | ArrayBuffer;
  /** Optional custom slug. Auto-generated if omitted. */
  slug?: string;
  /** Workspace ID to deploy into. */
  workspaceId: string;
  /** Entry path within the uploaded archive. Defaults to index.html. */
  entryPath?: string;
  /** Optional password to protect the deployment. */
  password?: string;
  /** Optional expiry date (ISO 8601 string). */
  expiresAt?: string;
}

/**
 * Options for listing deployments.
 */
export interface ListOptions {
  /** Workspace ID to list deployments for. */
  workspaceId: string;
  /** Page number (1-indexed). Defaults to 1. */
  page?: number;
  /** Number of items per page. Defaults to 25. */
  perPage?: number;
  /** Sort field. */
  sortBy?: 'created_at' | 'updated_at' | 'slug' | 'storage_bytes' | 'total_views';
  /** Sort direction. Defaults to 'desc'. */
  sortOrder?: 'asc' | 'desc';
  /** Search query string for filtering by slug. */
  search?: string;
}

/**
 * Paginated list response.
 */
export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * Options for updating a deployment.
 */
export interface UpdateOptions {
  /** New slug for the deployment. */
  slug?: string;
  /** Toggle indexing. */
  allowIndexing?: boolean;
  /** Toggle auto-navigation injection. */
  autoNavEnabled?: boolean;
  /** Set or clear expiry date (ISO 8601 string or null). */
  expiresAt?: string | null;
  /** Set or clear password. Pass null to remove. */
  password?: string | null;
}

/**
 * API error response body.
 */
export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

import type { ApiErrorResponse } from './types.js';

/**
 * Base error class for all DropSites SDK errors.
 */
export class DropSitesError extends Error {
  public readonly code: string;
  public readonly statusCode: number | undefined;
  public readonly details: Record<string, unknown> | undefined;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DropSitesError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  /**
   * Create a DropSitesError from an API error response.
   */
  static fromResponse(statusCode: number, body: ApiErrorResponse): DropSitesError {
    switch (statusCode) {
      case 401:
        return new AuthenticationError(body.error, body.details);
      case 403:
        return new AuthorizationError(body.error, body.details);
      case 404:
        return new NotFoundError(body.error, body.details);
      case 409:
        return new ConflictError(body.error, body.details);
      case 422:
        return new ValidationError(body.error, body.details);
      case 429:
        return new RateLimitError(body.error, body.details);
      default:
        return new DropSitesError(body.error, body.code, statusCode, body.details);
    }
  }
}

/**
 * Thrown when the API key is missing or invalid.
 */
export class AuthenticationError extends DropSitesError {
  constructor(message = 'Authentication failed', details?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Thrown when the authenticated user lacks permission.
 */
export class AuthorizationError extends DropSitesError {
  constructor(message = 'Insufficient permissions', details?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'AuthorizationError';
  }
}

/**
 * Thrown when the requested resource does not exist.
 */
export class NotFoundError extends DropSitesError {
  constructor(message = 'Resource not found', details?: Record<string, unknown>) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown on slug or resource conflicts.
 */
export class ConflictError extends DropSitesError {
  constructor(message = 'Resource conflict', details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}

/**
 * Thrown when request validation fails.
 */
export class ValidationError extends DropSitesError {
  constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 422, details);
    this.name = 'ValidationError';
  }
}

/**
 * Thrown when rate limits are exceeded.
 */
export class RateLimitError extends DropSitesError {
  public readonly retryAfter: number | undefined;

  constructor(message = 'Rate limit exceeded', details?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT', 429, details);
    this.name = 'RateLimitError';
    this.retryAfter = details?.['retryAfter'] as number | undefined;
  }
}

/**
 * Thrown when a network or timeout error occurs.
 */
export class NetworkError extends DropSitesError {
  constructor(message = 'Network request failed', details?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', undefined, details);
    this.name = 'NetworkError';
  }
}

/**
 * Thrown when a request times out.
 */
export class TimeoutError extends DropSitesError {
  constructor(message = 'Request timed out', details?: Record<string, unknown>) {
    super(message, 'TIMEOUT', undefined, details);
    this.name = 'TimeoutError';
  }
}

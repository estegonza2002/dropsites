import type { ApiErrorResponse } from './types.js';
/**
 * Base error class for all DropSites SDK errors.
 */
export declare class DropSitesError extends Error {
    readonly code: string;
    readonly statusCode: number | undefined;
    readonly details: Record<string, unknown> | undefined;
    constructor(message: string, code: string, statusCode?: number, details?: Record<string, unknown>);
    /**
     * Create a DropSitesError from an API error response.
     */
    static fromResponse(statusCode: number, body: ApiErrorResponse): DropSitesError;
}
/**
 * Thrown when the API key is missing or invalid.
 */
export declare class AuthenticationError extends DropSitesError {
    constructor(message?: string, details?: Record<string, unknown>);
}
/**
 * Thrown when the authenticated user lacks permission.
 */
export declare class AuthorizationError extends DropSitesError {
    constructor(message?: string, details?: Record<string, unknown>);
}
/**
 * Thrown when the requested resource does not exist.
 */
export declare class NotFoundError extends DropSitesError {
    constructor(message?: string, details?: Record<string, unknown>);
}
/**
 * Thrown on slug or resource conflicts.
 */
export declare class ConflictError extends DropSitesError {
    constructor(message?: string, details?: Record<string, unknown>);
}
/**
 * Thrown when request validation fails.
 */
export declare class ValidationError extends DropSitesError {
    constructor(message?: string, details?: Record<string, unknown>);
}
/**
 * Thrown when rate limits are exceeded.
 */
export declare class RateLimitError extends DropSitesError {
    readonly retryAfter: number | undefined;
    constructor(message?: string, details?: Record<string, unknown>);
}
/**
 * Thrown when a network or timeout error occurs.
 */
export declare class NetworkError extends DropSitesError {
    constructor(message?: string, details?: Record<string, unknown>);
}
/**
 * Thrown when a request times out.
 */
export declare class TimeoutError extends DropSitesError {
    constructor(message?: string, details?: Record<string, unknown>);
}
//# sourceMappingURL=errors.d.ts.map
import { DropSitesError, NetworkError, TimeoutError } from './errors.js';
const DEFAULT_BASE_URL = 'https://dropsites.app/api/v1';
const DEFAULT_TIMEOUT = 30_000;
/**
 * DropSites API client.
 *
 * @example
 * ```ts
 * const client = new DropSitesClient({ apiKey: 'ds_...' });
 * const deployments = await client.list({ workspaceId: 'ws_123' });
 * ```
 */
export class DropSitesClient {
    apiKey;
    baseUrl;
    timeout;
    constructor(config) {
        if (!config.apiKey) {
            throw new DropSitesError('API key is required', 'MISSING_API_KEY');
        }
        this.apiKey = config.apiKey;
        this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
        this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    }
    /**
     * Deploy a file or archive to create a new deployment.
     */
    async deploy(options) {
        const formData = new FormData();
        if (options.file instanceof ArrayBuffer) {
            formData.append('file', new Blob([options.file]));
        }
        else if (options.file instanceof ReadableStream) {
            const response = new Response(options.file);
            const blob = await response.blob();
            formData.append('file', blob);
        }
        else {
            formData.append('file', options.file);
        }
        formData.append('workspace_id', options.workspaceId);
        if (options.slug)
            formData.append('slug', options.slug);
        if (options.entryPath)
            formData.append('entry_path', options.entryPath);
        if (options.password)
            formData.append('password', options.password);
        if (options.expiresAt)
            formData.append('expires_at', options.expiresAt);
        return this.request('/deployments', {
            method: 'POST',
            body: formData,
        });
    }
    /**
     * List deployments for a workspace with pagination and filtering.
     */
    async list(options) {
        const params = new URLSearchParams();
        params.set('workspace_id', options.workspaceId);
        if (options.page)
            params.set('page', String(options.page));
        if (options.perPage)
            params.set('per_page', String(options.perPage));
        if (options.sortBy)
            params.set('sort_by', options.sortBy);
        if (options.sortOrder)
            params.set('sort_order', options.sortOrder);
        if (options.search)
            params.set('search', options.search);
        return this.request(`/deployments?${params.toString()}`);
    }
    /**
     * Get a single deployment by slug.
     */
    async get(slug) {
        return this.request(`/deployments/${encodeURIComponent(slug)}`);
    }
    /**
     * Update a deployment's settings.
     */
    async update(slug, options) {
        return this.request(`/deployments/${encodeURIComponent(slug)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options),
        });
    }
    /**
     * Delete a deployment permanently.
     */
    async delete(slug) {
        await this.request(`/deployments/${encodeURIComponent(slug)}`, {
            method: 'DELETE',
        });
    }
    /**
     * Get the public URL for a deployment.
     */
    open(slug, namespace) {
        const base = this.baseUrl.replace('/api/v1', '');
        if (namespace) {
            return `${base}/${namespace}/${slug}`;
        }
        return `${base}/${slug}`;
    }
    /**
     * Internal request helper with timeout and error handling.
     */
    async request(path, init) {
        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await fetch(url, {
                ...init,
                signal: controller.signal,
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    ...init?.headers,
                },
            });
            if (!response.ok) {
                let errorBody;
                try {
                    errorBody = (await response.json());
                }
                catch {
                    errorBody = {
                        error: response.statusText || 'Unknown error',
                        code: 'UNKNOWN',
                    };
                }
                throw DropSitesError.fromResponse(response.status, errorBody);
            }
            // 204 No Content
            if (response.status === 204) {
                return undefined;
            }
            return (await response.json());
        }
        catch (error) {
            if (error instanceof DropSitesError) {
                throw error;
            }
            if (error instanceof DOMException && error.name === 'AbortError') {
                throw new TimeoutError(`Request to ${path} timed out after ${this.timeout}ms`);
            }
            throw new NetworkError(error instanceof Error ? error.message : 'Network request failed');
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
}
//# sourceMappingURL=client.js.map
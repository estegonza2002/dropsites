import type { ClientConfig, Deployment, DeployOptions, ListOptions, ListResponse, UpdateOptions } from './types.js';
/**
 * DropSites API client.
 *
 * @example
 * ```ts
 * const client = new DropSitesClient({ apiKey: 'ds_...' });
 * const deployments = await client.list({ workspaceId: 'ws_123' });
 * ```
 */
export declare class DropSitesClient {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly timeout;
    constructor(config: ClientConfig);
    /**
     * Deploy a file or archive to create a new deployment.
     */
    deploy(options: DeployOptions): Promise<Deployment>;
    /**
     * List deployments for a workspace with pagination and filtering.
     */
    list(options: ListOptions): Promise<ListResponse<Deployment>>;
    /**
     * Get a single deployment by slug.
     */
    get(slug: string): Promise<Deployment>;
    /**
     * Update a deployment's settings.
     */
    update(slug: string, options: UpdateOptions): Promise<Deployment>;
    /**
     * Delete a deployment permanently.
     */
    delete(slug: string): Promise<void>;
    /**
     * Get the public URL for a deployment.
     */
    open(slug: string, namespace?: string): string;
    /**
     * Internal request helper with timeout and error handling.
     */
    private request;
}
//# sourceMappingURL=client.d.ts.map
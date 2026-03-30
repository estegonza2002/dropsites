import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the SDK by mocking fetch and verifying the client makes correct requests.
// Since the SDK lives in a separate package, we import from relative paths for testing.

// Inline the types and classes to avoid cross-package resolution issues in tests.
// In a real monorepo setup with workspaces, direct imports would work.

interface MockDeployment {
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

const MOCK_DEPLOYMENT: MockDeployment = {
  id: 'dep_123',
  slug: 'test-site',
  namespace: null,
  workspace_id: 'ws_456',
  owner_id: 'user_789',
  entry_path: 'index.html',
  storage_bytes: 1024,
  file_count: 3,
  is_disabled: false,
  classification: 'standard',
  allow_indexing: true,
  auto_nav_enabled: false,
  health_status: 'healthy',
  expires_at: null,
  total_views: 0,
  created_at: '2026-03-29T00:00:00Z',
  updated_at: '2026-03-29T00:00:00Z',
  url: 'https://dropsites.app/test-site',
};

const MOCK_LIST_RESPONSE = {
  data: [MOCK_DEPLOYMENT],
  total: 1,
  page: 1,
  perPage: 25,
  totalPages: 1,
};

describe('@dropsites/sdk — DropSitesClient', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function afterEach(fn: () => void) {
    // vitest afterEach is auto-imported, but we define inline for clarity
    return vi.fn(fn);
  }

  it('should throw if API key is missing', async () => {
    // Dynamically import to test constructor validation
    const { DropSitesClient } = await import(
      '../../../packages/sdk/src/client.js'
    );

    expect(() => new DropSitesClient({ apiKey: '' })).toThrow('API key is required');
  });

  it('should construct with valid config', async () => {
    const { DropSitesClient } = await import(
      '../../../packages/sdk/src/client.js'
    );

    const client = new DropSitesClient({ apiKey: 'ds_test_key' });
    expect(client).toBeDefined();
  });

  it('should call GET /deployments with query params for list()', async () => {
    const { DropSitesClient } = await import(
      '../../../packages/sdk/src/client.js'
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_LIST_RESPONSE),
    });
    globalThis.fetch = mockFetch;

    const client = new DropSitesClient({
      apiKey: 'ds_test_key',
      baseUrl: 'https://api.test.com/v1',
    });

    const result = await client.list({
      workspaceId: 'ws_456',
      page: 1,
      perPage: 10,
      search: 'test',
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/deployments?');
    expect(url).toContain('workspace_id=ws_456');
    expect(url).toContain('page=1');
    expect(url).toContain('per_page=10');
    expect(url).toContain('search=test');
    expect(options.headers).toHaveProperty('Authorization', 'Bearer ds_test_key');
    expect(result.data).toHaveLength(1);
    expect(result.data[0].slug).toBe('test-site');
  });

  it('should call GET /deployments/:slug for get()', async () => {
    const { DropSitesClient } = await import(
      '../../../packages/sdk/src/client.js'
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_DEPLOYMENT),
    });
    globalThis.fetch = mockFetch;

    const client = new DropSitesClient({
      apiKey: 'ds_test_key',
      baseUrl: 'https://api.test.com/v1',
    });

    const result = await client.get('test-site');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe('https://api.test.com/v1/deployments/test-site');
    expect(result.slug).toBe('test-site');
  });

  it('should call PATCH /deployments/:slug for update()', async () => {
    const { DropSitesClient } = await import(
      '../../../packages/sdk/src/client.js'
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...MOCK_DEPLOYMENT, allow_indexing: false }),
    });
    globalThis.fetch = mockFetch;

    const client = new DropSitesClient({
      apiKey: 'ds_test_key',
      baseUrl: 'https://api.test.com/v1',
    });

    const result = await client.update('test-site', { allowIndexing: false });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.test.com/v1/deployments/test-site');
    expect(options.method).toBe('PATCH');
    expect(result.allow_indexing).toBe(false);
  });

  it('should call DELETE /deployments/:slug for delete()', async () => {
    const { DropSitesClient } = await import(
      '../../../packages/sdk/src/client.js'
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    });
    globalThis.fetch = mockFetch;

    const client = new DropSitesClient({
      apiKey: 'ds_test_key',
      baseUrl: 'https://api.test.com/v1',
    });

    await client.delete('test-site');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.test.com/v1/deployments/test-site');
    expect(options.method).toBe('DELETE');
  });

  it('should return URL from open()', async () => {
    const { DropSitesClient } = await import(
      '../../../packages/sdk/src/client.js'
    );

    const client = new DropSitesClient({
      apiKey: 'ds_test_key',
      baseUrl: 'https://dropsites.app/api/v1',
    });

    expect(client.open('test-site')).toBe('https://dropsites.app/test-site');
    expect(client.open('test-site', 'myorg')).toBe('https://dropsites.app/myorg/test-site');
  });

  it('should throw AuthenticationError on 401', async () => {
    const { DropSitesClient } = await import(
      '../../../packages/sdk/src/client.js'
    );
    const { AuthenticationError } = await import(
      '../../../packages/sdk/src/errors.js'
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ error: 'Invalid API key', code: 'AUTHENTICATION_ERROR' }),
    });
    globalThis.fetch = mockFetch;

    const client = new DropSitesClient({
      apiKey: 'bad_key',
      baseUrl: 'https://api.test.com/v1',
    });

    await expect(client.get('test-site')).rejects.toThrow(AuthenticationError);
  });

  it('should throw NotFoundError on 404', async () => {
    const { DropSitesClient } = await import(
      '../../../packages/sdk/src/client.js'
    );
    const { NotFoundError } = await import(
      '../../../packages/sdk/src/errors.js'
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ error: 'Deployment not found', code: 'NOT_FOUND' }),
    });
    globalThis.fetch = mockFetch;

    const client = new DropSitesClient({
      apiKey: 'ds_test_key',
      baseUrl: 'https://api.test.com/v1',
    });

    await expect(client.get('nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('should throw RateLimitError on 429', async () => {
    const { DropSitesClient } = await import(
      '../../../packages/sdk/src/client.js'
    );
    const { RateLimitError } = await import(
      '../../../packages/sdk/src/errors.js'
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: () => Promise.resolve({ error: 'Rate limit exceeded', code: 'RATE_LIMIT' }),
    });
    globalThis.fetch = mockFetch;

    const client = new DropSitesClient({
      apiKey: 'ds_test_key',
      baseUrl: 'https://api.test.com/v1',
    });

    await expect(client.list({ workspaceId: 'ws_456' })).rejects.toThrow(RateLimitError);
  });

  it('should call POST /deployments with FormData for deploy()', async () => {
    const { DropSitesClient } = await import(
      '../../../packages/sdk/src/client.js'
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(MOCK_DEPLOYMENT),
    });
    globalThis.fetch = mockFetch;

    const client = new DropSitesClient({
      apiKey: 'ds_test_key',
      baseUrl: 'https://api.test.com/v1',
    });

    const file = new Blob(['<html>hello</html>'], { type: 'text/html' });
    const result = await client.deploy({
      file,
      workspaceId: 'ws_456',
      slug: 'my-site',
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.test.com/v1/deployments');
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);
    expect(result.slug).toBe('test-site');
  });
});

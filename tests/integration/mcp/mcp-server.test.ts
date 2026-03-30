// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import type { DropSitesClient } from '@dropsites/sdk';

import { deployTool } from '../../../packages/mcp/src/tools/deploy.js';
import { listTool } from '../../../packages/mcp/src/tools/list.js';
import { deleteTool } from '../../../packages/mcp/src/tools/delete.js';
import { updateTool } from '../../../packages/mcp/src/tools/update.js';

class MockDropSitesError extends Error {
  public code: string;
  constructor(msg: string, code: string) {
    super(msg);
    this.name = 'DropSitesError';
    this.code = code;
  }
}

const mockDeployment = {
  id: 'dep-1',
  slug: 'test-slug',
  workspace_id: 'ws-1',
  owner_id: 'user-1',
  namespace: null,
  entry_path: 'index.html',
  storage_bytes: 1024,
  file_count: 1,
  is_disabled: false,
  classification: 'general',
  allow_indexing: true,
  auto_nav_enabled: false,
  health_status: 'healthy',
  expires_at: null,
  total_views: 0,
  created_at: '2026-03-30T00:00:00Z',
  updated_at: '2026-03-30T00:00:00Z',
  url: 'https://dropsites.app/test-slug',
};

function makeMockClient() {
  return {
    deploy: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    open: vi.fn((slug: string) => `https://dropsites.app/${slug}`),
    get: vi.fn(),
  } as unknown as DropSitesClient;
}

describe('MCP tool functions', () => {
  let tempDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    tempDir = join(tmpdir(), `mcp-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
    await writeFile(join(tempDir, 'index.html'), '<!doctype html><html><body><h1>Test</h1></body></html>');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('T-MCP-01: deploy_site with a directory returns { url, slug }', async () => {
    const client = makeMockClient();
    (client.deploy as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockDeployment);

    const result = await deployTool(
      client,
      { path: tempDir, slug: 'test-slug', workspace_id: 'ws-1' },
      'default'
    );

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.url).toBe('https://dropsites.app/test-slug');
    expect(parsed.slug).toBe('test-slug');
  });

  it('T-MCP-02: deploy_site with a single file returns URL', async () => {
    const client = makeMockClient();
    (client.deploy as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockDeployment);

    const filePath = join(tempDir, 'index.html');
    const result = await deployTool(
      client,
      { path: filePath, slug: 'test-slug' },
      'default'
    );

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.url).toBeTruthy();
    expect(parsed.url).toContain('test-slug');
  });

  it('T-MCP-03: deploy_site with non-existent path returns error text (no throw)', async () => {
    const client = makeMockClient();

    const result = await deployTool(
      client,
      { path: '/non/existent/path/xyz-impossible' },
      'default'
    );

    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain('Error');
    expect(result.content[0].text).toContain('/non/existent/path/xyz-impossible');
    expect(client.deploy).not.toHaveBeenCalled();
  });

  it('T-MCP-04: deploy_site — SDK throws quota error, propagated as tool content text', async () => {
    const client = makeMockClient();
    const quotaError = new MockDropSitesError('Storage quota exceeded', 'QUOTA_EXCEEDED');
    (client.deploy as ReturnType<typeof vi.fn>).mockRejectedValueOnce(quotaError);

    const result = await deployTool(client, { path: tempDir }, 'default');

    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain('Error');
    expect(result.content[0].text).toContain('Storage quota exceeded');
  });

  it('T-MCP-05: deploy_site with auto-slug returns server-assigned slug', async () => {
    const client = makeMockClient();
    const serverSlugDeployment = { ...mockDeployment, slug: 'auto-generated-slug-abc' };
    (client.deploy as ReturnType<typeof vi.fn>).mockResolvedValueOnce(serverSlugDeployment);
    (client.open as ReturnType<typeof vi.fn>).mockImplementation(
      (slug: string) => `https://dropsites.app/${slug}`
    );

    const result = await deployTool(client, { path: tempDir }, 'default');

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.slug).toBe('auto-generated-slug-abc');
    expect(parsed.url).toContain('auto-generated-slug-abc');
  });

  it('T-MCP-06: list_sites returns deployment list with slugs/urls', async () => {
    const client = makeMockClient();
    const deployment2 = { ...mockDeployment, slug: 'site-2' };
    (client.list as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: [mockDeployment, deployment2],
      total: 2,
    });

    const result = await listTool(client, { workspace_id: 'ws-1' }, 'default');

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.sites).toHaveLength(2);
    expect(parsed.total).toBe(2);
    expect(parsed.sites[0].slug).toBe('test-slug');
    expect(parsed.sites[0].url).toBeTruthy();
    expect(parsed.sites[1].slug).toBe('site-2');
  });

  it('T-MCP-07: list_sites with empty workspace returns { sites: [], total: 0 }', async () => {
    const client = makeMockClient();
    (client.list as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: [], total: 0 });

    const result = await listTool(client, { workspace_id: 'empty-ws' }, 'default');

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.sites).toEqual([]);
    expect(parsed.total).toBe(0);
  });

  it('T-MCP-08: delete_site with known slug returns success confirmation', async () => {
    const client = makeMockClient();
    (client.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

    const result = await deleteTool(client, { slug: 'test-slug' });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain('test-slug');
    expect(result.content[0].text).toContain('deleted');
    expect(client.delete).toHaveBeenCalledWith('test-slug');
  });

  it('T-MCP-09: delete_site with unknown slug returns "not found" message', async () => {
    const client = makeMockClient();
    (client.delete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('404: Deployment not found')
    );

    const result = await deleteTool(client, { slug: 'ghost-slug' });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain('not found');
    expect(result.content[0].text).toContain('ghost-slug');
  });

  it('T-MCP-10: update_site with valid path returns URL with updated content', async () => {
    const client = makeMockClient();
    const updatedDeployment = {
      ...mockDeployment,
      slug: 'test-slug',
      updated_at: '2026-03-30T01:00:00Z',
    };

    // fetch returns non-ok so the tool falls back to client.deploy
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });
    vi.stubGlobal('fetch', mockFetch);

    (client.deploy as ReturnType<typeof vi.fn>).mockResolvedValueOnce(updatedDeployment);

    const result = await updateTool(
      client,
      { slug: 'test-slug', path: tempDir },
      'default',
      'test-api-key',
      'https://dropsites.app/api/v1'
    );

    vi.unstubAllGlobals();

    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.url).toBeTruthy();
    expect(parsed.slug).toBe('test-slug');
  });
});

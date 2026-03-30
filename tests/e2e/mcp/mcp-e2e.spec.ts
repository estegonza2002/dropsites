import { test, expect } from '@playwright/test';
import { McpTestClient } from '../../helpers/mcp-client.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdir, writeFile, rm } from 'node:fs/promises';

test.describe('MCP E2E', () => {
  test.skip(!process.env.E2E_MCP, 'Set E2E_MCP=true to run live MCP tests');

  let client: McpTestClient;
  let tempDir: string;
  let deployedSlug: string;

  test.beforeAll(async () => {
    const apiKey = process.env.DROPSITES_API_KEY!;
    client = new McpTestClient({ DROPSITES_API_KEY: apiKey });

    await client.send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '0.0.1' },
    });

    tempDir = join(tmpdir(), `mcp-e2e-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    await writeFile(
      join(tempDir, 'index.html'),
      '<!doctype html><html><body><h1>MCP E2E Test</h1></body></html>'
    );
  });

  test.afterAll(async () => {
    if (deployedSlug) {
      await client.send('tools/call', {
        name: 'delete_site',
        arguments: { slug: deployedSlug },
      });
    }
    await rm(tempDir, { recursive: true, force: true });
    client.kill();
  });

  test('deploy_site returns a live URL', async () => {
    const response = await client.send('tools/call', {
      name: 'deploy_site',
      arguments: { path: tempDir },
    });

    expect(response.error).toBeUndefined();
    const result = response.result as { content: Array<{ text: string }> };
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.url).toBeTruthy();
    expect(parsed.slug).toBeTruthy();
    deployedSlug = parsed.slug;

    const res = await fetch(parsed.url);
    expect(res.status).toBe(200);
  });
});

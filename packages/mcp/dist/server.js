import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DropSitesClient } from '@dropsites/sdk';
import { z } from 'zod';
import { deployTool } from './tools/deploy.js';
import { listTool } from './tools/list.js';
import { deleteTool } from './tools/delete.js';
import { updateTool } from './tools/update.js';
const DEFAULT_BASE_URL = 'https://dropsites.app/api/v1';
export function createServer(apiKey, baseUrl) {
    const resolvedBaseUrl = baseUrl ?? DEFAULT_BASE_URL;
    const client = new DropSitesClient({ apiKey, baseUrl: resolvedBaseUrl });
    const defaultWorkspaceId = 'default';
    const server = new McpServer({
        name: 'dropsites',
        version: '0.1.0',
    });
    server.tool('deploy_site', 'Deploy a local file or directory to DropSites and get a shareable URL', {
        path: z.string().describe('Local filesystem path to a file or directory to deploy'),
        slug: z.string().optional().describe('Desired URL slug — auto-generated if omitted'),
        workspace_id: z.string().optional().describe('Target workspace ID — defaults to personal workspace'),
        title: z.string().optional().describe('Human-readable label for this deployment'),
    }, async (input) => deployTool(client, input, defaultWorkspaceId));
    server.tool('list_sites', 'List your DropSites deployments', {
        workspace_id: z.string().optional().describe('Workspace ID to list deployments for'),
        limit: z.number().optional().describe('Maximum number of results to return (default: 20)'),
    }, async (input) => listTool(client, input, defaultWorkspaceId));
    server.tool('delete_site', 'Delete a DropSites deployment permanently', {
        slug: z.string().describe('Slug of the deployment to delete'),
    }, async (input) => deleteTool(client, input));
    server.tool('update_site', 'Replace the content of an existing DropSites deployment', {
        slug: z.string().describe('Slug of the deployment to update'),
        path: z.string().describe('Local filesystem path to the new file or directory'),
    }, async (input) => updateTool(client, input, defaultWorkspaceId, apiKey, resolvedBaseUrl));
    return server;
}
//# sourceMappingURL=server.js.map
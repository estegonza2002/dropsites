#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
const apiKey = process.env.DROPSITES_API_KEY;
const baseUrl = process.env.DROPSITES_BASE_URL;
if (!apiKey) {
    console.error('Error: DROPSITES_API_KEY environment variable is required.');
    console.error('Get your API key at https://dropsites.app/dashboard/settings/api-keys');
    process.exit(1);
}
const server = createServer(apiKey, baseUrl);
const transport = new StdioServerTransport();
await server.connect(transport);
//# sourceMappingURL=index.js.map
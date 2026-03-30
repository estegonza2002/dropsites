import { DropSitesClient, DropSitesError } from '@dropsites/sdk';
import { getApiKey, getBaseUrl, getWorkspaceId } from '../config.js';

interface ListArgs {
  workspaceId?: string;
  page?: number;
  perPage?: number;
  search?: string;
}

function parseArgs(args: string[]): ListArgs {
  const result: ListArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    switch (arg) {
      case '--workspace':
      case '-w':
        result.workspaceId = args[++i];
        break;
      case '--page':
        result.page = parseInt(args[++i] ?? '1', 10);
        break;
      case '--per-page':
        result.perPage = parseInt(args[++i] ?? '25', 10);
        break;
      case '--search':
      case '-q':
        result.search = args[++i];
        break;
    }
  }

  return result;
}

export async function listCommand(args: string[]): Promise<void> {
  const parsed = parseArgs(args);

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('Error: API key not found. Run `dropsites login` or set DROPSITES_API_KEY.');
    process.exit(1);
  }

  const workspaceId = parsed.workspaceId ?? getWorkspaceId();
  if (!workspaceId) {
    console.error('Error: workspace ID is required. Use --workspace or set DROPSITES_WORKSPACE_ID.');
    process.exit(1);
  }

  const client = new DropSitesClient({
    apiKey,
    baseUrl: getBaseUrl(),
  });

  try {
    const response = await client.list({
      workspaceId,
      page: parsed.page,
      perPage: parsed.perPage,
      search: parsed.search,
    });

    if (response.data.length === 0) {
      console.log('No deployments found.');
      return;
    }

    console.log(`Deployments (page ${response.page}/${response.totalPages}, total: ${response.total}):\n`);

    for (const d of response.data) {
      const status = d.is_disabled ? '[disabled]' : '[active]';
      console.log(`  ${d.slug} ${status}`);
      console.log(`    URL: ${d.url}`);
      console.log(`    Created: ${d.created_at}`);
      console.log('');
    }
  } catch (error) {
    if (error instanceof DropSitesError) {
      console.error(`Error: ${error.message} (${error.code})`);
    } else {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    }
    process.exit(1);
  }
}

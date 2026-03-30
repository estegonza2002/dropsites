import { DropSitesClient, DropSitesError } from '@dropsites/sdk';
import type { UpdateOptions } from '@dropsites/sdk';
import { getApiKey, getBaseUrl } from '../config.js';

interface UpdateArgs {
  slug: string;
  options: UpdateOptions;
}

function parseArgs(args: string[]): UpdateArgs {
  const result: UpdateArgs = { slug: '', options: {} };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    switch (arg) {
      case '--new-slug':
        result.options.slug = args[++i];
        break;
      case '--indexing':
        result.options.allowIndexing = args[++i] === 'true';
        break;
      case '--auto-nav':
        result.options.autoNavEnabled = args[++i] === 'true';
        break;
      case '--expires':
        result.options.expiresAt = args[++i] ?? null;
        break;
      case '--password':
        result.options.password = args[++i];
        break;
      case '--remove-password':
        result.options.password = null;
        break;
      default:
        if (!arg.startsWith('-')) {
          result.slug = arg;
        }
        break;
    }
  }

  return result;
}

export async function updateCommand(args: string[]): Promise<void> {
  const parsed = parseArgs(args);

  if (!parsed.slug) {
    console.error('Error: slug is required');
    console.error('Usage: dropsites update <slug> [--new-slug <slug>] [--password <pass>] [--indexing true|false]');
    process.exit(1);
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('Error: API key not found. Run `dropsites login` or set DROPSITES_API_KEY.');
    process.exit(1);
  }

  if (Object.keys(parsed.options).length === 0) {
    console.error('Error: at least one update option is required.');
    process.exit(1);
  }

  const client = new DropSitesClient({
    apiKey,
    baseUrl: getBaseUrl(),
  });

  try {
    const deployment = await client.update(parsed.slug, parsed.options);
    console.log(`Deployment "${parsed.slug}" updated.`);
    console.log(`  Slug: ${deployment.slug}`);
    console.log(`  URL:  ${deployment.url}`);
  } catch (error) {
    if (error instanceof DropSitesError) {
      console.error(`Error: ${error.message} (${error.code})`);
    } else {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    }
    process.exit(1);
  }
}

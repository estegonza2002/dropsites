import { DropSitesClient, DropSitesError } from '@dropsites/sdk';
import { getApiKey, getBaseUrl } from '../config.js';
import { createInterface } from 'node:readline';

interface DeleteArgs {
  slug: string;
  force: boolean;
}

function parseArgs(args: string[]): DeleteArgs {
  const result: DeleteArgs = { slug: '', force: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--force' || arg === '-f') {
      result.force = true;
    } else if (!arg.startsWith('-')) {
      result.slug = arg;
    }
  }

  return result;
}

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

export async function deleteCommand(args: string[]): Promise<void> {
  const parsed = parseArgs(args);

  if (!parsed.slug) {
    console.error('Error: slug is required');
    console.error('Usage: dropsites delete <slug> [--force]');
    process.exit(1);
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('Error: API key not found. Run `dropsites login` or set DROPSITES_API_KEY.');
    process.exit(1);
  }

  if (!parsed.force) {
    const confirmed = await confirm(`Delete deployment "${parsed.slug}"? This cannot be undone.`);
    if (!confirmed) {
      console.log('Cancelled.');
      return;
    }
  }

  const client = new DropSitesClient({
    apiKey,
    baseUrl: getBaseUrl(),
  });

  try {
    await client.delete(parsed.slug);
    console.log(`Deployment "${parsed.slug}" deleted.`);
  } catch (error) {
    if (error instanceof DropSitesError) {
      console.error(`Error: ${error.message} (${error.code})`);
    } else {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    }
    process.exit(1);
  }
}

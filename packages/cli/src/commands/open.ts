import { DropSitesClient } from '@dropsites/sdk';
import { getApiKey, getBaseUrl } from '../config.js';
import { exec } from 'node:child_process';
import { platform } from 'node:os';

interface OpenArgs {
  slug: string;
  namespace?: string;
  print: boolean;
}

function parseArgs(args: string[]): OpenArgs {
  const result: OpenArgs = { slug: '', print: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    switch (arg) {
      case '--namespace':
      case '-n':
        result.namespace = args[++i];
        break;
      case '--print':
        result.print = true;
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

function openUrl(url: string): void {
  const os = platform();
  const command =
    os === 'darwin' ? 'open' :
    os === 'win32' ? 'start' :
    'xdg-open';

  exec(`${command} ${url}`, (error) => {
    if (error) {
      console.error(`Could not open browser. Visit: ${url}`);
    }
  });
}

export async function openCommand(args: string[]): Promise<void> {
  const parsed = parseArgs(args);

  if (!parsed.slug) {
    console.error('Error: slug is required');
    console.error('Usage: dropsites open <slug> [--namespace <ns>] [--print]');
    process.exit(1);
  }

  const apiKey = getApiKey();
  const client = new DropSitesClient({
    apiKey: apiKey ?? 'unused',
    baseUrl: getBaseUrl(),
  });

  const url = client.open(parsed.slug, parsed.namespace);

  if (parsed.print) {
    console.log(url);
  } else {
    console.log(`Opening ${url}...`);
    openUrl(url);
  }
}

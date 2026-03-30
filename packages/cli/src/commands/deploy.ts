import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { DropSitesClient, DropSitesError } from '@dropsites/sdk';
import { getApiKey, getBaseUrl, getWorkspaceId } from '../config.js';

interface DeployArgs {
  file: string;
  slug?: string;
  workspaceId?: string;
  entryPath?: string;
  password?: string;
  expiresAt?: string;
}

function parseArgs(args: string[]): DeployArgs {
  const result: DeployArgs = { file: '' };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    switch (arg) {
      case '--slug':
      case '-s':
        result.slug = args[++i];
        break;
      case '--workspace':
      case '-w':
        result.workspaceId = args[++i];
        break;
      case '--entry-path':
        result.entryPath = args[++i];
        break;
      case '--password':
      case '-p':
        result.password = args[++i];
        break;
      case '--expires':
        result.expiresAt = args[++i];
        break;
      default:
        if (!arg.startsWith('-')) {
          result.file = arg;
        }
        break;
    }
  }

  return result;
}

export async function deployCommand(args: string[]): Promise<void> {
  const parsed = parseArgs(args);

  if (!parsed.file) {
    console.error('Error: file path is required');
    console.error('Usage: dropsites deploy <file> [--slug <slug>] [--workspace <id>]');
    process.exit(1);
  }

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

  const filePath = resolve(parsed.file);
  const fileBuffer = readFileSync(filePath);
  const blob = new Blob([fileBuffer]);

  const client = new DropSitesClient({
    apiKey,
    baseUrl: getBaseUrl(),
  });

  try {
    console.log(`Deploying ${basename(filePath)}...`);

    const deployment = await client.deploy({
      file: blob,
      workspaceId,
      slug: parsed.slug,
      entryPath: parsed.entryPath,
      password: parsed.password,
      expiresAt: parsed.expiresAt,
    });

    console.log('Deployed successfully!');
    console.log(`  Slug: ${deployment.slug}`);
    console.log(`  URL:  ${deployment.url}`);
    console.log(`  Size: ${formatBytes(deployment.storage_bytes)}`);
    console.log(`  Files: ${deployment.file_count}`);
  } catch (error) {
    if (error instanceof DropSitesError) {
      console.error(`Error: ${error.message} (${error.code})`);
    } else {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    }
    process.exit(1);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

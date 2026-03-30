#!/usr/bin/env node

import { deployCommand } from './commands/deploy.js';
import { listCommand } from './commands/list.js';
import { deleteCommand } from './commands/delete.js';
import { updateCommand } from './commands/update.js';
import { openCommand } from './commands/open.js';
import { loginCommand } from './commands/login.js';

const VERSION = '0.1.0';

const HELP = `
dropsites - Deploy and manage static sites from the terminal

Usage:
  dropsites <command> [options]

Commands:
  deploy <file>     Deploy a file or archive
  list              List deployments in a workspace
  get <slug>        Get deployment details (alias for open --print)
  update <slug>     Update deployment settings
  delete <slug>     Delete a deployment
  open <slug>       Open a deployment in the browser
  login             Save API key to config

Options:
  --help, -h        Show this help message
  --version, -v     Show version

Environment Variables:
  DROPSITES_API_KEY         API key (overrides config file)
  DROPSITES_BASE_URL        API base URL (overrides config file)
  DROPSITES_WORKSPACE_ID    Default workspace ID (overrides config file)

Examples:
  dropsites login --api-key ds_abc123
  dropsites deploy ./dist --workspace ws_123 --slug my-site
  dropsites list --workspace ws_123
  dropsites open my-site
  dropsites delete my-site --force
`.trim();

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const commandArgs = args.slice(1);

  if (!command || command === '--help' || command === '-h') {
    console.log(HELP);
    return;
  }

  if (command === '--version' || command === '-v') {
    console.log(`dropsites ${VERSION}`);
    return;
  }

  switch (command) {
    case 'deploy':
      await deployCommand(commandArgs);
      break;
    case 'list':
    case 'ls':
      await listCommand(commandArgs);
      break;
    case 'delete':
    case 'rm':
      await deleteCommand(commandArgs);
      break;
    case 'update':
      await updateCommand(commandArgs);
      break;
    case 'open':
      await openCommand(commandArgs);
      break;
    case 'get':
      await openCommand(['--print', ...commandArgs]);
      break;
    case 'login':
      await loginCommand(commandArgs);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run `dropsites --help` for usage.');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error instanceof Error ? error.message : error);
  process.exit(1);
});

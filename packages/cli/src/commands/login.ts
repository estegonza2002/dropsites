import { createInterface } from 'node:readline';
import { writeConfig, readConfig, getConfigFile } from '../config.js';

interface LoginArgs {
  apiKey?: string;
  baseUrl?: string;
  workspaceId?: string;
}

function parseArgs(args: string[]): LoginArgs {
  const result: LoginArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    switch (arg) {
      case '--api-key':
      case '-k':
        result.apiKey = args[++i];
        break;
      case '--base-url':
        result.baseUrl = args[++i];
        break;
      case '--workspace':
      case '-w':
        result.workspaceId = args[++i];
        break;
    }
  }

  return result;
}

async function prompt(message: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function loginCommand(args: string[]): Promise<void> {
  const parsed = parseArgs(args);

  let apiKey = parsed.apiKey;
  if (!apiKey) {
    apiKey = await prompt('Enter your API key: ');
  }

  if (!apiKey) {
    console.error('Error: API key is required.');
    process.exit(1);
  }

  const existing = readConfig();

  writeConfig({
    ...existing,
    apiKey,
    baseUrl: parsed.baseUrl ?? existing.baseUrl,
    defaultWorkspaceId: parsed.workspaceId ?? existing.defaultWorkspaceId,
  });

  console.log(`Configuration saved to ${getConfigFile()}`);
  console.log('You can now use DropSites CLI commands.');
}

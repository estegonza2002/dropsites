import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG_DIR = join(homedir(), '.dropsites');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface CliConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultWorkspaceId?: string;
}

/**
 * Read the CLI configuration from ~/.dropsites/config.json.
 */
export function readConfig(): CliConfig {
  try {
    if (!existsSync(CONFIG_FILE)) {
      return {};
    }
    const raw = readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw) as CliConfig;
  } catch {
    return {};
  }
}

/**
 * Write the CLI configuration to ~/.dropsites/config.json.
 */
export function writeConfig(config: CliConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

/**
 * Get a resolved config value, checking env vars first, then config file.
 */
export function getApiKey(): string | undefined {
  return process.env['DROPSITES_API_KEY'] ?? readConfig().apiKey;
}

/**
 * Get the base URL from env or config.
 */
export function getBaseUrl(): string | undefined {
  return process.env['DROPSITES_BASE_URL'] ?? readConfig().baseUrl;
}

/**
 * Get the default workspace ID from env or config.
 */
export function getWorkspaceId(): string | undefined {
  return process.env['DROPSITES_WORKSPACE_ID'] ?? readConfig().defaultWorkspaceId;
}

/**
 * Get the config directory path.
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}

/**
 * Get the config file path.
 */
export function getConfigFile(): string {
  return CONFIG_FILE;
}

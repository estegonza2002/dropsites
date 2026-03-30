import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * CLI E2E tests.
 *
 * These tests invoke the CLI entry point via ts-node/tsx and verify
 * output and exit codes. They do NOT require a running API server --
 * they test argument parsing, help output, and error handling for
 * missing configuration.
 *
 * For full integration tests with a live API, see the SDK integration tests.
 */

const CLI_ENTRY = resolve(__dirname, '../../../packages/cli/src/index.ts');

function runCli(args: string, env?: Record<string, string>): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`npx tsx ${CLI_ENTRY} ${args}`, {
      encoding: 'utf-8',
      env: { ...process.env, ...env },
      timeout: 10_000,
    });
    return { stdout, exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: (execError.stdout ?? '') + (execError.stderr ?? ''),
      exitCode: execError.status ?? 1,
    };
  }
}

describe('DropSites CLI — E2E', () => {
  it('should show help with --help flag', () => {
    const result = runCli('--help');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('dropsites');
    expect(result.stdout).toContain('deploy');
    expect(result.stdout).toContain('list');
    expect(result.stdout).toContain('delete');
    expect(result.stdout).toContain('update');
    expect(result.stdout).toContain('open');
    expect(result.stdout).toContain('login');
  });

  it('should show version with --version flag', () => {
    const result = runCli('--version');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('0.1.0');
  });

  it('should show help when no command is provided', () => {
    const result = runCli('');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage:');
  });

  it('should error on unknown command', () => {
    const result = runCli('foobar');
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Unknown command');
  });

  it('should error when deploying without a file', () => {
    const result = runCli('deploy', {
      DROPSITES_API_KEY: 'ds_test_key',
      DROPSITES_WORKSPACE_ID: 'ws_123',
    });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('file path is required');
  });

  it('should error when deploying without API key', () => {
    const result = runCli('deploy ./some-file.html', {
      DROPSITES_API_KEY: '',
      DROPSITES_WORKSPACE_ID: 'ws_123',
    });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('API key not found');
  });

  it('should error when listing without workspace ID', () => {
    const result = runCli('list', {
      DROPSITES_API_KEY: 'ds_test_key',
      DROPSITES_WORKSPACE_ID: '',
    });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('workspace ID is required');
  });

  it('should error when deleting without a slug', () => {
    const result = runCli('delete', {
      DROPSITES_API_KEY: 'ds_test_key',
    });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('slug is required');
  });

  it('should error when updating without a slug', () => {
    const result = runCli('update', {
      DROPSITES_API_KEY: 'ds_test_key',
    });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('slug is required');
  });

  it('should error when opening without a slug', () => {
    const result = runCli('open');
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('slug is required');
  });
});

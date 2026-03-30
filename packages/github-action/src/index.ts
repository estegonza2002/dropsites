/**
 * GitHub Action entry point for DropSites Deploy.
 *
 * This action deploys static sites to DropSites from GitHub Actions workflows.
 * It reads inputs from environment variables set by the GitHub Actions runner
 * and uses the DropSites SDK to perform the deployment.
 *
 * NOTE: In production this would use @actions/core for input/output handling.
 * This implementation uses environment variables directly for zero-dependency operation.
 */

import { readFileSync, statSync, existsSync, appendFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { execSync } from 'node:child_process';

// -- GitHub Actions helpers (lightweight, no @actions/core dependency) --

function getInput(name: string, required = false): string {
  const envKey = `INPUT_${name.replace(/-/g, '_').toUpperCase()}`;
  const value = process.env[envKey] ?? '';
  if (required && !value) {
    setFailed(`Input required and not supplied: ${name}`);
  }
  return value;
}

function setOutput(name: string, value: string): void {
  const filePath = process.env['GITHUB_OUTPUT'];
  if (filePath) {
    appendFileSync(filePath, `${name}=${value}\n`);
  }
}

function setFailed(message: string): never {
  console.error(`::error::${message}`);
  process.exit(1);
}

function info(message: string): void {
  console.log(message);
}

function _warning(message: string): void {
  console.log(`::warning::${message}`);
}

// -- Main action logic --

interface DeploymentResult {
  id: string;
  slug: string;
  url: string;
  storage_bytes: number;
  file_count: number;
}

async function run(): Promise<void> {
  try {
    const apiKey = getInput('api-key', true);
    const workspaceId = getInput('workspace-id', true);
    const deployPath = getInput('path', true);
    const slug = getInput('slug');
    const entryPath = getInput('entry-path');
    const password = getInput('password');
    const expiresAt = getInput('expires-at');
    const baseUrl = getInput('base-url') || 'https://dropsites.app/api/v1';

    const resolvedPath = resolve(deployPath);

    if (!existsSync(resolvedPath)) {
      setFailed(`Path does not exist: ${resolvedPath}`);
    }

    const stat = statSync(resolvedPath);
    let filePath: string;

    if (stat.isDirectory()) {
      // Create a tar.gz of the directory for upload
      info(`Archiving directory: ${resolvedPath}`);
      const archivePath = resolve(`/tmp/dropsites-deploy-${Date.now()}.tar.gz`);
      execSync(`tar -czf ${archivePath} -C ${resolvedPath} .`, { stdio: 'pipe' });
      filePath = archivePath;
    } else {
      filePath = resolvedPath;
    }

    info(`Deploying ${basename(filePath)} to DropSites...`);

    const fileBuffer = readFileSync(filePath);
    const blob = new Blob([fileBuffer]);

    // Build multipart form data
    const formData = new FormData();
    formData.append('file', blob, basename(filePath));
    formData.append('workspace_id', workspaceId);
    if (slug) formData.append('slug', slug);
    if (entryPath) formData.append('entry_path', entryPath);
    if (password) formData.append('password', password);
    if (expiresAt) formData.append('expires_at', expiresAt);

    const response = await fetch(`${baseUrl}/deployments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      setFailed(`Deployment failed (${response.status}): ${errorBody}`);
    }

    const deployment = (await response.json()) as DeploymentResult;

    info('Deployment successful!');
    info(`  Slug: ${deployment.slug}`);
    info(`  URL:  ${deployment.url}`);
    info(`  Size: ${deployment.storage_bytes} bytes`);
    info(`  Files: ${deployment.file_count}`);

    setOutput('slug', deployment.slug);
    setOutput('url', deployment.url);
    setOutput('deployment-id', deployment.id);
  } catch (error) {
    if (error instanceof Error && error.message.includes('process.exit')) {
      throw error;
    }
    setFailed(error instanceof Error ? error.message : 'Unknown error occurred');
  }
}

run();

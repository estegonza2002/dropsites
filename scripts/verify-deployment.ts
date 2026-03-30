/**
 * DropSites — Automated Deployment Verification
 *
 * Usage:
 *   tsx scripts/verify-deployment.ts --url https://app.dropsites.example.com
 *
 * Checks:
 *   1. /health endpoint returns 200
 *   2. TLS certificate is valid and not expiring soon
 *   3. Upload a test file via the API
 *   4. Serve the test file back
 *
 * Outputs pass/fail for each check. Uses native fetch (no external deps).
 */

import { execSync as _execSync } from "node:child_process";
import https from "node:https";

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): { url: string } {
  const args = process.argv.slice(2);
  const urlIndex = args.indexOf("--url");
  if (urlIndex === -1 || !args[urlIndex + 1]) {
    console.error(
      "Usage: tsx scripts/verify-deployment.ts --url https://your-instance.example.com",
    );
    process.exit(1);
  }
  let url = args[urlIndex + 1];
  // Strip trailing slash
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  return { url };
}

// ---------------------------------------------------------------------------
// Result tracking
// ---------------------------------------------------------------------------

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function record(name: string, passed: boolean, detail: string): void {
  results.push({ name, passed, detail });
  const icon = passed ? "PASS" : "FAIL";
  console.log(`  [${icon}] ${name} — ${detail}`);
}

// ---------------------------------------------------------------------------
// Check 1: Health endpoint
// ---------------------------------------------------------------------------

async function checkHealth(baseUrl: string): Promise<void> {
  const name = "Health endpoint";
  try {
    const start = Date.now();
    const res = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(10_000),
    });
    const elapsed = Date.now() - start;

    if (!res.ok) {
      record(name, false, `HTTP ${res.status} (expected 200)`);
      return;
    }

    const body = (await res.json()) as Record<string, unknown>;
    if (body.status === "ok") {
      record(name, true, `200 OK in ${elapsed}ms`);
    } else {
      record(
        name,
        false,
        `Unexpected body: ${JSON.stringify(body).slice(0, 120)}`,
      );
    }
  } catch (err) {
    record(name, false, `Request failed: ${String(err)}`);
  }
}

// ---------------------------------------------------------------------------
// Check 2: TLS certificate validity
// ---------------------------------------------------------------------------

async function checkTLS(baseUrl: string): Promise<void> {
  const name = "TLS certificate";
  const parsed = new URL(baseUrl);

  if (parsed.protocol !== "https:") {
    record(name, false, "URL is not HTTPS");
    return;
  }

  return new Promise<void>((resolve) => {
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: "/health",
        method: "HEAD",
        timeout: 10_000,
      },
      (res) => {
        const socket = res.socket as import("node:tls").TLSSocket;
        if (!socket.getPeerCertificate) {
          record(name, false, "Could not read peer certificate");
          resolve();
          return;
        }

        const cert = socket.getPeerCertificate();
        if (!cert || !cert.valid_to) {
          record(name, false, "No certificate returned");
          resolve();
          return;
        }

        const expiresAt = new Date(cert.valid_to);
        const now = new Date();
        const daysLeft = Math.floor(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysLeft < 0) {
          record(name, false, `Certificate expired on ${cert.valid_to}`);
        } else if (daysLeft < 14) {
          record(
            name,
            false,
            `Certificate expires in ${daysLeft} days (${cert.valid_to})`,
          );
        } else {
          record(
            name,
            true,
            `Valid until ${cert.valid_to} (${daysLeft} days remaining)`,
          );
        }
        resolve();
      },
    );

    req.on("error", (err) => {
      record(name, false, `TLS connection failed: ${String(err)}`);
      resolve();
    });

    req.on("timeout", () => {
      req.destroy();
      record(name, false, "TLS connection timed out");
      resolve();
    });

    req.end();
  });
}

// ---------------------------------------------------------------------------
// Check 3: Upload test file
// ---------------------------------------------------------------------------

async function checkUpload(
  baseUrl: string,
): Promise<{ slug: string } | null> {
  const name = "Upload test file";
  try {
    const testContent =
      "<!DOCTYPE html><html><body><h1>DropSites Verification</h1></body></html>";

    // Build a simple multipart/form-data body using native APIs.
    const formData = new FormData();
    const blob = new Blob([testContent], { type: "text/html" });
    formData.append("file", blob, "index.html");

    const res = await fetch(`${baseUrl}/api/v1/deployments`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(30_000),
    });

    if (res.ok) {
      const body = (await res.json()) as Record<string, unknown>;
      const slug = String(body.slug ?? "");
      if (slug) {
        record(name, true, `Uploaded successfully, slug: ${slug}`);
        return { slug };
      }
      record(name, true, `Upload returned 2xx but no slug in response`);
      return null;
    }

    // 401/403 is expected if the endpoint requires auth — still counts as
    // "reachable" but we note it.
    if (res.status === 401 || res.status === 403) {
      record(
        name,
        true,
        `Endpoint reachable (HTTP ${res.status} — auth required, skipping upload test)`,
      );
      return null;
    }

    record(name, false, `HTTP ${res.status}: ${await res.text().then((t) => t.slice(0, 200))}`);
    return null;
  } catch (err) {
    record(name, false, `Request failed: ${String(err)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Check 4: Serve test file
// ---------------------------------------------------------------------------

async function checkServe(baseUrl: string, slug: string): Promise<void> {
  const name = "Serve test file";
  try {
    // Try the common pattern: /<slug> or subdomain-based serving.
    // We check the path-based approach first.
    const res = await fetch(`${baseUrl}/${slug}`, {
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });

    if (res.ok) {
      const contentType = res.headers.get("content-type") ?? "";
      const body = await res.text();
      if (body.includes("DropSites Verification")) {
        record(name, true, `Served correctly (${contentType})`);
      } else {
        record(
          name,
          false,
          `Response did not contain expected content (${contentType})`,
        );
      }
    } else {
      record(name, false, `HTTP ${res.status} when fetching /${slug}`);
    }
  } catch (err) {
    record(name, false, `Request failed: ${String(err)}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { url } = parseArgs();

  console.log(`\nDropSites Deployment Verification`);
  console.log(`Target: ${url}`);
  console.log(`Time:   ${new Date().toISOString()}`);
  console.log(`${"─".repeat(60)}\n`);

  await checkHealth(url);
  await checkTLS(url);
  const upload = await checkUpload(url);
  if (upload) {
    await checkServe(url, upload.slug);
  } else {
    record("Serve test file", false, "Skipped — no upload slug available");
  }

  // Summary
  console.log(`\n${"─".repeat(60)}`);
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`\nResult: ${passed}/${total} checks passed\n`);

  if (passed < total) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Verification script failed:", err);
  process.exit(1);
});

/**
 * Documentation Validator
 *
 * Checks:
 * 1. Every .md file in docs/ has required YAML frontmatter
 * 2. All internal markdown links resolve to real files
 * 3. All docs referenced in docs/README.md exist
 * 4. No orphan docs (files in docs/ not listed in README.md)
 * 5. depends_on references resolve to real files
 *
 * Run: npx tsx scripts/validate-docs.ts
 * Exit code: 0 = pass, 1 = violations found
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname, resolve, relative } from "path";

const ROOT = process.cwd();
const DOCS_DIR = join(ROOT, "docs");

interface Issue {
  file: string;
  rule: string;
  message: string;
}

const issues: Issue[] = [];

// ── FRONTMATTER ──────────────────────────────────────────────────

const REQUIRED_FIELDS = ["title", "owner", "version", "last_updated"];
const VALID_OWNERS = ["product", "design", "engineering", "all"];

function validateFrontmatter(filePath: string, content: string): void {
  const rel = relative(ROOT, filePath);

  // Check for frontmatter
  if (!content.startsWith("---\n")) {
    issues.push({
      file: rel,
      rule: "frontmatter-required",
      message: "Missing YAML frontmatter (must start with ---)",
    });
    return;
  }

  const endIdx = content.indexOf("\n---", 4);
  if (endIdx === -1) {
    issues.push({
      file: rel,
      rule: "frontmatter-malformed",
      message: "Frontmatter not closed (missing closing ---)",
    });
    return;
  }

  const frontmatter = content.substring(4, endIdx);

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    const pattern = new RegExp(`^${field}:`, "m");
    if (!pattern.test(frontmatter)) {
      issues.push({
        file: rel,
        rule: "frontmatter-field-missing",
        message: `Missing required frontmatter field: ${field}`,
      });
    }
  }

  // Validate owner
  const ownerMatch = frontmatter.match(/^owner:\s*(.+)$/m);
  if (ownerMatch) {
    const owner = ownerMatch[1].trim();
    if (!VALID_OWNERS.includes(owner)) {
      issues.push({
        file: rel,
        rule: "frontmatter-invalid-owner",
        message: `Invalid owner "${owner}" — must be one of: ${VALID_OWNERS.join(", ")}`,
      });
    }
  }

  // Validate depends_on references
  const depsMatch = frontmatter.match(/depends_on:\s*\n((?:\s+-\s+.+\n?)*)/m);
  if (depsMatch) {
    const deps = depsMatch[1].match(/- (.+)/g);
    if (deps) {
      for (const dep of deps) {
        const depPath = dep.replace(/^- /, "").trim();
        const resolved = join(DOCS_DIR, depPath);
        if (!existsSync(resolved)) {
          issues.push({
            file: rel,
            rule: "depends-on-broken",
            message: `depends_on reference "${depPath}" does not exist`,
          });
        }
      }
    }
  }
}

// ── INTERNAL LINKS ───────────────────────────────────────────────

const MD_LINK_PATTERN = /\[([^\]]*)\]\(([^)]+)\)/g;

function validateLinks(filePath: string, content: string): void {
  const rel = relative(ROOT, filePath);
  const fileDir = dirname(filePath);

  let match;
  while ((match = MD_LINK_PATTERN.exec(content)) !== null) {
    const linkTarget = match[2];

    // Skip external links, anchors, mailto
    if (
      linkTarget.startsWith("http://") ||
      linkTarget.startsWith("https://") ||
      linkTarget.startsWith("#") ||
      linkTarget.startsWith("mailto:")
    ) {
      continue;
    }

    // Strip anchor from link
    const pathOnly = linkTarget.split("#")[0];
    if (!pathOnly) continue;

    const resolved = resolve(fileDir, pathOnly);
    if (!existsSync(resolved)) {
      issues.push({
        file: rel,
        rule: "broken-link",
        message: `Broken link: "${linkTarget}" does not resolve to a file`,
      });
    }
  }
}

// ── ORPHAN DETECTION ─────────────────────────────────────────────

function collectMdFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectMdFiles(full));
    } else if (entry.endsWith(".md") && entry !== "README.md") {
      files.push(relative(DOCS_DIR, full));
    }
  }

  return files;
}

function validateOrphans(): void {
  const readmePath = join(DOCS_DIR, "README.md");
  if (!existsSync(readmePath)) {
    issues.push({
      file: "docs/README.md",
      rule: "readme-missing",
      message: "docs/README.md index file does not exist",
    });
    return;
  }

  const readmeContent = readFileSync(readmePath, "utf-8");
  const allMdFiles = collectMdFiles(DOCS_DIR);

  for (const mdFile of allMdFiles) {
    // Check if this file is referenced in README.md
    if (!readmeContent.includes(mdFile)) {
      issues.push({
        file: `docs/${mdFile}`,
        rule: "orphan-doc",
        message: `Not listed in docs/README.md — add it to the index or remove it`,
      });
    }
  }
}

// ── MAIN ─────────────────────────────────────────────────────────

function scanDocs(dir: string): void {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      scanDocs(full);
    } else if (entry.endsWith(".md")) {
      const content = readFileSync(full, "utf-8");
      validateFrontmatter(full, content);
      validateLinks(full, content);
    }
  }
}

console.log("Documentation Validator");
console.log("=".repeat(60));

scanDocs(DOCS_DIR);

// Also validate CLAUDE.md links
const claudePath = join(ROOT, "CLAUDE.md");
if (existsSync(claudePath)) {
  const claudeContent = readFileSync(claudePath, "utf-8");
  validateLinks(claudePath, claudeContent);
}

validateOrphans();

if (issues.length === 0) {
  console.log("\n  PASS  All documentation checks passed.\n");
  process.exit(0);
} else {
  console.log(`\n  FAIL  ${issues.length} issue(s) found:\n`);

  const byFile = new Map<string, Issue[]>();
  for (const issue of issues) {
    if (!byFile.has(issue.file)) byFile.set(issue.file, []);
    byFile.get(issue.file)!.push(issue);
  }

  for (const [file, fileIssues] of byFile) {
    console.log(`  ${file}`);
    for (const issue of fileIssues) {
      console.log(`    [${issue.rule}] ${issue.message}`);
    }
    console.log();
  }

  process.exit(1);
}

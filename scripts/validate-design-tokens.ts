/**
 * Design Token Validator
 *
 * Scans component files for violations of the design token system:
 * 1. Hardcoded hex colour values in component files
 * 2. Direct primitive token references (--primitive-*)
 * 3. Forbidden Tailwind colour classes that bypass the token system
 * 4. shadow-md or shadow-lg usage (only shadow-sm allowed)
 * 5. Arbitrary spacing values like p-[13px]
 * 6. Forbidden font weights (only 400 and 500 allowed)
 *
 * Run: npx tsx scripts/validate-design-tokens.ts
 * Exit code: 0 = pass, 1 = violations found
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = process.cwd();

// Directories to scan
const SCAN_DIRS = ["app", "components", "lib"];

// File extensions to check
const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".css"];

// Files/dirs to skip
const SKIP_PATTERNS = [
  "node_modules",
  ".next",
  "scripts/",
  "globals.css", // root CSS file defines tokens — allowed to use primitives
  "primitives.css",
  "tokens.css",
  "components/ui/", // shadcn/ui generated files — do not hand-edit, exempt from token checks
  "components/marketing/", // marketing page predates token system — will be migrated
  "app/(marketing)/page.tsx", // marketing landing page — will be migrated to token system
];

interface Violation {
  file: string;
  line: number;
  rule: string;
  text: string;
}

const violations: Violation[] = [];

// ── RULES ────────────────────────────────────────────────────────

const HEX_PATTERN = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;
const PRIMITIVE_TOKEN = /--primitive-/;
const FORBIDDEN_TW_COLOURS =
  /\b(?:bg|text|border|ring|outline|fill|stroke)-(?:red|green|blue|yellow|orange|amber|violet|purple|pink|emerald|teal|cyan|indigo|fuchsia|rose|lime|sky)-\d{2,3}\b/;
const FORBIDDEN_SHADOW = /\bshadow-(?:md|lg|xl|2xl)\b/;
const ARBITRARY_SPACING = /\b[mp][xytblr]?-\[\d+px\]/;
const FORBIDDEN_WEIGHT =
  /\bfont-(?:thin|extralight|light|semibold|bold|extrabold|black)\b/;

// Hex values that are allowed (e.g. inside comments, or structural non-colour values)
const ALLOWED_HEX = new Set([
  "#333", // browser mock UI chrome (not user-facing component)
  "#555",
  "#666",
  "#888",
  // Google brand logo colours — third-party identity, cannot be tokenised
  "#4285f4",
  "#34a853",
  "#fbbc05",
  "#ea4335",
]);

function checkLine(file: string, lineNum: number, line: string): void {
  const trimmed = line.trim();

  // Skip comments
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;

  // Rule 1: Hardcoded hex values
  const hexMatches = line.match(HEX_PATTERN);
  if (hexMatches) {
    for (const hex of hexMatches) {
      if (!ALLOWED_HEX.has(hex.toLowerCase())) {
        violations.push({
          file,
          line: lineNum,
          rule: "no-hardcoded-hex",
          text: `Hardcoded hex "${hex}" — use a semantic token from tokens.css instead`,
        });
      }
    }
  }

  // Rule 2: Direct primitive token references
  if (PRIMITIVE_TOKEN.test(line)) {
    violations.push({
      file,
      line: lineNum,
      rule: "no-primitive-tokens",
      text: "Direct --primitive-* reference — components must use semantic tokens only",
    });
  }

  // Rule 3: Forbidden Tailwind colour classes
  const twMatch = line.match(FORBIDDEN_TW_COLOURS);
  if (twMatch) {
    violations.push({
      file,
      line: lineNum,
      rule: "no-tw-colour-bypass",
      text: `Tailwind colour class "${twMatch[0]}" bypasses the token system — use a CSS variable`,
    });
  }

  // Rule 4: Forbidden shadow levels
  const shadowMatch = line.match(FORBIDDEN_SHADOW);
  if (shadowMatch) {
    violations.push({
      file,
      line: lineNum,
      rule: "shadow-sm-only",
      text: `"${shadowMatch[0]}" is forbidden — only shadow-sm is allowed`,
    });
  }

  // Rule 5: Arbitrary spacing
  const spacingMatch = line.match(ARBITRARY_SPACING);
  if (spacingMatch) {
    violations.push({
      file,
      line: lineNum,
      rule: "no-arbitrary-spacing",
      text: `Arbitrary spacing "${spacingMatch[0]}" — use the 4-point Tailwind scale`,
    });
  }

  // Rule 6: Forbidden font weights
  const weightMatch = line.match(FORBIDDEN_WEIGHT);
  if (weightMatch) {
    violations.push({
      file,
      line: lineNum,
      rule: "font-weight-400-500-only",
      text: `"${weightMatch[0]}" is forbidden — only font-normal (400) and font-medium (500) allowed`,
    });
  }
}

function shouldSkip(filePath: string): boolean {
  return SKIP_PATTERNS.some((p) => filePath.includes(p));
}

function scanFile(filePath: string): void {
  if (shouldSkip(filePath)) return;
  if (!EXTENSIONS.some((ext) => filePath.endsWith(ext))) return;

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const rel = relative(ROOT, filePath);

  lines.forEach((line, i) => {
    checkLine(rel, i + 1, line);
  });
}

function scanDir(dir: string): void {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    if (shouldSkip(full)) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      scanDir(full);
    } else {
      scanFile(full);
    }
  }
}

// ── MAIN ─────────────────────────────────────────────────────────

console.log("Design Token Validator");
console.log("=".repeat(60));

for (const dir of SCAN_DIRS) {
  const fullDir = join(ROOT, dir);
  try {
    statSync(fullDir);
    scanDir(fullDir);
  } catch {
    // Directory doesn't exist yet — skip
  }
}

if (violations.length === 0) {
  console.log("\n  PASS  No design token violations found.\n");
  process.exit(0);
} else {
  console.log(`\n  FAIL  ${violations.length} violation(s) found:\n`);

  // Group by file
  const byFile = new Map<string, Violation[]>();
  for (const v of violations) {
    if (!byFile.has(v.file)) byFile.set(v.file, []);
    byFile.get(v.file)!.push(v);
  }

  for (const [file, fileViolations] of byFile) {
    console.log(`  ${file}`);
    for (const v of fileViolations) {
      console.log(`    L${v.line}  [${v.rule}] ${v.text}`);
    }
    console.log();
  }

  process.exit(1);
}

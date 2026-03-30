'use client';

import { useState } from 'react';

const CONFIG_SNIPPET = `{
  "mcpServers": {
    "dropsites": {
      "command": "npx",
      "args": ["-y", "@dropsites/mcp"],
      "env": {
        "DROPSITES_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}`;

export function CopyButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(CONFIG_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing silently
    }
  }

  return (
    <button onClick={handleCopy} className="ds-code-copy-btn" aria-label="Copy config snippet">
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

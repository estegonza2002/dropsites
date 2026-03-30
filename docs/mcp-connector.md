---
title: MCP Connector Setup Guide
owner: engineering
version: "1.0"
last_updated: 2026-03-30
depends_on: []
---

# DropSites MCP Connector

Connect DropSites to Claude Desktop or claude.ai so Claude can publish, list, update, and delete your static site deployments using natural language commands.

---

## Introduction

The `@dropsites/mcp` package is a [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes your DropSites account as a set of tools that Claude can call on your behalf. Once configured, you can say things like:

- _"Deploy the React build in ~/projects/my-app/dist"_
- _"List all my active deployments"_
- _"Update my-site with the latest build from ./dist"_
- _"Delete the old staging deployment"_

Claude handles the zip, upload, and confirmation — you just describe what you want.

---

## Prerequisites

- A DropSites account — [sign up free](https://dropsites.app/signup)
- An API key — go to **Dashboard → Settings → API Keys** and create one
- Node.js 20 or later — [download from nodejs.org](https://nodejs.org/)

---

## Section A — Claude Desktop Setup

### 1. Locate your Claude Desktop config file

| Platform | Path |
|----------|------|
| macOS    | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows  | `%APPDATA%\Claude\claude_desktop_config.json` |

If the file does not exist, create it.

### 2. Add the DropSites server block

Open the file and add (or merge) the following:

```json
{
  "mcpServers": {
    "dropsites": {
      "command": "npx",
      "args": ["-y", "@dropsites/mcp"],
      "env": {
        "DROPSITES_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

Replace `YOUR_API_KEY_HERE` with the API key you created in the prerequisites step.

> **Note:** If you already have other entries under `"mcpServers"`, add the `"dropsites"` block alongside them — do not replace the entire file.

### 3. Restart Claude Desktop

Fully quit and relaunch Claude Desktop (Cmd+Q on macOS, not just close the window).

### 4. Verify the connection

Open a new conversation in Claude Desktop and type:

> "List my DropSites deployments"

Claude should respond with your deployment list (or an empty list if you have none yet). If you see a tool error, check the troubleshooting section below.

---

## Section B — claude.ai Web Interface Setup

### 1. Open Integrations settings

Go to [claude.ai](https://claude.ai) → **Settings** → **Integrations** → **Add custom connector**.

### 2. Enter the connector details

| Field | Value |
|-------|-------|
| **Server URL** | `https://mcp.dropsites.app` |
| **Auth method** | API key header |
| **Header name** | `Authorization` |
| **Header value** | `Bearer YOUR_API_KEY_HERE` |

Replace `YOUR_API_KEY_HERE` with your DropSites API key.

### 3. Save and verify

Click **Save**. Start a new conversation and type:

> "List my DropSites deployments"

You should see your deployment list in the response.

---

## Section C — Tool Reference

| Tool | Description | Required Inputs | Example Prompt |
|------|-------------|-----------------|----------------|
| `deploy_site` | Deploy a local file or directory | `path` | "Deploy the React app in ~/projects/my-app/dist" |
| `list_sites` | List your deployments | none | "List all my active deployments" |
| `delete_site` | Delete a deployment | `slug` | "Delete the old staging deployment" |
| `update_site` | Replace deployment content | `slug`, `path` | "Update my-site with the latest build from ./dist" |

### Input details

**`deploy_site`**
- `path` — absolute or relative path to a file or directory to deploy
- `slug` _(optional)_ — custom URL slug; auto-generated if omitted
- `workspace_id` _(optional)_ — deploy to a specific workspace

**`list_sites`**
- No inputs required; returns all deployments in your default workspace

**`delete_site`**
- `slug` — the deployment slug (the part after `dropsites.app/`)

**`update_site`**
- `slug` — the deployment to update
- `path` — path to the new content (replaces existing files)

---

## Section D — Example Prompts

Copy any of these into Claude:

```
Deploy the React app in my ~/projects/my-app/dist folder
```

```
List all my active deployments and show me their URLs
```

```
Update my-site with the latest build from ./dist — keep the same URL
```

```
Delete the old staging deployment called "staging-v2"
```

```
Deploy the file at ~/Desktop/report.html with the slug "q1-report"
```

```
Deploy everything in ./build and send me the link when done
```

---

## Section E — Troubleshooting

### "API key not found" or authentication error

- Confirm `DROPSITES_API_KEY` is spelled exactly right in the config
- Check that the API key is active: **Dashboard → Settings → API Keys**
- Make sure there are no extra spaces or quotes around the key value

### "`npx` not found" or "command not found"

- Install Node.js 20 or later from [nodejs.org](https://nodejs.org/)
- After installing, fully restart Claude Desktop (not just the window)
- Verify Node.js is installed: open Terminal and run `node --version`

### "Quota exceeded" error

- Your plan's deployment limit has been reached
- Upgrade your plan at [dropsites.app/pricing](https://dropsites.app/pricing)
- Or delete unused deployments to free up slots

### Deploy fails silently or returns an empty response

- Free tier: maximum 10 MB per deployment
- Supported formats: HTML, ZIP, JS, PDF, and any browser-renderable static content
- Check file size and confirm the path exists on your machine

### Claude doesn't show DropSites tools

- Restart Claude Desktop completely (Cmd+Q, not just close)
- Confirm the JSON in `claude_desktop_config.json` is valid (no trailing commas)
- Validate your JSON at [jsonlint.com](https://jsonlint.com)

### Connection works in Claude Desktop but not claude.ai

- The `https://mcp.dropsites.app` endpoint is separate from the local `npx` server
- Confirm the `Authorization: Bearer ...` header is set correctly in Integrations settings
- Try regenerating your API key and updating the header value

---

## Getting help

- [DropSites documentation](https://dropsites.app/docs)
- [Status page](https://dropsites.app/status)
- Email support: help@dropsites.app

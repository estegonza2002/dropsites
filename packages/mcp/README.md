# @dropsites/mcp

MCP server for DropSites — deploy static sites directly from Claude Desktop and claude.ai.

## Quick Start

### 1. Get an API key

Visit [https://dropsites.app/dashboard/settings/api-keys](https://dropsites.app/dashboard/settings/api-keys) to generate an API key.

### 2. Configure Claude Desktop

Add the following to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dropsites": {
      "command": "npx",
      "args": ["-y", "@dropsites/mcp"],
      "env": {
        "DROPSITES_API_KEY": "ds_your_api_key_here"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

After saving the config, restart Claude Desktop. You can now ask Claude to deploy sites for you.

**Example prompts:**
- *"Deploy the files in ~/my-project to DropSites"*
- *"List my DropSites deployments"*
- *"Delete the deployment with slug my-old-site"*
- *"Update the site my-site with the latest build from ~/my-project/dist"*

---

## Tool Reference

### `deploy_site`

Deploy a local file or directory to DropSites and get a shareable URL.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Local filesystem path to a file or directory |
| `slug` | string | No | Desired URL slug — auto-generated if omitted |
| `workspace_id` | string | No | Target workspace ID — defaults to personal workspace |
| `title` | string | No | Human-readable label for this deployment |

**Returns:** JSON with `url`, `slug`, `created_at`, `size_bytes`

---

### `list_sites`

List your DropSites deployments.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `workspace_id` | string | No | Workspace ID to list deployments for |
| `limit` | number | No | Maximum number of results to return (default: 20) |

**Returns:** JSON with `sites` array (each with `slug`, `url`, `created_at`, `status`) and `total` count

---

### `delete_site`

Delete a DropSites deployment permanently. This action cannot be undone.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | Yes | Slug of the deployment to delete |

**Returns:** Confirmation message

---

### `update_site`

Replace the content of an existing DropSites deployment with new files.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | Yes | Slug of the deployment to update |
| `path` | string | Yes | Local filesystem path to the new file or directory |

**Returns:** JSON with `url`, `slug`, `updated_at`

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DROPSITES_API_KEY` | Yes | Your DropSites API key (get one at the dashboard) |
| `DROPSITES_BASE_URL` | No | Override the API base URL (default: `https://dropsites.app/api/v1`) |

## License

MIT

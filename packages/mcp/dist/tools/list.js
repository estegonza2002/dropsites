export async function listTool(client, input, defaultWorkspaceId) {
    try {
        const workspaceId = input.workspace_id ?? defaultWorkspaceId;
        const result = await client.list({
            workspaceId,
            perPage: input.limit ?? 20,
        });
        const sites = result.data.map((d) => ({
            slug: d.slug,
            url: client.open(d.slug),
            created_at: d.created_at,
            status: d.is_disabled ? 'disabled' : 'active',
        }));
        return {
            content: [{ type: 'text', text: JSON.stringify({ sites, total: result.total }, null, 2) }],
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { content: [{ type: 'text', text: `Error: ${message}` }] };
    }
}
//# sourceMappingURL=list.js.map
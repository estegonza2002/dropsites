export async function deleteTool(client, input) {
    try {
        await client.delete(input.slug);
        return {
            content: [{ type: 'text', text: `Deployment "${input.slug}" deleted successfully.` }],
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        if (message.includes('404') || message.includes('not found')) {
            return { content: [{ type: 'text', text: `Error: Deployment "${input.slug}" not found.` }] };
        }
        return { content: [{ type: 'text', text: `Error: ${message}` }] };
    }
}
//# sourceMappingURL=delete.js.map
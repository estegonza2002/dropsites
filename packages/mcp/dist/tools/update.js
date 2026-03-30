import archiver from 'archiver';
import { stat } from 'node:fs/promises';
async function zipDirectory(dirPath) {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 9 } });
        const chunks = [];
        archive.on('data', (chunk) => chunks.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(chunks)));
        archive.on('error', reject);
        archive.directory(dirPath, false);
        archive.finalize();
    });
}
export async function updateTool(client, input, defaultWorkspaceId, apiKey, baseUrl) {
    try {
        let fileStat;
        try {
            fileStat = await stat(input.path);
        }
        catch {
            return { content: [{ type: 'text', text: `Error: Path not found: ${input.path}` }] };
        }
        let fileBuffer;
        if (fileStat.isDirectory()) {
            fileBuffer = await zipDirectory(input.path);
        }
        else {
            const { default: fs } = await import('node:fs/promises');
            fileBuffer = await fs.readFile(input.path);
        }
        // Attempt PATCH /deployments/:slug to replace content
        const formData = new FormData();
        formData.append('file', new Blob([fileBuffer]));
        const response = await fetch(`${baseUrl}/deployments/${encodeURIComponent(input.slug)}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: formData,
        });
        if (!response.ok) {
            // Fallback: re-deploy with same slug to overwrite
            const deployment = await client.deploy({
                file: new Blob([fileBuffer]),
                workspaceId: defaultWorkspaceId,
                slug: input.slug,
            });
            const url = client.open(deployment.slug);
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify({ url, slug: deployment.slug, updated_at: deployment.updated_at }, null, 2),
                    }],
            };
        }
        const deployment = await response.json();
        const url = client.open(deployment.slug);
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({ url, slug: deployment.slug, updated_at: deployment.updated_at }, null, 2),
                }],
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { content: [{ type: 'text', text: `Error: ${message}` }] };
    }
}
//# sourceMappingURL=update.js.map
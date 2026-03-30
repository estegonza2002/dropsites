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
async function readFile(filePath) {
    const { default: fs } = await import('node:fs/promises');
    return fs.readFile(filePath);
}
export async function deployTool(client, input, defaultWorkspaceId) {
    try {
        let fileStat;
        try {
            fileStat = await stat(input.path);
        }
        catch {
            return {
                content: [{ type: 'text', text: `Error: Path not found: ${input.path}` }],
            };
        }
        let fileBuffer;
        if (fileStat.isDirectory()) {
            fileBuffer = await zipDirectory(input.path);
        }
        else {
            fileBuffer = await readFile(input.path);
        }
        const workspaceId = input.workspace_id ?? defaultWorkspaceId;
        const blob = new Blob([fileBuffer]);
        const deployment = await client.deploy({
            file: blob,
            workspaceId,
            slug: input.slug,
        });
        const url = client.open(deployment.slug);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        url,
                        slug: deployment.slug,
                        created_at: deployment.created_at,
                        size_bytes: deployment.storage_bytes,
                    }, null, 2),
                },
            ],
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { content: [{ type: 'text', text: `Error: ${message}` }] };
    }
}
//# sourceMappingURL=deploy.js.map
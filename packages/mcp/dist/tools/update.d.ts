import { DropSitesClient } from '@dropsites/sdk';
export interface UpdateToolInput {
    slug: string;
    path: string;
}
export declare function updateTool(client: DropSitesClient, input: UpdateToolInput, defaultWorkspaceId: string, apiKey: string, baseUrl: string): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
}>;
//# sourceMappingURL=update.d.ts.map
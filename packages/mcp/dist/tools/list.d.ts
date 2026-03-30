import { DropSitesClient } from '@dropsites/sdk';
export interface ListToolInput {
    workspace_id?: string;
    limit?: number;
}
export declare function listTool(client: DropSitesClient, input: ListToolInput, defaultWorkspaceId: string): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
}>;
//# sourceMappingURL=list.d.ts.map
import { DropSitesClient } from '@dropsites/sdk';
export interface DeployToolInput {
    path: string;
    slug?: string;
    workspace_id?: string;
    title?: string;
}
export declare function deployTool(client: DropSitesClient, input: DeployToolInput, defaultWorkspaceId: string): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
}>;
//# sourceMappingURL=deploy.d.ts.map
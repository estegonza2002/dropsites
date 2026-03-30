import { DropSitesClient } from '@dropsites/sdk';
export interface DeleteToolInput {
    slug: string;
}
export declare function deleteTool(client: DropSitesClient, input: DeleteToolInput): Promise<{
    content: Array<{
        type: 'text';
        text: string;
    }>;
}>;
//# sourceMappingURL=delete.d.ts.map
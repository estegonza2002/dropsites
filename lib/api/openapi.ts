/**
 * OpenAPI 3.1 specification for the DropSites REST API v1.
 *
 * This spec is served at /api/docs and rendered by the docs page.
 */
export function getOpenApiSpec() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'DropSites API',
      version: '1.0.0',
      description:
        'REST API for managing deployments, API keys, and workspaces on DropSites.',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    security: [{ BearerAuth: [] }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'API key with ds_ prefix',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
              required: ['code', 'message'],
            },
          },
          required: ['error'],
        },
        PaginatedMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            per_page: { type: 'integer' },
            total: { type: 'integer' },
            total_pages: { type: 'integer' },
          },
          required: ['page', 'per_page', 'total', 'total_pages'],
        },
        Deployment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            slug: { type: 'string' },
            namespace: { type: 'string', nullable: true },
            entry_path: { type: 'string' },
            file_count: { type: 'integer' },
            storage_bytes: { type: 'integer' },
            is_disabled: { type: 'boolean' },
            allow_indexing: { type: 'boolean' },
            auto_nav_enabled: { type: 'boolean' },
            total_views: { type: 'integer' },
            expires_at: { type: 'string', format: 'date-time', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        ApiKey: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            prefix: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            last_used_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            expires_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            revoked_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },
      },
    },
    paths: {
      '/deployments': {
        get: {
          summary: 'List deployments',
          operationId: 'listDeployments',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'per_page', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
            { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search by slug' },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'archived', 'disabled'] } },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['created', 'updated', 'name'] } },
          ],
          responses: {
            '200': {
              description: 'Paginated list of deployments',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Deployment' },
                      },
                      meta: { $ref: '#/components/schemas/PaginatedMeta' },
                    },
                  },
                },
              },
            },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        post: {
          summary: 'Create a new deployment',
          operationId: 'createDeployment',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: { type: 'string', format: 'binary' },
                    slug: { type: 'string' },
                  },
                  required: ['file'],
                },
              },
            },
          },
          responses: {
            '201': { description: 'Deployment created', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Deployment' } } } } } },
            '400': { description: 'Bad request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/deployments/{slug}': {
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        get: {
          summary: 'Get deployment details',
          operationId: 'getDeployment',
          responses: {
            '200': { description: 'Deployment details', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Deployment' } } } } } },
            '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            '410': { description: 'Deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        put: {
          summary: 'Overwrite deployment content',
          operationId: 'overwriteDeployment',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: { file: { type: 'string', format: 'binary' } },
                  required: ['file'],
                },
              },
            },
          },
          responses: {
            '200': { description: 'Deployment overwritten' },
            '403': { description: 'Forbidden' },
            '404': { description: 'Not found' },
          },
        },
        patch: {
          summary: 'Update deployment metadata',
          operationId: 'updateDeployment',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    slug: { type: 'string' },
                    allow_indexing: { type: 'boolean' },
                    auto_nav_enabled: { type: 'boolean' },
                    expires_at: { type: 'string', format: 'date-time', nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Deployment updated' },
            '400': { description: 'Bad request' },
            '409': { description: 'Slug conflict' },
          },
        },
        delete: {
          summary: 'Delete (archive) a deployment',
          operationId: 'deleteDeployment',
          responses: {
            '204': { description: 'Deployment deleted' },
            '403': { description: 'Forbidden' },
            '404': { description: 'Not found' },
          },
        },
      },
      '/api-keys': {
        get: {
          summary: 'List API keys',
          operationId: 'listApiKeys',
          responses: {
            '200': {
              description: 'List of API keys',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/ApiKey' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: 'Generate a new API key',
          operationId: 'createApiKey',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', maxLength: 100 },
                    expires_at: { type: 'string', format: 'date-time', nullable: true },
                  },
                  required: ['name'],
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'API key created (full key shown once)',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        allOf: [
                          { $ref: '#/components/schemas/ApiKey' },
                          {
                            type: 'object',
                            properties: { key: { type: 'string', description: 'Full key — shown only once' } },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api-keys/{keyId}': {
        parameters: [
          { name: 'keyId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        patch: {
          summary: 'Update API key',
          operationId: 'updateApiKey',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    expires_at: { type: 'string', format: 'date-time', nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'API key updated' },
            '400': { description: 'Bad request' },
            '404': { description: 'Not found' },
          },
        },
        delete: {
          summary: 'Revoke API key',
          operationId: 'revokeApiKey',
          responses: {
            '204': { description: 'API key revoked' },
            '404': { description: 'Not found' },
          },
        },
      },
    },
  }
}

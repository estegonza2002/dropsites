import { spawn, ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';

export interface McpRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

export interface McpResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

export class McpTestClient {
  private process: ChildProcess;
  private pendingRequests = new Map<
    number,
    { resolve: (v: McpResponse) => void; reject: (e: Error) => void }
  >();
  private nextId = 1;
  private readline;

  constructor(env?: Record<string, string>) {
    this.process = spawn('node', ['packages/mcp/dist/index.js'], {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: '/Users/gonzalefam/Documents/dropsites-system/dropsites',
    });

    this.readline = createInterface({ input: this.process.stdout! });
    this.readline.on('line', (line) => {
      try {
        const response = JSON.parse(line) as McpResponse;
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          this.pendingRequests.delete(response.id);
          pending.resolve(response);
        }
      } catch {
        // ignore non-JSON lines
      }
    });
  }

  async send(method: string, params?: Record<string, unknown>): Promise<McpResponse> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      const message = JSON.stringify({ jsonrpc: '2.0', id, method, params });
      this.process.stdin!.write(message + '\n');
    });
  }

  kill() {
    this.process.kill();
    this.readline.close();
  }
}

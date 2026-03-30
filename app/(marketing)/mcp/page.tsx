import type { Metadata } from 'next';
import Link from 'next/link';
import { CopyButton } from './copy-button';

export const metadata: Metadata = {
  title: 'MCP Connector — DropSites × Claude',
  description:
    'Connect DropSites to Claude Desktop or claude.ai. Say "deploy this" and your site is live in seconds.',
  openGraph: {
    title: 'DropSites × Claude — Deploy sites from Claude Desktop',
    description:
      'Connect DropSites to Claude Desktop or claude.ai. Say "deploy this" and your site is live in seconds.',
    url: 'https://dropsites.app/mcp',
  },
};

const tools = [
  {
    name: 'deploy_site',
    description: 'Deploy a local file or directory as a new DropSites deployment',
    inputs: 'path',
    prompt: '"Deploy the React app in ~/projects/my-app/dist"',
  },
  {
    name: 'list_sites',
    description: 'List all deployments in your workspace',
    inputs: 'none',
    prompt: '"List all my active deployments"',
  },
  {
    name: 'delete_site',
    description: 'Permanently delete a deployment by slug',
    inputs: 'slug',
    prompt: '"Delete the old staging deployment"',
  },
  {
    name: 'update_site',
    description: 'Replace an existing deployment\'s content with new files',
    inputs: 'slug, path',
    prompt: '"Update my-site with the latest build from ./dist"',
  },
];

export default function McpPage() {
  return (
    <div className="ds">
      {/* ── NAV ──────────────────────────────────────────────────── */}
      <nav className="ds-nav">
        <Link href="/" className="ds-nav-logo">Drop<span>Sites</span></Link>
        <ul className="ds-nav-links">
          <li><Link href="/#how">How it works</Link></li>
          <li><Link href="/#features">Features</Link></li>
          <li><Link href="/#pricing">Pricing</Link></li>
          <li><Link href="/#enterprise">Enterprise</Link></li>
        </ul>
        <div className="ds-nav-ctas">
          <Link href="/login" className="btn btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn btn-primary">
            Start free
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 7h8M8 3l4 4-4 4" /></svg>
          </Link>
        </div>
        <button className="btn btn-ghost ds-nav-mobile">Menu</button>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="ds-hero">
        <div className="ds-hero-badge fade-up">
          <div className="ds-hero-badge-dot" />
          MCP Connector — now available
        </div>
        <div className="ds-mcp-ai-badge fade-up">
          <span>⚡</span> Works with Claude Desktop &amp; claude.ai
        </div>
        <h1 className="ds-hero-h1 fade-up-2">
          Let Claude publish<br />
          <em>your sites.</em>
        </h1>
        <p className="ds-hero-sub fade-up-3">
          Connect DropSites to Claude Desktop or claude.ai. Say{' '}
          <em style={{ fontStyle: 'normal', color: 'var(--text-1)', fontWeight: 500 }}>&ldquo;deploy this&rdquo;</em>{' '}
          and your site is live in seconds.
        </p>
        <div className="ds-hero-ctas fade-up-3">
          <Link href="/dashboard/settings/api-keys" className="btn btn-primary-lg">
            Get your API key
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
          </Link>
          <Link href="/docs/mcp-connector" className="btn btn-ghost-lg">Read the full guide</Link>
        </div>
        <div className="ds-hero-note fade-up-3">
          <svg viewBox="0 0 12 12" fill="currentColor"><path d="M5 10l-3-3 1.4-1.4L5 7.2l4.6-4.6L11 4z" /></svg>
          Free to use · Works with any DropSites plan · No extra setup
        </div>
      </section>

      {/* ── PROOF BAR ────────────────────────────────────────────── */}
      <div className="ds-proof-bar">
        <div className="ds-proof-item">
          <span className="ds-proof-num">npx</span>
          <span className="ds-proof-label">Zero install</span>
        </div>
        <div className="ds-proof-div" />
        <div className="ds-proof-item">
          <span className="ds-proof-num">&lt; 60s</span>
          <span className="ds-proof-label">Setup time</span>
        </div>
        <div className="ds-proof-div" />
        <div className="ds-proof-item">
          <span className="ds-proof-num">4</span>
          <span className="ds-proof-label">Tools available</span>
        </div>
        <div className="ds-proof-div" />
        <div className="ds-proof-item">
          <span className="ds-proof-num">Natural language</span>
          <span className="ds-proof-label">No commands to remember</span>
        </div>
      </div>

      {/* ── THREE STEPS ──────────────────────────────────────────── */}
      <section className="ds-section ds-section-center" id="setup">
        <div className="ds-eyebrow">Setup</div>
        <h2 className="ds-h2">Set up in 3 steps.</h2>
        <p className="ds-sub">No daemon to run, no package to install globally. Just a config entry and an API key.</p>
        <div className="ds-how-grid">
          <div className="ds-how-card">
            <div className="ds-how-num">01</div>
            <div className="ds-how-title">Get your API key</div>
            <div className="ds-how-body">
              Go to <strong>Dashboard → Settings → API Keys</strong> and create a new key. Copy it — you&apos;ll paste it in the next step.
            </div>
            <div className="ds-how-connector">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 10h12M12 5l5 5-5 5" /></svg>
            </div>
          </div>
          <div className="ds-how-card">
            <div className="ds-how-num">02</div>
            <div className="ds-how-title">Add to Claude config</div>
            <div className="ds-how-body">
              Paste the <code style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 12, color: 'var(--accent)', background: 'var(--accent-s)', padding: '1px 5px', borderRadius: 4 }}>mcpServers</code> block into your{' '}
              <code style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 12, color: 'var(--text-2)' }}>claude_desktop_config.json</code>.
              The snippet is below — copy it with one click.
            </div>
            <div className="ds-how-connector">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 10h12M12 5l5 5-5 5" /></svg>
            </div>
          </div>
          <div className="ds-how-card">
            <div className="ds-how-num">03</div>
            <div className="ds-how-title">Say &ldquo;deploy this&rdquo;</div>
            <div className="ds-how-body">
              Restart Claude Desktop and ask it to deploy a folder or file. Claude zips and uploads your content automatically — no commands to remember.
            </div>
          </div>
        </div>
      </section>

      {/* ── CODE SNIPPET ─────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 clamp(20px, 5vw, 64px) 80px' }}>
        <div className="ds-code-block">
          <div className="ds-code-block-bar">
            <span className="ds-code-block-label">claude_desktop_config.json</span>
            <CopyButton />
          </div>
          <pre className="ds-code-pre" aria-label="MCP server configuration snippet">
            <span className="ds-code-punct">{'{'}</span>{'\n'}
            {'  '}<span className="ds-code-key">&quot;mcpServers&quot;</span><span className="ds-code-punct">: {'{'}</span>{'\n'}
            {'    '}<span className="ds-code-key">&quot;dropsites&quot;</span><span className="ds-code-punct">: {'{'}</span>{'\n'}
            {'      '}<span className="ds-code-key">&quot;command&quot;</span><span className="ds-code-punct">:</span> <span className="ds-code-str">&quot;npx&quot;</span><span className="ds-code-punct">,</span>{'\n'}
            {'      '}<span className="ds-code-key">&quot;args&quot;</span><span className="ds-code-punct">:</span> <span className="ds-code-punct">[</span><span className="ds-code-str">&quot;-y&quot;</span><span className="ds-code-punct">,</span> <span className="ds-code-str">&quot;@dropsites/mcp&quot;</span><span className="ds-code-punct">],</span>{'\n'}
            {'      '}<span className="ds-code-key">&quot;env&quot;</span><span className="ds-code-punct">: {'{'}</span>{'\n'}
            {'        '}<span className="ds-code-key">&quot;DROPSITES_API_KEY&quot;</span><span className="ds-code-punct">:</span> <span className="ds-code-str">&quot;YOUR_API_KEY_HERE&quot;</span>{'\n'}
            {'      '}<span className="ds-code-punct">{'}'}</span>{'\n'}
            {'    '}<span className="ds-code-punct">{'}'}</span>{'\n'}
            {'  '}<span className="ds-code-punct">{'}'}</span>{'\n'}
            <span className="ds-code-punct">{'}'}</span>
          </pre>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 12, textAlign: 'center' }}>
          Config file location: <code style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 12 }}>~/Library/Application Support/Claude/claude_desktop_config.json</code> on macOS ·{' '}
          <code style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 12 }}>%APPDATA%\Claude\claude_desktop_config.json</code> on Windows
        </p>
      </div>

      {/* ── TOOL REFERENCE ───────────────────────────────────────── */}
      <section className="ds-section ds-section-center">
        <div className="ds-eyebrow">Tools</div>
        <h2 className="ds-h2">What Claude can do</h2>
        <p className="ds-sub" style={{ marginBottom: 40 }}>
          Four tools, invoked by natural language. No syntax to remember.
        </p>
        <div className="ds-tool-table-wrap">
          <table className="ds-tool-table">
            <thead>
              <tr>
                <th>Tool</th>
                <th>Description</th>
                <th>Required Inputs</th>
                <th>Example Prompt</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((tool) => (
                <tr key={tool.name}>
                  <td><code>{tool.name}</code></td>
                  <td>{tool.description}</td>
                  <td>
                    <code>{tool.inputs}</code>
                  </td>
                  <td className="ds-tool-prompt">{tool.prompt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 16 }}>
          <Link href="/docs/mcp-connector#tools" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
            Full tool reference with all optional inputs →
          </Link>
        </p>
      </section>

      {/* ── EXAMPLE PROMPTS ──────────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '80px clamp(20px, 5vw, 64px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <div className="ds-eyebrow">Example prompts</div>
          <h2 className="ds-h2">Just describe what you want</h2>
          <p className="ds-sub">These are real prompts you can paste into Claude right now.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, textAlign: 'left', marginTop: 40 }}>
            {[
              'Deploy the React app in my ~/projects/my-app/dist folder',
              'List all my active deployments and show me their URLs',
              'Update my-site with the latest build from ./dist — keep the same URL',
              'Delete the old staging deployment called "staging-v2"',
              'Deploy the file at ~/Desktop/report.html with the slug "q1-report"',
              'Deploy everything in ./build and send me the link when done',
            ].map((prompt) => (
              <div
                key={prompt}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-lg)',
                  padding: '14px 16px',
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: 13,
                  color: 'var(--text-2)',
                  lineHeight: 1.55,
                }}
              >
                <span style={{ color: 'var(--accent)', marginRight: 8 }}>›</span>
                {prompt}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FINAL CTA ────────────────────────────────────────────── */}
      <div className="ds-final-cta">
        <h2>Ready to connect?</h2>
        <p>Get your free API key from the dashboard and start deploying with natural language in under a minute.</p>
        <div className="ds-hero-ctas">
          <Link href="/dashboard/settings/api-keys" className="btn btn-primary-lg">
            Get your free API key
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
          </Link>
          <Link href="/docs/mcp-connector" className="btn btn-ghost-lg">View full documentation</Link>
        </div>
        <p className="ds-final-cta-note">Free tier · No credit card · Works with Claude Desktop and claude.ai</p>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="ds-footer">
        <div>
          <div className="ds-footer-logo">Drop<span>Sites</span></div>
          <div className="ds-footer-tagline">The last mile for AI-generated HTML and static deliverables.</div>
        </div>
        <div className="ds-footer-col">
          <h4>Product</h4>
          <ul>
            <li><Link href="/#features">Features</Link></li>
            <li><Link href="/#pricing">Pricing</Link></li>
            <li><Link href="/changelog">Changelog</Link></li>
            <li><Link href="/roadmap">Roadmap</Link></li>
            <li><Link href="/status">Status</Link></li>
          </ul>
        </div>
        <div className="ds-footer-col">
          <h4>Developers</h4>
          <ul>
            <li><Link href="/docs">Documentation</Link></li>
            <li><Link href="/docs/api">API reference</Link></li>
            <li><Link href="/docs/cli">CLI</Link></li>
            <li><Link href="/docs/github-actions">GitHub Actions</Link></li>
            <li><Link href="/docs/sdks">SDKs</Link></li>
            <li><Link href="/mcp">MCP Connector</Link></li>
          </ul>
        </div>
        <div className="ds-footer-col">
          <h4>Company</h4>
          <ul>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/#enterprise">Enterprise</Link></li>
            <li><Link href="/privacy">Privacy</Link></li>
            <li><Link href="/terms">Terms</Link></li>
            <li><Link href="/security">Security</Link></li>
          </ul>
        </div>
      </footer>
      <div className="ds-footer-bottom">
        <p>© 2026 DropSites. All rights reserved.</p>
        <p>dropsites.app</p>
      </div>
    </div>
  );
}

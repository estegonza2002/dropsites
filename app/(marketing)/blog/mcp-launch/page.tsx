import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'DropSites now works with Claude | DropSites Blog',
  description:
    'Connect DropSites to Claude Desktop and claude.ai. Deploy static sites with a single sentence.',
  openGraph: {
    title: 'DropSites now works with Claude',
    description: 'Deploy static sites from Claude Desktop with @dropsites/mcp.',
    publishedTime: '2026-03-30',
  },
};

export default function McpLaunchPost() {
  return (
    <div className="ds">
      {/* ── NAV ──────────────────────────────────────────────────── */}
      <nav className="ds-nav">
        <Link href="/" className="ds-nav-logo">Drop<span>Sites</span></Link>
        <ul className="ds-nav-links">
          <li><Link href="/#how">How it works</Link></li>
          <li><Link href="/#features">Features</Link></li>
          <li><Link href="/#pricing">Pricing</Link></li>
          <li><Link href="/blog">Blog</Link></li>
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

      {/* ── ARTICLE ──────────────────────────────────────────────── */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 48px)' }}>

        {/* Back link */}
        <Link
          href="/blog"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-3)', textDecoration: 'none', marginBottom: 40 }}
        >
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}>
            <path d="M10 7H3M6 3l-4 4 4 4" />
          </svg>
          Blog
        </Link>

        {/* Header */}
        <header style={{ marginBottom: 48 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--accent-s)',
              color: 'var(--accent)',
              borderRadius: 'var(--r-full)',
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 500,
              marginBottom: 20,
            }}
          >
            <span>⚡</span> Product Update
          </div>
          <h1
            style={{
              fontSize: 'clamp(28px, 5vw, 44px)',
              fontWeight: 500,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              color: 'var(--text-1)',
              marginBottom: 16,
            }}
          >
            DropSites now works with Claude
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <time
              dateTime="2026-03-30"
              style={{ fontSize: 13, color: 'var(--text-3)' }}
            >
              March 30, 2026
            </time>
            <span style={{ color: 'var(--border)', fontSize: 13 }}>·</span>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>The DropSites Team</span>
          </div>
        </header>

        <article
          style={{
            fontSize: 16,
            lineHeight: 1.75,
            color: 'var(--text-2)',
          }}
        >
          {/* Intro */}
          <p style={{ fontSize: 18, color: 'var(--text-1)', fontWeight: 400, marginBottom: 32 }}>
            Until now, sharing static sites meant leaving your AI workflow. You&apos;d finish
            building something with Claude, switch to your terminal, run a build, upload it
            somewhere, copy a link, and finally send it. Today, that whole step disappears.
          </p>

          {/* Problem */}
          <h2 style={{ fontSize: 22, fontWeight: 500, color: 'var(--text-1)', marginBottom: 12, marginTop: 48 }}>
            You build with Claude. Publishing still required context-switching.
          </h2>
          <p style={{ marginBottom: 16 }}>
            The best AI-assisted workflows are uninterrupted. When Claude helps you generate
            a report, build a dashboard, or create a presentation, the last thing you want is
            to context-switch into a deployment tool. Every switch breaks flow and adds friction
            that compounds across dozens of projects.
          </p>
          <p style={{ marginBottom: 16 }}>
            We heard this from our early access users constantly: &ldquo;I love the platform but
            I still have to open a terminal.&rdquo; That ends today.
          </p>

          {/* Solution */}
          <h2 style={{ fontSize: 22, fontWeight: 500, color: 'var(--text-1)', marginBottom: 12, marginTop: 48 }}>
            Now Claude can publish for you.
          </h2>
          <p style={{ marginBottom: 16 }}>
            Drop in the MCP connector and just say{' '}
            <em style={{ fontStyle: 'normal', color: 'var(--text-1)', fontWeight: 500 }}>
              &ldquo;deploy this&rdquo;
            </em>
            . Claude zips your build folder, uploads it to DropSites, and returns a live URL —
            all within the conversation. No terminal. No extra tools. No context switch.
          </p>
          <p style={{ marginBottom: 32 }}>
            The connector is built on the{' '}
            <a href="https://modelcontextprotocol.io" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              Model Context Protocol
            </a>{' '}
            (MCP), which means it works with Claude Desktop today and will work with any
            MCP-compatible client in the future.
          </p>

          {/* Demo */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              overflow: 'hidden',
              marginBottom: 48,
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                fontSize: 12,
                color: 'var(--text-3)',
                fontFamily: 'var(--font-geist-mono)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ width: 12, height: 12 }}>
                <circle cx="6" cy="6" r="5" /><path d="M6 4v3M6 8.5v.5" />
              </svg>
              Demo — Claude Desktop deploying a React app to DropSites
            </div>
            <div
              style={{
                height: 240,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0a0a0a',
              }}
            >
              <Image
                src="/blog/mcp-launch-demo.gif"
                alt="Screen recording of Claude Desktop deploying a React app to DropSites in under 10 seconds"
                width={960}
                height={540}
                unoptimized
                style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
              />
              <p
                style={{
                  position: 'absolute',
                  fontSize: 13,
                  color: '#555',
                  fontFamily: 'var(--font-geist-mono)',
                  display: 'none',
                }}
                aria-hidden="true"
              >
                [Demo GIF placeholder]
              </p>
            </div>
            <div
              style={{
                padding: '10px 16px',
                fontSize: 12,
                color: 'var(--text-3)',
                textAlign: 'center',
              }}
            >
              Deploy in under 10 seconds — straight from Claude Desktop
            </div>
          </div>

          {/* Quick start */}
          <h2 style={{ fontSize: 22, fontWeight: 500, color: 'var(--text-1)', marginBottom: 12, marginTop: 48 }}>
            Quick start
          </h2>
          <p style={{ marginBottom: 20 }}>
            Add the following to your <code style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 13, color: 'var(--accent)', background: 'var(--accent-s)', padding: '1px 5px', borderRadius: 4 }}>claude_desktop_config.json</code>:
          </p>

          <div
            style={{
              background: '#0d0d0d',
              border: '1px solid #2a2a2a',
              borderRadius: 'var(--r-lg)',
              overflow: 'hidden',
              marginBottom: 32,
            }}
          >
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid #1a1a1a',
                fontSize: 12,
                color: '#666',
                fontFamily: 'var(--font-geist-mono)',
              }}
            >
              claude_desktop_config.json
            </div>
            <pre
              style={{
                padding: '20px 20px',
                fontFamily: 'var(--font-geist-mono)',
                fontSize: 13,
                lineHeight: 1.6,
                color: '#ccc',
                margin: 0,
                overflow: 'auto',
              }}
            >
              <span style={{ color: '#888' }}>{'{'}</span>{'\n'}
              {'  '}<span style={{ color: '#888' }}>&quot;mcpServers&quot;</span><span style={{ color: '#888' }}>: {'{'}</span>{'\n'}
              {'    '}<span style={{ color: '#888' }}>&quot;dropsites&quot;</span><span style={{ color: '#888' }}>: {'{'}</span>{'\n'}
              {'      '}<span style={{ color: '#9cdcfe' }}>&quot;command&quot;</span><span style={{ color: '#888' }}>:</span> <span style={{ color: '#ce9178' }}>&quot;npx&quot;</span><span style={{ color: '#888' }}>,</span>{'\n'}
              {'      '}<span style={{ color: '#9cdcfe' }}>&quot;args&quot;</span><span style={{ color: '#888' }}>:</span> <span style={{ color: '#888' }}>[</span><span style={{ color: '#ce9178' }}>&quot;-y&quot;</span><span style={{ color: '#888' }}>,</span> <span style={{ color: '#ce9178' }}>&quot;@dropsites/mcp&quot;</span><span style={{ color: '#888' }}>],</span>{'\n'}
              {'      '}<span style={{ color: '#9cdcfe' }}>&quot;env&quot;</span><span style={{ color: '#888' }}>: {'{'}</span>{'\n'}
              {'        '}<span style={{ color: '#9cdcfe' }}>&quot;DROPSITES_API_KEY&quot;</span><span style={{ color: '#888' }}>:</span> <span style={{ color: '#ce9178' }}>&quot;YOUR_KEY&quot;</span>{'\n'}
              {'      '}<span style={{ color: '#888' }}>{'}'}</span>{'\n'}
              {'    '}<span style={{ color: '#888' }}>{'}'}</span>{'\n'}
              {'  '}<span style={{ color: '#888' }}>{'}'}</span>{'\n'}
              <span style={{ color: '#888' }}>{'}'}</span>
            </pre>
          </div>

          <p style={{ marginBottom: 16 }}>
            That&apos;s the entire setup. No daemon. No global install. <code style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 13, color: 'var(--accent)', background: 'var(--accent-s)', padding: '1px 5px', borderRadius: 4 }}>npx</code> fetches the latest version of{' '}
            <code style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 13, color: 'var(--text-2)', background: 'var(--surface)', padding: '1px 5px', borderRadius: 4 }}>@dropsites/mcp</code>{' '}
            on each run.
          </p>

          {/* What&apos;s available */}
          <h2 style={{ fontSize: 22, fontWeight: 500, color: 'var(--text-1)', marginBottom: 12, marginTop: 48 }}>
            What Claude can do
          </h2>
          <p style={{ marginBottom: 20 }}>Four tools are available today:</p>

          <ul style={{ paddingLeft: 0, listStyle: 'none', marginBottom: 32 }}>
            {[
              { tool: 'deploy_site', desc: 'Deploy a local file or directory as a new DropSites deployment' },
              { tool: 'list_sites', desc: 'List all deployments in your workspace' },
              { tool: 'delete_site', desc: 'Permanently delete a deployment by slug' },
              { tool: 'update_site', desc: 'Replace an existing deployment\'s content with new files' },
            ].map(({ tool, desc }) => (
              <li
                key={tool}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <code
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    fontSize: 12,
                    color: 'var(--accent)',
                    background: 'var(--accent-s)',
                    padding: '2px 8px',
                    borderRadius: 4,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {tool}
                </code>
                <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{desc}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              padding: '32px',
              textAlign: 'center',
              marginTop: 56,
            }}
          >
            <h3 style={{ fontSize: 20, fontWeight: 500, color: 'var(--text-1)', marginBottom: 8 }}>
              Ready to deploy from Claude?
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 24 }}>
              Create a free API key from your dashboard and you&apos;re set up in under a minute.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/dashboard/settings/api-keys"
                className="btn btn-primary-lg"
              >
                Get your API key →
              </Link>
              <Link
                href="/mcp"
                className="btn btn-ghost-lg"
              >
                Full setup guide
              </Link>
            </div>
          </div>
        </article>
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
            <li><Link href="/blog">Blog</Link></li>
          </ul>
        </div>
        <div className="ds-footer-col">
          <h4>Developers</h4>
          <ul>
            <li><Link href="/docs">Documentation</Link></li>
            <li><Link href="/docs/api">API reference</Link></li>
            <li><Link href="/mcp">MCP Connector</Link></li>
          </ul>
        </div>
        <div className="ds-footer-col">
          <h4>Company</h4>
          <ul>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/privacy">Privacy</Link></li>
            <li><Link href="/terms">Terms</Link></li>
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

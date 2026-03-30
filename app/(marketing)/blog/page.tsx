import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Blog — DropSites',
  description: 'Product updates, guides, and news from the DropSites team.',
};

const posts = [
  {
    slug: 'mcp-launch',
    title: 'DropSites now works with Claude',
    date: 'March 30, 2026',
    dateIso: '2026-03-30',
    excerpt:
      "We've built the first MCP connector for static site publishing. Connect DropSites to Claude Desktop or claude.ai — just say \"deploy this\" and your site is live in seconds.",
    tag: 'Product Update',
  },
];

export default function BlogIndexPage() {
  return (
    <div className="ds">
      {/* ── NAV ──────────────────────────────────────────────────── */}
      <nav className="ds-nav">
        <Link href="/" className="ds-nav-logo">Drop<span>Sites</span></Link>
        <ul className="ds-nav-links">
          <li><Link href="/#how">How it works</Link></li>
          <li><Link href="/#features">Features</Link></li>
          <li><Link href="/#pricing">Pricing</Link></li>
          <li><Link href="/blog" style={{ color: 'var(--text-1)', fontWeight: 500 }}>Blog</Link></li>
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
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(64px, 10vw, 112px) clamp(20px, 5vw, 64px) clamp(32px, 5vw, 56px)' }}>
        <div className="ds-eyebrow">DropSites Blog</div>
        <h1
          style={{
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'var(--text-1)',
            lineHeight: 1.15,
            marginTop: 12,
            marginBottom: 12,
          }}
        >
          Product updates &amp; guides
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-3)', maxWidth: 480 }}>
          News, announcements, and deep dives from the team building DropSites.
        </p>
      </div>

      {/* ── POSTS ────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 clamp(20px, 5vw, 64px) clamp(80px, 10vw, 120px)',
          display: 'grid',
          gap: 24,
        }}
      >
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            style={{ textDecoration: 'none' }}
          >
            <article
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)',
                padding: 'clamp(24px, 4vw, 40px)',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '16px 32px',
                alignItems: 'start',
                transition: 'border-color 0.15s',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'var(--accent-s)',
                      color: 'var(--accent)',
                      borderRadius: 'var(--r-full)',
                      padding: '3px 10px',
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    {post.tag}
                  </span>
                  <time
                    dateTime={post.dateIso}
                    style={{ fontSize: 13, color: 'var(--text-3)' }}
                  >
                    {post.date}
                  </time>
                </div>
                <h2
                  style={{
                    fontSize: 'clamp(18px, 2.5vw, 24px)',
                    fontWeight: 500,
                    color: 'var(--text-1)',
                    letterSpacing: '-0.01em',
                    marginBottom: 10,
                    lineHeight: 1.3,
                  }}
                >
                  {post.title}
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.65, maxWidth: 580 }}>
                  {post.excerpt}
                </p>
              </div>
              <div
                style={{
                  alignSelf: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  color: 'var(--accent)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                Read more
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14 }}>
                  <path d="M3 7h8M8 3l4 4-4 4" />
                </svg>
              </div>
            </article>
          </Link>
        ))}
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

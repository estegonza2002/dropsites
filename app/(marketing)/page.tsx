import UseCaseTabs from "@/components/marketing/UseCaseTabs";
import { UploadZone } from "@/components/upload/upload-zone";

const CheckIcon = ({ size = 10 }: { size?: number }) => (
  <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: size, height: size }}>
    <path d="M1.5 5.5l2.5 2.5 5-5" />
  </svg>
);

const StarIcon = () => (
  <svg viewBox="0 0 14 14" fill="currentColor">
    <path d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.3l-3.7 1.9.7-4.1-3-2.9 4.2-.7z" />
  </svg>
);

const Stars = () => (
  <div className="ds-testi-stars">
    {[...Array(5)].map((_, i) => <StarIcon key={i} />)}
  </div>
);

export default function Home() {
  return (
    <div className="ds">
      {/* ── NAV ──────────────────────────────────────────────────── */}
      <nav className="ds-nav">
        <a href="#" className="ds-nav-logo">Drop<span>Sites</span></a>
        <ul className="ds-nav-links">
          <li><a href="#how">How it works</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#enterprise">Enterprise</a></li>
        </ul>
        <div className="ds-nav-ctas">
          <a href="/login" className="btn btn-ghost">Sign in</a>
          <a href="/signup" className="btn btn-primary">
            Start free
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 7h8M8 3l4 4-4 4" /></svg>
          </a>
        </div>
        <button className="btn btn-ghost ds-nav-mobile">Menu</button>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="ds-hero">
        <div className="ds-hero-badge fade-up">
          <div className="ds-hero-badge-dot" />
          Now in early access — free to start
        </div>
        <h1 className="ds-hero-h1 fade-up-2">
          HTML is better than PowerPoint.<br />
          <em>Now you can actually share it.</em>
        </h1>
        <p className="ds-hero-sub fade-up-3">
          Drop any static file — HTML, ZIP, JS, PDF — and get a permanent, shareable link in
          seconds. Built for AI-generated deliverables, client work, and everything in between.
        </p>
        <div className="fade-up-3 flex justify-center w-full">
          <UploadZone
            baseUrl={process.env.NEXT_PUBLIC_APP_URL ?? "https://dropsites.app"}
            showSlugInput
          />
        </div>
        <div className="ds-hero-ctas fade-up-3">
          <a href="/signup" className="btn btn-ghost-lg">Sign up for full access</a>
          <a href="#enterprise" className="btn btn-ghost-lg">Book an enterprise demo</a>
        </div>
        <div className="ds-hero-note fade-up-3">
          <svg viewBox="0 0 12 12" fill="currentColor"><path d="M5 10l-3-3 1.4-1.4L5 7.2l4.6-4.6L11 4z" /></svg>
          Free tier · No credit card · Deploy in 60 seconds
        </div>
      </section>

      {/* ── PROOF BAR ────────────────────────────────────────────── */}
      <div className="ds-proof-bar">
        <div className="ds-proof-item">
          <span className="ds-proof-num">&lt; 60s</span>
          <span className="ds-proof-label">File to live link</span>
        </div>
        <div className="ds-proof-div" />
        <div className="ds-proof-item">
          <span className="ds-proof-num">99.9%</span>
          <span className="ds-proof-label">Uptime SLA</span>
        </div>
        <div className="ds-proof-div" />
        <div className="ds-proof-item">
          <span className="ds-proof-num">$0</span>
          <span className="ds-proof-label">Egress fees</span>
        </div>
        <div className="ds-proof-div" />
        <div className="ds-proof-item">
          <span className="ds-proof-num">HTML · JS · ZIP · PDF</span>
          <span className="ds-proof-label">Supported formats</span>
        </div>
        <div className="ds-proof-div" />
        <div className="ds-proof-item">
          <span className="ds-proof-num">Self-hostable</span>
          <span className="ds-proof-label">Enterprise ready</span>
        </div>
      </div>

      {/* ── PRODUCT VISUAL ───────────────────────────────────────── */}
      <div className="ds-product-visual">
        <div className="ds-browser-mock">
          <div className="ds-browser-bar">
            <div className="ds-browser-dots">
              <div className="ds-bdot" style={{ background: "#ff5f57" }} />
              <div className="ds-bdot" style={{ background: "#ffbd2e" }} />
              <div className="ds-bdot" style={{ background: "#28c840" }} />
            </div>
            <div className="ds-browser-url">
              <svg viewBox="0 0 12 12" fill="none" stroke="#555" strokeWidth="1.2" style={{ width: 10, height: 10, flexShrink: 0 }}>
                <rect x="2" y="5" width="8" height="6" rx="1" /><path d="M4 5V4a2 2 0 014 0v1" />
              </svg>
              <span>app.dropsites.app/dashboard</span>
            </div>
          </div>
          <div className="ds-browser-content">
            {/* Sidebar */}
            <div className="ds-mock-sidebar">
              <div className="ds-mock-logo">Drop<span>Sites</span></div>
              <div className="ds-mock-ws">
                <div className="ds-mock-ws-dot" />
                <div className="ds-mock-ws-name">My Workspace</div>
                <div className="ds-mock-ws-badge">Pro</div>
              </div>
              <div className="ds-mock-nav-label">Main</div>
              <div className="ds-mock-nav-item active">
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 4h10M2 7h7M2 10h8" /></svg>
                Deployments
              </div>
              <div className="ds-mock-nav-item">
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M7 2v10M3 6l4-4 4 4" /><path d="M1 12h12" /></svg>
                Upload
              </div>
              <div className="ds-mock-nav-item">
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M2 10l3-4 3 3 2-3 3 4H2z" /></svg>
                Analytics
              </div>
              <div className="ds-mock-nav-label">Workspace</div>
              <div className="ds-mock-nav-item">
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="5" cy="5" r="2.5" /><path d="M1 12c0-2.2 1.8-4 4-4" /><circle cx="10" cy="7" r="2" /><path d="M8 11.5c0-1.5.9-2.5 2-2.5" /></svg>
                Members
              </div>
              <div className="ds-mock-user">
                <div className="ds-mock-avatar">EB</div>
                <div>
                  <div className="ds-mock-uname">Esteban</div>
                  <div className="ds-mock-uplan">Pro · trial</div>
                </div>
              </div>
            </div>
            {/* Main content */}
            <div className="ds-mock-main">
              <div className="ds-mock-topbar">
                <span className="ds-mock-title">Deployments</span>
                <div className="ds-mock-search">
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="6" cy="6" r="4" /><path d="M10 10l2 2" /></svg>
                  Search…
                  <span className="ds-mock-search-kbd">⌘K</span>
                </div>
                <div className="ds-mock-new-btn">
                  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 2v10M2 7h10" /></svg>
                  New
                </div>
              </div>
              <div className="ds-mock-content">
                <div className="ds-mock-usage">
                  <div className="ds-mock-chip">
                    <div className="ds-mock-chip-label">Storage</div>
                    <div className="ds-mock-track"><div className="ds-mock-fill" style={{ width: "34%", background: "#16a34a" }} /></div>
                    <div className="ds-mock-val">34/100MB</div>
                  </div>
                  <div className="ds-mock-chip">
                    <div className="ds-mock-chip-label">Deploys</div>
                    <div className="ds-mock-track"><div className="ds-mock-fill" style={{ width: "60%", background: "#d97706" }} /></div>
                    <div className="ds-mock-val">3/5</div>
                  </div>
                  <div className="ds-mock-chip">
                    <div className="ds-mock-chip-label">Bandwidth</div>
                    <div className="ds-mock-track"><div className="ds-mock-fill" style={{ width: "12%", background: "#16a34a" }} /></div>
                    <div className="ds-mock-val">0.6/5GB</div>
                  </div>
                </div>
                <div className="ds-mock-table">
                  <div className="ds-mock-table-hd">
                    <div>Deployment</div><div>URL</div><div>Views</div><div>Updated</div><div>Status</div>
                  </div>
                  <div className="ds-mock-row">
                    <div>
                      <div className="ds-mock-row-name">CFXP Sprint 14 Retro</div>
                      <div className="ds-mock-row-slug">cfxp-sprint-14-retro</div>
                    </div>
                    <div className="ds-mock-cell" style={{ fontSize: 9 }}>dropsites.app/cfxp…</div>
                    <div className="ds-mock-cell">2,841</div>
                    <div className="ds-mock-cell" style={{ color: "#a1a1aa" }}>2h ago</div>
                    <div><span className="ds-mock-badge ds-mb-live"><span className="ds-mock-badge-dot" />live</span></div>
                  </div>
                  <div className="ds-mock-row">
                    <div>
                      <div className="ds-mock-row-name">Q1 Delivery Dashboard</div>
                      <div className="ds-mock-row-slug">q1-delivery-dashboard</div>
                    </div>
                    <div className="ds-mock-cell" style={{ fontSize: 9 }}>dropsites.app/q1-d…</div>
                    <div className="ds-mock-cell">489</div>
                    <div className="ds-mock-cell" style={{ color: "#a1a1aa" }}>1d ago</div>
                    <div><span className="ds-mock-badge ds-mb-locked">🔒 locked</span></div>
                  </div>
                  <div className="ds-mock-row">
                    <div>
                      <div className="ds-mock-row-name">Apollo Proposal v3</div>
                      <div className="ds-mock-row-slug">apollo-proposal-v3</div>
                    </div>
                    <div className="ds-mock-cell" style={{ fontSize: 9 }}>dropsites.app/apol…</div>
                    <div className="ds-mock-cell">122</div>
                    <div className="ds-mock-cell" style={{ color: "#a1a1aa" }}>3d ago</div>
                    <div><span className="ds-mock-badge ds-mb-warn">expiring</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="ds-section ds-section-center" id="how">
        <div className="ds-eyebrow">How it works</div>
        <h2 className="ds-h2">From file to live link.<br />Three steps.</h2>
        <p className="ds-sub">No configuration. No servers. No deployment pipelines. Just drop and share.</p>
        <div className="ds-how-grid">
          <div className="ds-how-card">
            <div className="ds-how-num">01</div>
            <div className="ds-how-title">Drop your file</div>
            <div className="ds-how-body">Drag a single HTML file, a ZIP archive, a React build, a PDF, or any static format onto the upload zone. Or use the API, CLI, or Claude MCP connector.</div>
            <div className="ds-how-connector">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 10h12M12 5l5 5-5 5" /></svg>
            </div>
          </div>
          <div className="ds-how-card">
            <div className="ds-how-num">02</div>
            <div className="ds-how-title">Get a permanent link</div>
            <div className="ds-how-body">DropSites processes your file and returns a stable, shareable URL in under 60 seconds. Custom slugs, namespaces, and custom domains are supported.</div>
            <div className="ds-how-connector">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 10h12M12 5l5 5-5 5" /></svg>
            </div>
          </div>
          <div className="ds-how-card">
            <div className="ds-how-num">03</div>
            <div className="ds-how-title">Share anything</div>
            <div className="ds-how-body">Copy the link, embed it, send a QR code, generate per-recipient tracking tokens, or set a password. Your file is served globally via Cloudflare CDN.</div>
          </div>
        </div>
      </section>

      {/* ── USE CASES ────────────────────────────────────────────── */}
      <UseCaseTabs />

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section className="ds-section ds-section-center" id="features">
        <div className="ds-eyebrow">Features</div>
        <h2 className="ds-h2">Everything a static file deserves</h2>
        <p className="ds-sub">Every feature ships in Phase 1. Nothing locked behind enterprise gates unless noted.</p>
        <div className="ds-features-grid">
          {[
            {
              icon: <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 2v12M4 7l5-5 5 5" /><path d="M2 16h14" /></svg>,
              title: "Any static format",
              body: "HTML, ZIP, React builds, JS, PDF, WASM, images. If a browser can render it, DropSites can serve it.",
            },
            {
              icon: <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 11a6 6 0 11-9.9-4.5" /><path d="M12 2v4h4" /></svg>,
              title: "Instant overwrite",
              body: "Re-upload to any existing slug. The URL never changes. Anyone with the link sees the updated version immediately.",
            },
            {
              icon: <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="7" width="12" height="8" rx="1.5" /><path d="M6 7V6a3 3 0 016 0v1" /></svg>,
              title: "Password protection",
              body: "Lock any deployment behind a password. Brute-force rate limiting built in. Toggle on or off from the dashboard row.",
            },
            {
              icon: <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" /><circle cx="9" cy="8" r="2" /></svg>,
              title: "Per-recipient tracking",
              body: "Generate named access tokens for each recipient. Know exactly when Alice opened your proposal — not just total view counts.",
            },
            {
              icon: <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 2L2 7v9h5v-5h4v5h5V7z" /></svg>,
              title: "Workspace model",
              body: "Deployments belong to workspaces — not individuals. Shared namespaces, role-based access, team billing. Members come and go; links stay.",
            },
            {
              icon: <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3h12v12H3z" /><path d="M3 7h12M7 7v8" /></svg>,
              title: "In-browser editor",
              body: "Edit any file in your deployment directly in the browser. Save and publish in one click — change is live immediately, no re-upload required.",
            },
            {
              icon: <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="9" r="7" /><path d="M9 5v4.5l3 1.5" /></svg>,
              title: "Link expiry",
              body: "Set an expiry date on any deployment. Expired links show a branded page. Reactivate in one click — files are never deleted on expiry.",
            },
            {
              icon: <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 1v4M9 13v4M1 9h4M13 9h4" /><circle cx="9" cy="9" r="3" /></svg>,
              title: "Zero egress costs",
              body: "Built on Cloudflare R2 and CDN. No egress fees at any scale. 15x cheaper than S3 at 100k users. Cost advantage is structural, not a promo.",
            },
            {
              icon: <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="14" height="14" rx="2" /><path d="M5 9h8M5 6h5M5 12h6" /></svg>,
              title: "Full REST API + CLI",
              body: "Headless publishing from any script, CI pipeline, or AI agent. Official JS and Python SDKs. GitHub Actions action. Webhooks with HMAC signing.",
            },
          ].map(({ icon, title, body }) => (
            <div key={title} className="ds-feat-card">
              <div className="ds-feat-icon">{icon}</div>
              <div className="ds-feat-title">{title}</div>
              <div className="ds-feat-body">{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <div className="ds-pricing-wrap" id="pricing">
        <div className="ds-pricing-inner ds-section-center">
          <div className="ds-eyebrow">Pricing</div>
          <h2 className="ds-h2">Start free. Scale when you need to.</h2>
          <p className="ds-sub" style={{ marginBottom: 48 }}>All tiers include the full feature set. Limits increase as you grow. No feature gating.</p>
          <div className="ds-pricing-grid">
            <div className="ds-price-card">
              <div className="ds-price-tier">Free</div>
              <div className="ds-price-amount">$0<span> / month</span></div>
              <div className="ds-price-desc">For individuals getting started. No credit card required.</div>
              <hr className="ds-price-divider" />
              <ul className="ds-price-features">
                {["5 deployments", "25 MB per deployment", "5 GB bandwidth / month", "All core features", "14-day Pro trial on signup"].map((f) => (
                  <li key={f}><div className="ds-price-feat-icon"><CheckIcon size={9} /></div>{f}</li>
                ))}
              </ul>
              <a href="/signup" className="ds-price-cta ds-price-cta-free">Start free</a>
            </div>
            <div className="ds-price-card featured">
              <div className="ds-price-popular">Most popular</div>
              <div className="ds-price-tier">Pro</div>
              <div className="ds-price-amount">$9<span> / month</span></div>
              <div className="ds-price-desc">For professionals who publish regularly.</div>
              <hr className="ds-price-divider" />
              <ul className="ds-price-features">
                {["50 deployments", "100 MB per deployment", "50 GB bandwidth / month", "Custom domains", "Remove DropSites badge", "Priority support"].map((f) => (
                  <li key={f}><div className="ds-price-feat-icon"><CheckIcon size={9} /></div>{f}</li>
                ))}
              </ul>
              <a href="/signup?plan=pro" className="ds-price-cta ds-price-cta-pro">Start Pro trial free</a>
            </div>
            <div className="ds-price-card">
              <div className="ds-price-tier">Team</div>
              <div className="ds-price-amount">$29<span> / month</span></div>
              <div className="ds-price-desc">For teams sharing work with clients and stakeholders.</div>
              <hr className="ds-price-divider" />
              <ul className="ds-price-features">
                {["200 deployments", "500 MB per deployment", "200 GB bandwidth / month", "Per-recipient tracking tokens", "Webhooks · API access · SDKs", "Workspace SSO"].map((f) => (
                  <li key={f}><div className="ds-price-feat-icon"><CheckIcon size={9} /></div>{f}</li>
                ))}
              </ul>
              <a href="/signup?plan=team" className="ds-price-cta ds-price-cta-ent">Start Team trial</a>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 24 }}>
            Need unlimited scale with your own infrastructure?{" "}
            <a href="#enterprise" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>See Enterprise →</a>
          </p>
        </div>
      </div>

      {/* ── ENTERPRISE ───────────────────────────────────────────── */}
      <div className="ds-enterprise" id="enterprise">
        <div className="ds-enterprise-inner">
          <div>
            <div className="ds-ent-eyebrow">Enterprise</div>
            <h2 className="ds-ent-h2">Your infrastructure.<br />Your brand.<br />Your data.</h2>
            <p className="ds-ent-body">Self-host DropSites on your own cloud account or on-premise servers. Apply your brand with a single JSON file. Full audit logs, OIDC/SAML SSO, and air-gapped licence validation included.</p>
            <ul className="ds-ent-features">
              {[
                "Deploy on GCP, AWS, Azure, or bare metal — Helm chart and Terraform modules included",
                "White-label: your logo, your domain, your colour scheme",
                "OIDC, SAML, Okta, Azure AD — SSO for all your users",
                "Data residency: US or EU storage region selection",
                "Unlimited deployments, unlimited bandwidth, unlimited storage",
                "Dedicated support SLA · Annual contract",
              ].map((f) => (
                <li key={f}><div className="ds-ent-feat-dot" />{f}</li>
              ))}
            </ul>
            <div className="ds-ent-ctas">
              <a href="/contact" className="btn btn-white">Book a demo</a>
              <a href="/docs" className="btn btn-ghost-white">Read the docs</a>
            </div>
          </div>
          <div className="ds-ent-visual">
            <div className="ds-ent-vis-header">theme.json — enterprise token override</div>
            <hr className="ds-ent-divider" />
            <div className="ds-ent-token-row">
              <div className="ds-ent-token-dot" style={{ background: "#0052cc" }} />
              <div className="ds-ent-token-key">color-accent</div>
              <div className="ds-ent-token-val ds-ent-token-changed">&quot;#0052cc&quot;</div>
            </div>
            <div className="ds-ent-token-row">
              <div className="ds-ent-token-dot" style={{ background: "#f8f9fc" }} />
              <div className="ds-ent-token-key">color-bg-primary</div>
              <div className="ds-ent-token-val ds-ent-token-changed">&quot;#f8f9fc&quot;</div>
            </div>
            <div className="ds-ent-token-row">
              <div className="ds-ent-token-key" style={{ paddingLeft: 24 }}>font-sans</div>
              <div className="ds-ent-token-val ds-ent-token-changed">&quot;Helvetica Neue&quot;</div>
            </div>
            <div className="ds-ent-token-row">
              <div className="ds-ent-token-key" style={{ paddingLeft: 24 }}>border-radius-md</div>
              <div className="ds-ent-token-val ds-ent-token-changed">&quot;3px&quot;</div>
            </div>
            <hr className="ds-ent-divider" />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80" }} />
              <div style={{ fontSize: 11, fontFamily: "var(--font-geist-mono)", color: "#888" }}>Theme applied · All 247 checks passed</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TESTIMONIALS ─────────────────────────────────────────── */}
      <section className="ds-section ds-section-center">
        <div className="ds-eyebrow">Early feedback</div>
        <h2 className="ds-h2">What people are saying</h2>
        <p className="ds-sub" style={{ marginBottom: 48 }}>From our early access cohort.</p>
        <div className="ds-testi-grid">
          <div className="ds-testi-card">
            <Stars />
            <div className="ds-testi-quote">&ldquo;I generate HTML reports with Claude every day. DropSites is the missing piece — I used to copy-paste raw code into Notion just to share it. Now I drop it and send a link. Done.&rdquo;</div>
            <div className="ds-testi-author">
              <div className="ds-testi-avatar" style={{ background: "#7c3aed" }}>ML</div>
              <div><div className="ds-testi-name">Maya L.</div><div className="ds-testi-role">AI Product Consultant</div></div>
            </div>
          </div>
          <div className="ds-testi-card">
            <Stars />
            <div className="ds-testi-quote">&ldquo;Our sprint retrospectives are now live HTML pages with charts and animations. Clients actually read them now. The per-recipient token feature is genuinely clever — I know who&apos;s opened what.&rdquo;</div>
            <div className="ds-testi-author">
              <div className="ds-testi-avatar" style={{ background: "#0369a1" }}>JP</div>
              <div><div className="ds-testi-name">James P.</div><div className="ds-testi-role">Delivery Lead, consulting firm</div></div>
            </div>
          </div>
          <div className="ds-testi-card">
            <Stars />
            <div className="ds-testi-quote">&ldquo;Self-hosted in 20 minutes with the Docker image. Applied our brand token file and it was unrecognisably ours. The fact it runs on Cloudflare R2 means our CDN costs are basically zero.&rdquo;</div>
            <div className="ds-testi-author">
              <div className="ds-testi-avatar" style={{ background: "#15803d" }}>SR</div>
              <div><div className="ds-testi-name">Sarah R.</div><div className="ds-testi-role">Platform Engineering Lead</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────── */}
      <div className="ds-final-cta">
        <h2>Your next deliverable should be a link.</h2>
        <p>Start free in under 60 seconds. No credit card. No configuration. Just drop and share.</p>
        <div className="ds-hero-ctas">
          <a href="/signup" className="btn btn-primary-lg">
            Start free now
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
          </a>
          <a href="#enterprise" className="btn btn-ghost-lg">Talk to enterprise sales</a>
        </div>
        <p className="ds-final-cta-note">Free tier · 14-day Pro trial on signup · No credit card required</p>
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
            <li><a href="#features">Features</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="/changelog">Changelog</a></li>
            <li><a href="/roadmap">Roadmap</a></li>
            <li><a href="/status">Status</a></li>
          </ul>
        </div>
        <div className="ds-footer-col">
          <h4>Developers</h4>
          <ul>
            <li><a href="/docs">Documentation</a></li>
            <li><a href="/docs/api">API reference</a></li>
            <li><a href="/docs/cli">CLI</a></li>
            <li><a href="/docs/github-actions">GitHub Actions</a></li>
            <li><a href="/docs/sdks">SDKs</a></li>
          </ul>
        </div>
        <div className="ds-footer-col">
          <h4>Company</h4>
          <ul>
            <li><a href="/about">About</a></li>
            <li><a href="#enterprise">Enterprise</a></li>
            <li><a href="/privacy">Privacy</a></li>
            <li><a href="/terms">Terms</a></li>
            <li><a href="/security">Security</a></li>
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

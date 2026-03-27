"use client";

import { useState } from "react";

type Tab = "ai" | "consulting" | "dev" | "ent";

const CheckIcon = () => (
  <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M1.5 5.5l2.5 2.5 5-5" />
  </svg>
);

export default function UseCaseTabs() {
  const [active, setActive] = useState<Tab>("ai");

  return (
    <div className="ds-usecases">
      <div className="ds-section ds-section-center">
        <div className="ds-eyebrow">Use cases</div>
        <h2 className="ds-h2">Built for every kind of publisher</h2>
        <div className="ds-uc-tabs">
          {(["ai", "consulting", "dev", "ent"] as Tab[]).map((id) => (
            <button
              key={id}
              className={`ds-uc-tab${active === id ? " active" : ""}`}
              onClick={() => setActive(id)}
            >
              {id === "ai" && "AI Power Users"}
              {id === "consulting" && "Consultants"}
              {id === "dev" && "Developers"}
              {id === "ent" && "Enterprise"}
            </button>
          ))}
        </div>

        {/* AI Power Users */}
        <div className={`ds-uc-panel${active === "ai" ? " active" : ""}`}>
          <div>
            <div className="ds-uc-label">AI Power Users</div>
            <h3 className="ds-uc-h3">Your Claude outputs deserve a real home</h3>
            <p className="ds-uc-body">
              You build dashboards, reports, and interactive tools in seconds with Claude or
              ChatGPT. DropSites closes the last mile — turn that HTML output into a permanent,
              shareable link without leaving your workflow.
            </p>
            <ul className="ds-uc-bullets">
              <li><div className="ds-uc-check"><CheckIcon /></div>Drop Claude-generated HTML and get a link instantly</li>
              <li><div className="ds-uc-check"><CheckIcon /></div>Phase 3 Claude MCP connector — publish without leaving the chat</li>
              <li><div className="ds-uc-check"><CheckIcon /></div>React builds, data visualisations, WASM — all supported</li>
            </ul>
          </div>
          <div className="ds-uc-visual">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>Claude chat</span>
            </div>
            <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 10 }}>
              <span style={{ color: "var(--text-3)", fontSize: 10, display: "block", marginBottom: 4 }}>Claude</span>
              Here&apos;s your Q1 dashboard. I&apos;ve published it to DropSites — your link is ready:
            </div>
            <div style={{ background: "var(--accent-s)", border: "1px solid rgba(249,115,22,.2)", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" style={{ width: 18, height: 18, flexShrink: 0 }}><path d="M8 1a7 7 0 100 14A7 7 0 008 1z" /><path d="M5 8l2 2 4-4" /></svg>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: "var(--accent)" }}>Live now</div>
                <div style={{ fontSize: 12, fontFamily: "var(--font-geist-mono)", color: "var(--text-2)" }}>dropsites.app/q1-dashboard-2026</div>
              </div>
            </div>
          </div>
        </div>

        {/* Consultants */}
        <div className={`ds-uc-panel${active === "consulting" ? " active" : ""}`}>
          <div>
            <div className="ds-uc-label">Consultants &amp; Delivery Teams</div>
            <h3 className="ds-uc-h3">Client deliverables that actually impress</h3>
            <p className="ds-uc-body">
              Stop sending PDF attachments that nobody opens. Publish sprint retrospectives,
              dashboards, and proposals as live interactive sites — with a stable link you can
              share in any message or email.
            </p>
            <ul className="ds-uc-bullets">
              <li><div className="ds-uc-check"><CheckIcon /></div>Password-protect sensitive client deliverables</li>
              <li><div className="ds-uc-check"><CheckIcon /></div>Know exactly when your proposal was opened (per-recipient tracking)</li>
              <li><div className="ds-uc-check"><CheckIcon /></div>Workspace namespaces keep all client work organised</li>
            </ul>
          </div>
          <div className="ds-uc-visual">
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 12 }}>Notification</div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--green-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="var(--green)" strokeWidth="1.5" style={{ width: 16, height: 16 }}><path d="M1 6s2-4 7-4 7 4 7 4-2 4-7 4-7-4-7-4z" /><circle cx="8" cy="6" r="2" /></svg>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)", marginBottom: 2 }}>Alice just opened your proposal</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>Apollo Proposal v3 · 2 minutes ago</div>
              </div>
            </div>
          </div>
        </div>

        {/* Developers */}
        <div className={`ds-uc-panel${active === "dev" ? " active" : ""}`}>
          <div>
            <div className="ds-uc-label">Developers &amp; Engineers</div>
            <h3 className="ds-uc-h3">Publish from anywhere in your workflow</h3>
            <p className="ds-uc-body">
              A full REST API, official CLI, and GitHub Actions action let you deploy static
              builds from any pipeline. Zero config. Webhook support. API keys with rate
              limiting built in.
            </p>
            <ul className="ds-uc-bullets">
              <li><div className="ds-uc-check"><CheckIcon /></div><code style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12, background: "var(--bg)", padding: "1px 5px", borderRadius: 3 }}>dropsites deploy ./dist</code> — done</li>
              <li><div className="ds-uc-check"><CheckIcon /></div>GitHub Actions action for deploy-on-push</li>
              <li><div className="ds-uc-check"><CheckIcon /></div>JS and Python SDKs · Webhooks · OpenAPI spec</li>
            </ul>
          </div>
          <div className="ds-uc-visual">
            <div style={{ fontSize: 10, fontFamily: "var(--font-geist-mono)", color: "var(--text-3)", marginBottom: 6 }}>terminal</div>
            <div style={{ background: "#0f0f0f", borderRadius: 8, padding: 14, fontFamily: "var(--font-geist-mono)", fontSize: 12, lineHeight: 1.8 }}>
              <div style={{ color: "#555" }}>$ dropsites deploy ./dist --slug q1-dashboard</div>
              <div style={{ color: "#a1a1aa" }}>  Uploading 3 files (2.4 MB)…</div>
              <div style={{ color: "#a1a1aa" }}>  Processing…</div>
              <div style={{ color: "#4ade80" }}>  ✓ Live in 2.8s</div>
              <div style={{ color: "#f97316" }}>  → dropsites.app/q1-dashboard</div>
            </div>
          </div>
        </div>

        {/* Enterprise */}
        <div className={`ds-uc-panel${active === "ent" ? " active" : ""}`}>
          <div>
            <div className="ds-uc-label">Enterprise &amp; IT Teams</div>
            <h3 className="ds-uc-h3">Self-hosted, your branding, your infrastructure</h3>
            <p className="ds-uc-body">
              Deploy DropSites entirely on your own infrastructure. Bring your own SSO,
              storage, and domain. Apply your brand via a single JSON token file. Full audit
              logs, RLS permissions, and air-gapped licence validation.
            </p>
            <ul className="ds-uc-bullets">
              <li><div className="ds-uc-check"><CheckIcon /></div>Docker image · Helm chart · Terraform for GCP, AWS, Azure</li>
              <li><div className="ds-uc-check"><CheckIcon /></div>OIDC / SAML SSO · Audit logs · Data residency (US or EU)</li>
              <li><div className="ds-uc-check"><CheckIcon /></div>White-label: custom brand, logo, domain, colours</li>
            </ul>
          </div>
          <div className="ds-uc-visual">
            <div style={{ fontSize: 10, fontFamily: "var(--font-geist-mono)", color: "var(--text-3)", marginBottom: 8 }}>theme.json</div>
            <div style={{ background: "#0f0f0f", borderRadius: 8, padding: 14, fontFamily: "var(--font-geist-mono)", fontSize: 11, lineHeight: 1.9, color: "#888" }}>
              <div><span style={{ color: "#555" }}>{"{"}</span></div>
              <div>&nbsp;&nbsp;<span style={{ color: "#7dd3fc" }}>&quot;brand&quot;</span><span style={{ color: "#555" }}>: {"{"}</span></div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#7dd3fc" }}>&quot;name&quot;</span><span style={{ color: "#555" }}>:</span> <span style={{ color: "#86efac" }}>&quot;Acme Corp&quot;</span><span style={{ color: "#555" }}>,</span></div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#7dd3fc" }}>&quot;logo_url&quot;</span><span style={{ color: "#555" }}>:</span> <span style={{ color: "#86efac" }}>&quot;https://acme.com/logo.svg&quot;</span></div>
              <div>&nbsp;&nbsp;<span style={{ color: "#555" }}>{"},"}</span></div>
              <div>&nbsp;&nbsp;<span style={{ color: "#7dd3fc" }}>&quot;tokens&quot;</span><span style={{ color: "#555" }}>: {"{"}</span></div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#7dd3fc" }}>&quot;color-accent&quot;</span><span style={{ color: "#555" }}>:</span> <span style={{ color: "#f97316" }}>&quot;#0052cc&quot;</span><span style={{ color: "#555" }}>,</span></div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: "#7dd3fc" }}>&quot;font-sans&quot;</span><span style={{ color: "#555" }}>:</span> <span style={{ color: "#86efac" }}>&quot;&#39;Helvetica Neue&#39;&quot;</span></div>
              <div>&nbsp;&nbsp;<span style={{ color: "#555" }}>{"}"}</span></div>
              <div><span style={{ color: "#555" }}>{"}"}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

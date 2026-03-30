import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'DropSites × Claude — Deploy sites from Claude Desktop';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Subtle grid pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(249,115,22,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.05) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 18px',
            borderRadius: 24,
            background: 'rgba(249,115,22,0.12)',
            border: '1px solid rgba(249,115,22,0.3)',
            marginBottom: 28,
          }}
        >
          <span style={{ fontSize: 16, color: '#f97316' }}>⚡</span>
          <span style={{ fontSize: 16, fontWeight: 500, color: '#f97316', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            MCP Connector
          </span>
        </div>
        {/* Main heading */}
        <div
          style={{
            fontSize: 68,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            textAlign: 'center',
            display: 'flex',
          }}
        >
          DropSites{' '}
          <span style={{ color: '#f97316', margin: '0 16px' }}>×</span>
          {' '}Claude
        </div>
        {/* Subheading */}
        <div
          style={{
            fontSize: 28,
            color: '#a1a1aa',
            marginTop: 20,
            textAlign: 'center',
            display: 'flex',
          }}
        >
          Deploy static sites from Claude Desktop
        </div>
        {/* Code snippet preview */}
        <div
          style={{
            marginTop: 40,
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: 12,
            padding: '16px 24px',
            fontFamily: 'monospace',
            fontSize: 18,
            color: '#86efac',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span style={{ color: '#555' }}>$ </span>
          <span>
            <span style={{ color: '#7dd3fc' }}>&quot;command&quot;</span>
            <span style={{ color: '#555' }}>: </span>
            <span style={{ color: '#86efac' }}>&quot;npx&quot;</span>
          </span>
          <span>
            <span style={{ color: '#7dd3fc' }}>&quot;args&quot;</span>
            <span style={{ color: '#555' }}>: [</span>
            <span style={{ color: '#86efac' }}>&quot;-y&quot;</span>
            <span style={{ color: '#555' }}>, </span>
            <span style={{ color: '#f97316' }}>&quot;@dropsites/mcp&quot;</span>
            <span style={{ color: '#555' }}>]</span>
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}

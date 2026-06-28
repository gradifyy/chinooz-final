import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = "Chinooz — Nepal's Marketplace"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #8A1B57 0%, #6E1545 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '80px',
        }}
      >
        {/* Brand name */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: 'white',
            letterSpacing: '-3px',
            marginBottom: 24,
          }}
        >
          Chinooz
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: 'rgba(255,255,255,0.75)',
            textAlign: 'center',
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          {"Nepal's Marketplace — Built for You"}
        </div>

        {/* Badge */}
        <div
          style={{
            marginTop: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 28px',
            borderRadius: 100,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#E0A93B',
            }}
          />
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 20, fontWeight: 600 }}>
            Launching in Kathmandu Valley
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}

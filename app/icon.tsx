import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ background: '#020617', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '128px', border: '8px solid #10b981' }}>
        <span style={{ fontSize: 320, fontWeight: 900, fontStyle: 'italic', color: '#10b981', letterSpacing: '-10px' }}>T</span>
      </div>
    ),
    { ...size }
  )
}

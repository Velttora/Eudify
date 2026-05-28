import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Eudify — Educadores y cuidadores para tu familia';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #f8f6f2 0%, #ede8df 100%)',
          padding: '60px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            maxWidth: '900px',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#7c5c3e',
            }}
          >
            Eudify
          </span>
          <span
            style={{
              fontSize: '60px',
              fontWeight: 800,
              lineHeight: 1.1,
              color: '#1a1209',
            }}
          >
            Educadores y cuidadores para tu familia
          </span>
          <span
            style={{
              fontSize: '26px',
              color: '#6b5744',
              lineHeight: 1.4,
            }}
          >
            Perfiles verificados · Disponibilidad clara · Colombia
          </span>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            right: '48px',
            fontSize: '20px',
            color: '#7c5c3e',
            fontWeight: 600,
          }}
        >
          eudify.co
        </div>
      </div>
    ),
    size,
  );
}

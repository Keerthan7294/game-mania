import React, { useEffect, useState } from 'react';

export default function QRDisplay({ roomCode, serverUrl }) {
  const [qrData, setQrData] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const url = `${serverUrl}/play?room=${roomCode}`;
    // Use client-side QR generation to avoid extra API round-trip when possible
    import('qrcode')
      .then((QRCode) => QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } }))
      .then((dataUrl) => setQrData(dataUrl))
      .catch((err) => setError(err.message));
  }, [roomCode, serverUrl]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        background: '#ffffff',
        borderRadius: '18px',
        padding: '18px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
      }}
    >
      <div
        style={{
          width: '180px',
          height: '180px',
          display: 'grid',
          placeItems: 'center',
          background: '#f1f5f9',
          borderRadius: '12px',
        }}
      >
        {qrData ? (
          <img src={qrData} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : error ? (
          <span style={{ color: '#ef4444', fontSize: '12px', textAlign: 'center', padding: '8px' }}>{error}</span>
        ) : (
          <span style={{ color: '#64748b', fontSize: '14px' }}>Loading QR…</span>
        )}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
          Room Code
        </div>
        <div
          style={{
            fontSize: '42px',
            fontWeight: 900,
            letterSpacing: '0.12em',
            color: '#0f172a',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          {roomCode}
        </div>
      </div>
    </div>
  );
}

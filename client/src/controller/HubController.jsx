import React, { useState } from 'react';

const MASCOTS = [
  { id: 'hippo', emoji: '🦛' },
  { id: 'tiger', emoji: '🐯' },
  { id: 'panda', emoji: '🐼' },
  { id: 'frog', emoji: '🐸' },
  { id: 'monkey', emoji: '🐵' },
  { id: 'koala', emoji: '🐨' },
];

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];

export default function HubController({ player, onUpdateProfile, onInput }) {
  const [name, setName] = useState(player.name);
  const [ready, setReady] = useState(player.ready);

  const setProfileColor = (color) => onUpdateProfile({ color });
  const setProfileMascot = (mascot) => onUpdateProfile({ mascot });

  const toggleReady = () => {
    const next = !ready;
    setReady(next);
    onUpdateProfile({ ready: next });
    onInput('ready', next);
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        padding: 'env(safe-area-inset-top) 16px env(safe-area-inset-bottom)',
        background: '#0b1120',
        gap: '14px',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '10px' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: player.color,
            display: 'grid',
            placeItems: 'center',
            fontSize: '28px',
            boxShadow: `0 0 18px ${player.color}66`,
          }}
        >
          {MASCOTS.find((m) => m.id === player.mascot)?.emoji || '🦛'}
        </div>
        <div style={{ flex: 1 }}>
          <input
            value={name}
            onChange={(e) => {
              const val = e.target.value.slice(0, 12);
              setName(val);
              onUpdateProfile({ name: val });
            }}
            style={{
              width: '100%',
              fontSize: '20px',
              fontWeight: 800,
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#f8fafc',
            }}
          />
          {player.isPartyLeader && (
            <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 800, marginTop: '4px' }}>PARTY LEADER</div>
          )}
        </div>
      </header>

      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>Mascot</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
            {MASCOTS.map((m) => (
              <button
                key={m.id}
                onClick={() => setProfileMascot(m.id)}
                style={{
                  aspectRatio: '1',
                  fontSize: 'clamp(22px, 6vw, 32px)',
                  borderRadius: '12px',
                  border: player.mascot === m.id ? `3px solid ${player.color}` : '2px solid #334155',
                  background: player.mascot === m.id ? '#1e293b' : '#0f172a',
                  cursor: 'pointer',
                }}
              >
                {m.emoji}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>Color</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setProfileColor(c)}
                style={{
                  aspectRatio: '1',
                  borderRadius: '12px',
                  border: player.color === c ? '3px solid #fff' : '2px solid transparent',
                  background: c,
                  cursor: 'pointer',
                  boxShadow: player.color === c ? `0 0 16px ${c}` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <button
            onClick={toggleReady}
            style={{
              width: '100%',
              padding: '18px',
              fontSize: '22px',
              fontWeight: 900,
              borderRadius: '16px',
              border: 'none',
              background: ready ? '#22c55e' : '#334155',
              color: ready ? '#052e16' : '#f8fafc',
              cursor: 'pointer',
              boxShadow: ready ? '0 0 24px rgba(34,197,94,0.4)' : 'none',
            }}
          >
            {ready ? '✅ Ready!' : 'Ready Up'}
          </button>
        </div>
      </section>

      {/* Hub D-Pad for leader */}
      {player.isPartyLeader && (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '10px',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <button
            onPointerDown={() => onInput('slideLeft', true)}
            onPointerUp={() => onInput('slideLeft', false)}
            onPointerLeave={() => onInput('slideLeft', false)}
            style={dpadStyle}
          >
            ◀
          </button>
          <button
            onPointerDown={() => onInput('select', true)}
            onPointerUp={() => onInput('select', false)}
            style={{ ...dpadStyle, background: '#3b82f6' }}
          >
            SELECT
          </button>
          <button
            onPointerDown={() => onInput('slideRight', true)}
            onPointerUp={() => onInput('slideRight', false)}
            onPointerLeave={() => onInput('slideRight', false)}
            style={dpadStyle}
          >
            ▶
          </button>
        </section>
      )}
    </div>
  );
}

const dpadStyle = {
  padding: '18px 8px',
  fontSize: '16px',
  fontWeight: 800,
  borderRadius: '14px',
  border: 'none',
  background: '#1e293b',
  color: '#f8fafc',
  cursor: 'pointer',
  userSelect: 'none',
  touchAction: 'none',
};

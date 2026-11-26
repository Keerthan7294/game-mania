import React from 'react';

const MASCOT_EMOJI = {
  hippo: '🦛', tiger: '🐯', panda: '🐼', frog: '🐸', monkey: '🐵', koala: '🐨',
};

export default function Lobby({ room, onSelectGame }) {
  const connected = room.players.filter((p) => !p.disconnected);
  const readyCount = connected.filter((p) => p.ready).length;

  return (
    <div
      className="lobby-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 'clamp(16px, 2.5vw, 40px)',
        gap: 'clamp(16px, 2vw, 32px)',
      }}
    >
      <style>{`
        @media (max-width: 600px) {
          .lobby-root { padding: 12px !important; gap: 12px !important; }
          .lobby-header { flex-direction: column; align-items: flex-start !important; gap: 8px; }
          .lobby-room { text-align: left !important; }
        }
      `}</style>
      <header className="lobby-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 'clamp(28px, 3.5vw, 56px)', letterSpacing: '-0.02em' }}>
            Game Mania
          </h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 'clamp(14px, 1.4vw, 20px)' }}>
            Party gaming platform — grab your phones and join the room
          </p>
        </div>
        <div className="lobby-room" style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Room
          </div>
          <div style={{ fontSize: 'clamp(28px, 3vw, 48px)', fontWeight: 900, letterSpacing: '0.1em', fontFamily: 'ui-monospace, monospace' }}>
            {room.code}
          </div>
        </div>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '16px',
        }}
      >
        {connected.map((p) => (
          <div
            key={p.id}
            style={{
              background: '#1e293b',
              borderRadius: '18px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              border: `3px solid ${p.color}`,
              boxShadow: p.ready ? `0 0 24px ${p.color}66` : 'none',
              transition: 'box-shadow 0.2s ease',
            }}
          >
            <div style={{ fontSize: 'clamp(40px, 5vw, 72px)', lineHeight: 1 }}>{MASCOT_EMOJI[p.mascot] || '🦛'}</div>
            <div style={{ fontWeight: 800, fontSize: 'clamp(16px, 1.6vw, 22px)' }}>{p.name}</div>
            {p.isPartyLeader && (
              <span style={{ fontSize: '11px', background: '#f59e0b', color: '#0f172a', padding: '3px 8px', borderRadius: '99px', fontWeight: 800 }}>
                PARTY LEADER
              </span>
            )}
            <div
              style={{
                marginTop: 'auto',
                padding: '6px 14px',
                borderRadius: '99px',
                fontWeight: 800,
                fontSize: '12px',
                textTransform: 'uppercase',
                background: p.ready ? '#22c55e' : '#334155',
                color: p.ready ? '#052e16' : '#cbd5e1',
              }}
            >
              {p.ready ? 'Ready' : 'Not Ready'}
            </div>
          </div>
        ))}
        {Array.from({ length: Math.max(0, 4 - connected.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            style={{
              background: 'rgba(30,41,59,0.5)',
              borderRadius: '18px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              border: '2px dashed #334155',
              color: '#64748b',
              minHeight: '160px',
            }}
          >
            <div style={{ fontSize: '32px' }}>+</div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Open Slot</div>
          </div>
        ))}
      </section>

      <section style={{ marginTop: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(20px, 2vw, 32px)' }}>Game Library</h2>
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>
            {readyCount}/{connected.length} ready
          </span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          {onSelectGame.list.map((game) => {
            const locked = connected.length < game.minPlayers;
            return (
              <button
                key={game.id}
                disabled={locked}
                onClick={() => onSelectGame.fn(game.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '18px',
                  borderRadius: '16px',
                  border: 'none',
                  background: locked ? '#1e293b' : 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                  color: '#fff',
                  cursor: locked ? 'not-allowed' : 'pointer',
                  opacity: locked ? 0.55 : 1,
                  textAlign: 'left',
                  transition: 'transform 0.1s ease, box-shadow 0.2s ease',
                }}
              >
                <div style={{ fontSize: 'clamp(20px, 2vw, 28px)', fontWeight: 900 }}>{game.title}</div>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>{game.subtitle}</div>
                <div style={{ marginTop: 'auto', fontSize: '12px', fontWeight: 700, background: 'rgba(0,0,0,0.25)', padding: '4px 10px', borderRadius: '99px' }}>
                  {game.minPlayers}-{game.maxPlayers} Players
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

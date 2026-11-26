import React, { useEffect, useRef, useState } from 'react';

export default function RaftBlastController({ player, gameState, onInput }) {
  const blastRef = useRef(false);
  const [localGas, setLocalGas] = useState(100);
  const [checkpoint, setCheckpoint] = useState(0);
  const [pressed, setPressed] = useState({ left: false, right: false, blast: false });

  // Keep blast input alive while held
  useEffect(() => {
    let raf;
    const loop = () => {
      if (blastRef.current) {
        onInput('blast', true);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [onInput]);

  useEffect(() => {
    if (gameState?.players) {
      const me = gameState.players.find((p) => p.id === player.id);
      if (me) {
        setLocalGas(me.gas);
      }
      setCheckpoint(gameState.checkpoint || 0);
    }
  }, [gameState, player.id]);

  const handleSlide = (dir, active) => {
    setPressed((p) => ({ ...p, [dir]: active }));
    onInput(dir === 'left' ? 'slideLeft' : 'slideRight', active);
  };

  const handleBlast = (active) => {
    blastRef.current = active;
    setPressed((p) => ({ ...p, blast: active }));
    onInput('blast', active);
  };

  // Mini radar: compute player angle from game state or default
  const me = gameState?.players?.find((p) => p.id === player.id);
  const angle = me?.angle || 0;
  const raftYaw = gameState?.raft?.yaw || 0;
  const worldAngle = angle + raftYaw;
  const radarX = 50 + Math.cos(worldAngle) * 35;
  const radarY = 50 + Math.sin(worldAngle) * 35;

  return (
    <div
      style={{
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden',
        background: '#0b1120',
        display: 'grid',
        gridTemplateRows: '10% 90%',
        padding: 'env(safe-area-inset-top) 0 env(safe-area-inset-bottom)',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          background: 'rgba(15,23,42,0.95)',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: player.color,
              display: 'grid',
              placeItems: 'center',
              fontSize: '16px',
              fontWeight: 800,
            }}
          >
            {player.name.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{player.name}</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Checkpoint</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#22c55e' }}>{checkpoint}/4</div>
        </div>
      </div>

      {/* Control zones */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '45% 10% 45%',
          height: '100%',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        {/* Left thumb zone */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: '1fr 1fr',
            gap: '12px',
            padding: '12px',
            position: 'relative',
          }}
        >
          <button
            onPointerDown={(e) => { e.preventDefault(); handleSlide('left', true); }}
            onPointerUp={(e) => { e.preventDefault(); handleSlide('left', false); }}
            onPointerLeave={(e) => { e.preventDefault(); handleSlide('left', false); }}
            onPointerCancel={(e) => { e.preventDefault(); handleSlide('left', false); }}
            style={{
              ...zoneBtnStyle,
              background: pressed.left ? '#1d4ed8' : 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)',
            }}
          >
            <span style={{ fontSize: 'clamp(28px, 6vmin, 48px)' }}>◀</span>
            <span style={{ fontSize: 'clamp(12px, 2.5vmin, 18px)', fontWeight: 800 }}>SLIDE LEFT</span>
          </button>

          <button
            onPointerDown={(e) => { e.preventDefault(); handleSlide('right', true); }}
            onPointerUp={(e) => { e.preventDefault(); handleSlide('right', false); }}
            onPointerLeave={(e) => { e.preventDefault(); handleSlide('right', false); }}
            onPointerCancel={(e) => { e.preventDefault(); handleSlide('right', false); }}
            style={{
              ...zoneBtnStyle,
              background: pressed.right ? '#1d4ed8' : 'linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)',
            }}
          >
            <span style={{ fontSize: 'clamp(28px, 6vmin, 48px)' }}>▶</span>
            <span style={{ fontSize: 'clamp(12px, 2.5vmin, 18px)', fontWeight: 800 }}>SLIDE RIGHT</span>
          </button>

          {/* Mini radar overlay */}
          <div
            style={{
              position: 'absolute',
              left: '18%',
              top: '58%',
              transform: 'translate(-50%, -50%)',
              width: 'min(90px, 20vw)',
              height: 'min(90px, 20vw)',
              borderRadius: '50%',
              background: 'rgba(15,23,42,0.85)',
              border: `2px solid ${player.color}`,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <div
                style={{
                  position: 'absolute',
                  left: `${radarX}%`,
                  top: `${radarY}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: player.color,
                  boxShadow: `0 0 10px ${player.color}`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#94a3b8',
                }}
              />
            </div>
          </div>
        </div>

        {/* Center spacer */}
        <div />

        {/* Right thumb zone: BLAST */}
        <div style={{ display: 'grid', placeItems: 'center', padding: '12px' }}>
          <button
            onPointerDown={(e) => { e.preventDefault(); handleBlast(true); }}
            onPointerUp={(e) => { e.preventDefault(); handleBlast(false); }}
            onPointerLeave={(e) => { e.preventDefault(); handleBlast(false); }}
            onPointerCancel={(e) => { e.preventDefault(); handleBlast(false); }}
            style={{
              width: 'min(170px, 38vw)',
              height: 'min(170px, 38vw)',
              borderRadius: '50%',
              border: 'none',
              background: pressed.blast
                ? 'radial-gradient(circle at 30% 30%, #84cc16 0%, #4d7c0f 100%)'
                : 'radial-gradient(circle at 30% 30%, #a3e635 0%, #65a30d 100%)',
              color: '#14532d',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: 'clamp(16px, 3vmin, 24px)',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: pressed.blast ? '0 0 40px rgba(132,204,22,0.6) inset' : '0 8px 24px rgba(0,0,0,0.35)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Stamina ring */}
            <svg
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                transform: 'rotate(-90deg)',
                pointerEvents: 'none',
              }}
              viewBox="0 0 100 100"
            >
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="6" />
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke={localGas > 25 ? '#22c55e' : '#ef4444'}
                strokeWidth="6"
                strokeDasharray={`${(localGas / 100) * 289} 289`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.1s linear' }}
              />
            </svg>
            <span style={{ fontSize: 'clamp(28px, 6vmin, 52px)', zIndex: 1 }}>💨</span>
            <span style={{ zIndex: 1 }}>BLAST</span>
            <span style={{ fontSize: 'clamp(10px, 2vmin, 14px)', zIndex: 1, opacity: 0.9 }}>{Math.round(localGas)}%</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const zoneBtnStyle = {
  border: 'none',
  borderRadius: '18px',
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  cursor: 'pointer',
  touchAction: 'none',
  userSelect: 'none',
  boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
  transition: 'transform 0.05s ease, filter 0.1s ease',
};

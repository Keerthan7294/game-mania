import React, { useEffect, useRef, useState, useCallback } from 'react';
import { socket } from '../socket.js';
import { gamesRegistry, gamesList } from './games/registry.js';
import QRDisplay from './QRDisplay.jsx';
import Lobby from './Lobby.jsx';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

export default function Console() {
  const [roomCode, setRoomCode] = useState('');
  const [room, setRoom] = useState(null);
  const [activeGameId, setActiveGameId] = useState(null);
  const [error, setError] = useState('');
  const gameRef = useRef(null);

  // Join as console on mount
  useEffect(() => {
    socket.emit('console:join', {}, (res) => {
      if (res?.success) {
        setRoomCode(res.roomCode);
      } else {
        setError('Failed to create room');
      }
    });

    const onRoomUpdated = (r) => setRoom(r);
    const onInput = (data) => {
      gameRef.current?.handleInput?.(data);
    };
    const onHostDisconnected = () => setError('Host disconnected — refresh to reconnect');

    socket.on('room:updated', onRoomUpdated);
    socket.on('input', onInput);
    socket.on('room:host-disconnected', onHostDisconnected);

    return () => {
      socket.off('room:updated', onRoomUpdated);
      socket.off('input', onInput);
      socket.off('room:host-disconnected', onHostDisconnected);
    };
  }, []);

  // Broadcast game state loop (20Hz) to controllers
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeGameId && gameRef.current?.getState) {
        const state = gameRef.current.getState();
        socket.emit('game:state', state);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [activeGameId]);

  const launchGame = useCallback((gameId) => {
    const game = gamesRegistry[gameId];
    if (!game || !game.component) {
      setError('Game not available yet');
      return;
    }
    setActiveGameId(gameId);
    socket.emit('game:event', { type: 'launch', gameId });
  }, []);

  const endGame = useCallback(() => {
    setActiveGameId(null);
    socket.emit('game:event', { type: 'end' });
  }, []);

  const ActiveGameComponent = activeGameId ? gamesRegistry[activeGameId]?.component : null;

  return (
    <div
      className="console-root"
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0b1120',
        color: '#f8fafc',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <style>{`
        .console-layout {
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 24px;
          height: 100%;
          padding: 24px;
        }
        @media (max-width: 900px), (max-aspect-ratio: 1/1) {
          .console-layout {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr auto;
            overflow-y: auto;
          }
          .console-qr {
            flex-direction: row !important;
            justify-content: center;
            flex-wrap: wrap;
          }
        }
      `}</style>

      {error && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ef4444',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '10px',
            zIndex: 100,
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      )}

      {!activeGameId && (
        <div className="console-layout">
          <div
            style={{
              background: 'rgba(15,23,42,0.7)',
              borderRadius: '24px',
              border: '1px solid #1e293b',
              overflow: 'hidden',
              minHeight: 0,
            }}
          >
            {room ? (
              <Lobby room={room} onSelectGame={{ list: gamesList, fn: launchGame }} />
            ) : (
              <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#64748b' }}>
                Creating party room…
              </div>
            )}
          </div>
          <div
            className="console-qr"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
            }}
          >
            {roomCode && <QRDisplay roomCode={roomCode} serverUrl={SERVER_URL} />}
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', maxWidth: '240px' }}>
              Scan with your phone camera or visit {SERVER_URL}/play?room={roomCode}
            </div>
          </div>
        </div>
      )}

      {activeGameId && ActiveGameComponent && (
        <ActiveGameComponent
          ref={gameRef}
          room={room}
          onExit={endGame}
        />
      )}

      {activeGameId && !ActiveGameComponent && (
        <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <h2>Game not yet implemented</h2>
            <button onClick={endGame} style={{ padding: '12px 24px', fontSize: '16px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
              Back to Hub
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

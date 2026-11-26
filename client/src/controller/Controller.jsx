import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { socket } from '../socket.js';
import { gamesRegistry } from '../console/games/registry.js';
import HubController from './HubController.jsx';
import RaftBlastController from './RaftBlastController.jsx';
import { useWakeLock } from './useWakeLock.js';
import { soundEngine } from './SoundEngine.js';

const MASCOTS = [
  { id: 'hippo', emoji: '🦛' },
  { id: 'tiger', emoji: '🐯' },
  { id: 'panda', emoji: '🐼' },
  { id: 'frog', emoji: '🐸' },
  { id: 'monkey', emoji: '🐵' },
  { id: 'koala', emoji: '🐨' },
];

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];

export default function Controller() {
  const [params] = useSearchParams();
  const [roomCode, setRoomCode] = useState(params.get('room')?.toUpperCase() || '');
  const [status, setStatus] = useState('join'); // join | connecting | lobby | playing | error
  const [error, setError] = useState('');
  const [player, setPlayer] = useState(null);
  const [room, setRoom] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [orientation, setOrientation] = useState(window.screen.orientation?.type || '');
  const wakeLock = useWakeLock();
  const inputRef = useRef({});

  useEffect(() => {
    soundEngine.init();
    const onOrientationChange = () => {
      setOrientation(window.screen.orientation?.type || '');
    };
    window.addEventListener('orientationchange', onOrientationChange);
    return () => window.removeEventListener('orientationchange', onOrientationChange);
  }, []);

  useEffect(() => {
    const onRoomUpdated = (r) => {
      setRoom(r);
      if (r.activeGame && r.activeGame !== activeGame) {
        setActiveGame(r.activeGame);
        setStatus('playing');
        wakeLock.request();
      } else if (!r.activeGame && activeGame) {
        setActiveGame(null);
        setStatus('lobby');
        wakeLock.release();
      }
    };
    const onGameEvent = (ev) => {
      if (ev.type === 'launch') {
        setActiveGame(ev.gameId);
        setStatus('playing');
        wakeLock.request();
      } else if (ev.type === 'end') {
        setActiveGame(null);
        setStatus('lobby');
        wakeLock.release();
      }
    };
    const onGameState = (state) => {
      setGameState(state);
    };
    const onHostDisconnected = () => {
      setError('Host console disconnected');
      setStatus('error');
    };

    socket.on('room:updated', onRoomUpdated);
    socket.on('game:event', onGameEvent);
    socket.on('game:state', onGameState);
    socket.on('room:host-disconnected', onHostDisconnected);

    return () => {
      socket.off('room:updated', onRoomUpdated);
      socket.off('game:event', onGameEvent);
      socket.off('game:state', onGameState);
      socket.off('room:host-disconnected', onHostDisconnected);
    };
  }, [activeGame, wakeLock]);

  const joinRoom = useCallback(async () => {
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 5) {
      setError('Enter a 5-character room code');
      return;
    }
    setStatus('connecting');
    setError('');
    const res = await socket.emitWithAck?.('controller:join', { roomCode: code });
    // Fallback for older socket.io-client
    const result = await new Promise((resolve) => socket.emit('controller:join', { roomCode: code }, resolve));
    if (!result.success) {
      setStatus('join');
      setError(result.error === 'ROOM_NOT_FOUND' ? 'Room not found' : result.error === 'ROOM_FULL' ? 'Room is full' : 'Failed to join');
    } else {
      setPlayer(result.player);
      setStatus('lobby');
    }
  }, [roomCode]);

  const updateProfile = useCallback((updates) => {
    socket.emit('player:update', updates);
  }, []);

  const lastInputSentRef = useRef({});
  const sendInput = useCallback((input, active) => {
    const prev = inputRef.current[input];
    inputRef.current[input] = active;

    // Throttle held inputs to ~30Hz to avoid flooding the server while keeping latency low
    const now = performance.now();
    const last = lastInputSentRef.current[input] || 0;
    const throttleMs = active ? 33 : 0;
    if (prev === active && now - last < throttleMs) return;
    lastInputSentRef.current[input] = now;

    socket.emit('input', { input, active });
    if (active) {
      soundEngine.resume();
      if (input === 'blast') soundEngine.playClick('blast');
      else if (input === 'select' || input === 'ready') soundEngine.playClick('confirm');
      else if (input === 'back') soundEngine.playClick('back');
      else soundEngine.playClick('soft');
    }
    // Haptics
    if (active && navigator.vibrate) {
      navigator.vibrate(input === 'blast' ? 25 : 12);
    }
  }, []);

  const isLandscape = orientation.includes('landscape');

  // Auto-lock landscape when playing
  useEffect(() => {
    if (status === 'playing' && 'screen' in window && 'orientation' in window.screen) {
      window.screen.orientation.lock('landscape').catch(() => {
        // Some browsers disallow lock
      });
    }
    return () => {
      if ('screen' in window && 'orientation' in window.screen) {
        window.screen.orientation.unlock?.();
      }
    };
  }, [status]);

  if (status === 'join' || status === 'connecting') {
    return (
      <div
        style={{
          width: '100vw',
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#0b1120',
          gap: '16px',
        }}
      >
        <div style={{ fontSize: 'clamp(40px, 12vw, 80px)', fontWeight: 900 }}>🎮</div>
        <h1 style={{ margin: 0, fontSize: 'clamp(28px, 8vw, 48px)' }}>Game Mania</h1>
        <p style={{ color: '#94a3b8', textAlign: 'center', margin: 0 }}>Enter the 5-character room code shown on the console screen.</p>
        <input
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          maxLength={5}
          placeholder="G9772"
          autoFocus
          style={{
            width: 'min(260px, 80vw)',
            fontSize: 'clamp(28px, 8vw, 40px)',
            textAlign: 'center',
            letterSpacing: '0.2em',
            padding: '14px',
            borderRadius: '14px',
            border: '2px solid #334155',
            background: '#1e293b',
            color: '#f8fafc',
            fontWeight: 800,
            fontFamily: 'ui-monospace, monospace',
            textTransform: 'uppercase',
          }}
        />
        {error && <div style={{ color: '#ef4444', fontWeight: 700 }}>{error}</div>}
        <button
          onClick={joinRoom}
          disabled={status === 'connecting'}
          style={{
            width: 'min(260px, 80vw)',
            padding: '16px',
            fontSize: '18px',
            fontWeight: 900,
            borderRadius: '14px',
            border: 'none',
            background: '#3b82f6',
            color: '#fff',
            cursor: status === 'connecting' ? 'wait' : 'pointer',
            opacity: status === 'connecting' ? 0.7 : 1,
          }}
        >
          {status === 'connecting' ? 'Joining…' : 'Join Room'}
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        style={{
          width: '100vw',
          height: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          background: '#0b1120',
          textAlign: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h2 style={{ color: '#ef4444' }}>{error}</h2>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '16px',
              padding: '14px 28px',
              fontSize: '16px',
              fontWeight: 800,
              borderRadius: '12px',
              border: 'none',
              background: '#3b82f6',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Reconnect
          </button>
        </div>
      </div>
    );
  }

  if (status === 'lobby' && player) {
    return (
      <HubController
        player={player}
        room={room}
        onUpdateProfile={updateProfile}
        onInput={sendInput}
      />
    );
  }

  if (status === 'playing' && activeGame) {
    const schema = gamesRegistry[activeGame]?.controllerSchema;
    if (schema === 'raft-blast') {
      return (
        <>
          {!isLandscape && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100,
                background: '#0f172a',
                display: 'grid',
                placeItems: 'center',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '48px' }}>📱↻</div>
              <h2 style={{ margin: '12px 0 8px' }}>Rotate to Landscape</h2>
              <p style={{ color: '#94a3b8' }}>Hold your phone sideways for the best game controls.</p>
              <button
                onClick={() => {
                  if ('screen' in window && 'orientation' in window.screen) {
                    window.screen.orientation.lock('landscape').catch(() => {});
                  }
                  if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
                }}
                style={{
                  marginTop: '16px',
                  padding: '14px 28px',
                  fontSize: '16px',
                  fontWeight: 800,
                  borderRadius: '12px',
                  border: 'none',
                  background: '#22c55e',
                  color: '#052e16',
                  cursor: 'pointer',
                }}
              >
                Lock Landscape
              </button>
            </div>
          )}
          <RaftBlastController player={player} gameState={gameState} onInput={sendInput} />
        </>
      );
    }
    return (
      <div style={{ width: '100vw', height: '100dvh', display: 'grid', placeItems: 'center', padding: '24px', textAlign: 'center' }}>
        <div>
          <h2>Game controller not available</h2>
          <p style={{ color: '#94a3b8' }}>This game is coming soon.</p>
        </div>
      </div>
    );
  }

  return null;
}

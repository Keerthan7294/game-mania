import { io } from 'socket.io-client';
import readline from 'readline';

const SERVER_URL = process.env.SERVER_URL || 'https://game-mania-1.onrender.com';
const ROOM_CODE = process.argv[2] || process.env.ROOM_CODE;
const BOT_COUNT = parseInt(process.env.BOT_COUNT || '1', 10);

if (!ROOM_CODE) {
  console.log('Usage: node bot.js <ROOM_CODE>');
  console.log('   or: set ROOM_CODE env var');
  process.exit(1);
}

const MASCOTS = ['hippo', 'tiger', 'panda', 'frog', 'monkey', 'koala'];
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316'];

function normalizeAngle(a) {
  // Normalize to [-PI, PI]
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function createBot(index) {
  const socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
  });

  const botName = `Bot ${index + 1}`;
  const mascot = MASCOTS[index % MASCOTS.length];
  const color = COLORS[index % COLORS.length];

  let playerId = null;
  let gameState = null;
  let isPlaying = false;
  let inputLoop = null;
  let currentInputs = { blast: false, slideLeft: false, slideRight: false };

  function setInput(input, active) {
    if (currentInputs[input] === active) return;
    currentInputs[input] = active;
    socket.emit('input', { input, active });
  }

  function releaseAll() {
    setInput('blast', false);
    setInput('slideLeft', false);
    setInput('slideRight', false);
  }

  function think() {
    if (!gameState || !gameState.players) return;

    const me = gameState.players.find((p) => p.id === playerId);
    if (!me) return;

    const BACK_ANGLE = -Math.PI / 2;
    const angle = normalizeAngle(me.angle);
    const diff = normalizeAngle(BACK_ANGLE - angle);
    const gas = me.gas ?? 100;

    // Stop everything if gas is empty
    if (gas <= 0) {
      releaseAll();
      return;
    }

    // If not at back, slide there
    if (Math.abs(diff) > 0.25) {
      setInput('blast', false);
      if (diff > 0) {
        setInput('slideRight', true);
        setInput('slideLeft', false);
      } else {
        setInput('slideLeft', true);
        setInput('slideRight', false);
      }
      return;
    }

    // At back: stop sliding and blast
    setInput('slideLeft', false);
    setInput('slideRight', false);

    // Blast if we have gas
    if (gas > 15) {
      setInput('blast', true);
    } else {
      setInput('blast', false);
    }
  }

  socket.on('connect', () => {
    console.log(`[${botName}] connected`);

    socket.emit(
      'controller:join',
      {
        roomCode: ROOM_CODE.toUpperCase(),
        profile: { name: botName, mascot, color },
      },
      (result) => {
        if (!result?.success) {
          console.error(`[${botName}] failed to join:`, result?.error || 'unknown');
          socket.disconnect();
          return;
        }
        playerId = result.player.id;
        console.log(`[${botName}] joined as player ${playerId}`);

        // Ready up
        socket.emit('player:update', { ready: true });
      }
    );
  });

  socket.on('game:state', (state) => {
    gameState = state;
  });

  socket.on('game:event', (event) => {
    if (event.type === 'launch') {
      isPlaying = true;
      console.log(`[${botName}] game launched, starting AI`);
      if (!inputLoop) {
        inputLoop = setInterval(think, 50); // 20Hz decision loop
      }
    } else if (event.type === 'end') {
      isPlaying = false;
      releaseAll();
      if (inputLoop) {
        clearInterval(inputLoop);
        inputLoop = null;
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`[${botName}] disconnected`);
    releaseAll();
    if (inputLoop) {
      clearInterval(inputLoop);
      inputLoop = null;
    }
  });

  socket.on('connect_error', (err) => {
    console.error(`[${botName}] connection error:`, err.message);
  });
}

console.log(`Starting ${BOT_COUNT} bot(s) for room ${ROOM_CODE.toUpperCase()} on ${SERVER_URL}`);
for (let i = 0; i < BOT_COUNT; i++) {
  createBot(i);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down bots...');
  process.exit(0);
});

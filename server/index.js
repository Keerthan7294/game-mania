import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { RoomManager } from './roomManager.js';

// Optional tunnel for public hosting
let localtunnel;
try {
  localtunnel = (await import('localtunnel')).default;
} catch {
  localtunnel = null;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  pingInterval: 2500,
  pingTimeout: 8000,
});

const PORT = process.env.PORT || 3000;
const EXTERNAL_HOST = process.env.EXTERNAL_HOST || `http://localhost:${PORT}`;

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// Rate limiting: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

const roomManager = new RoomManager();

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', rooms: roomManager.getRoomCount() });
});

// Generate QR code for a room
app.get('/api/qr', async (req, res) => {
  const roomCode = req.query.room;
  if (!roomCode) return res.status(400).json({ error: 'Missing room code' });
  try {
    const url = `${EXTERNAL_HOST}/play?room=${roomCode.toUpperCase()}`;
    const dataUrl = await QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      color: { dark: '#111827', light: '#ffffff' },
    });
    res.json({ url, qr: dataUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve APK download
app.get('/download', (_req, res) => {
  const apk = join(__dirname, '../GameMania-debug.apk');
  res.download(apk, 'GameMania-debug.apk');
});

// Static client build in production
app.use(express.static(join(__dirname, '../client/dist')));
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, '../client/dist/index.html'));
});

io.on('connection', (socket) => {
  console.log(`[Socket ${socket.id}] connected`);

  // Per-socket input rate limiter: token bucket, 60 input events per second burst
  let inputTokens = 60;
  let lastInputRefill = Date.now();
  const consumeInputToken = () => {
    const now = Date.now();
    const elapsed = (now - lastInputRefill) / 1000;
    inputTokens = Math.min(60, inputTokens + elapsed * 60);
    lastInputRefill = now;
    if (inputTokens >= 1) {
      inputTokens -= 1;
      return true;
    }
    return false;
  };

  // Console creates/joins a room
  socket.on('console:join', (data, ack) => {
    const roomCode = roomManager.createOrGetConsoleRoom(socket.id);
    socket.roomCode = roomCode;
    socket.role = 'console';
    socket.join(roomCode);
    console.log(`[Console ${socket.id}] hosting room ${roomCode}`);
    ack?.({ success: true, roomCode });
    socket.to(roomCode).emit('room:updated', roomManager.getRoom(roomCode));
  });

  // Controller joins room by code
  socket.on('controller:join', (data, ack) => {
    const roomCode = (data?.roomCode || '').toUpperCase().trim();
    const result = roomManager.addPlayer(roomCode, socket.id, data?.profile || {});
    if (!result.success) {
      ack?.(result);
      return;
    }
    socket.roomCode = roomCode;
    socket.role = 'controller';
    socket.join(roomCode);
    console.log(`[Controller ${socket.id}] joined room ${roomCode} as player ${result.player.id}`);
    ack?.(result);

    // Notify console of new player
    io.to(roomCode).emit('room:updated', roomManager.getRoom(roomCode));
  });

  // Update profile / ready status
  socket.on('player:update', (data) => {
    if (!socket.roomCode || socket.role !== 'controller') return;
    const room = roomManager.updatePlayer(socket.roomCode, socket.id, data);
    if (room) {
      io.to(socket.roomCode).emit('room:updated', room);
    }
  });

  // Controller input relay (instant, <30ms target) with per-socket rate limiting
  socket.on('input', (data) => {
    if (!socket.roomCode || socket.role !== 'controller') return;
    if (!consumeInputToken()) return; // drop excessive inputs
    const player = roomManager.getPlayer(socket.roomCode, socket.id);
    if (!player) return;
    // Broadcast to console only (low traffic, reliable ordering)
    socket.to(socket.roomCode).emit('input', {
      playerId: player.id,
      socketId: socket.id,
      ...data,
      serverTime: Date.now(),
    });
  });

  // Game state broadcast from console (20Hz)
  socket.on('game:state', (state) => {
    if (!socket.roomCode || socket.role !== 'console') return;
    // Add authoritative server timestamp for latency calc
    state.serverTime = Date.now();
    socket.to(socket.roomCode).emit('game:state', state);
  });

  // Game events (start, end, launch)
  socket.on('game:event', (event) => {
    if (!socket.roomCode || socket.role !== 'console') return;
    io.to(socket.roomCode).emit('game:event', event);
    if (event.type === 'launch') {
      roomManager.setActiveGame(socket.roomCode, event.gameId);
      io.to(socket.roomCode).emit('room:updated', roomManager.getRoom(socket.roomCode));
    }
    if (event.type === 'end') {
      roomManager.setActiveGame(socket.roomCode, null);
      io.to(socket.roomCode).emit('room:updated', roomManager.getRoom(socket.roomCode));
    }
  });

  // Disconnect / reconnect
  socket.on('disconnect', (reason) => {
    console.log(`[Socket ${socket.id}] disconnected: ${reason}`);
    if (!socket.roomCode) return;

    if (socket.role === 'console') {
      // Console left: mark room hostless, controllers will be notified
      roomManager.markConsoleDisconnected(socket.roomCode);
      io.to(socket.roomCode).emit('room:host-disconnected', { roomCode: socket.roomCode });
    } else if (socket.role === 'controller') {
      const room = roomManager.markPlayerDisconnected(socket.roomCode, socket.id);
      if (room) {
        io.to(socket.roomCode).emit('room:updated', room);
      }
    }
  });
});

httpServer.listen(PORT, async () => {
  console.log(`🎮 Game Mania server running on port ${PORT}`);
  console.log(`🌐 Console URL: http://localhost:${PORT}/console`);
  console.log(`📱 Controller URL: http://localhost:${PORT}/play?room=XXXXX`);

  if (process.env.USE_TUNNEL === '1' && localtunnel) {
    try {
      const tunnel = await localtunnel({ port: PORT, subdomain: process.env.TUNNEL_SUBDOMAIN });
      process.env.EXTERNAL_HOST = tunnel.url;
      console.log(`🌍 Public tunnel URL: ${tunnel.url}`);
      console.log(`🎮 Public Console: ${tunnel.url}/console`);
      console.log(`📱 Public Controller: ${tunnel.url}/play?room=XXXXX`);
      tunnel.on('close', () => {
        console.log('Tunnel closed');
        process.exit(1);
      });
    } catch (err) {
      console.warn('Could not start tunnel:', err.message);
    }
  }
});

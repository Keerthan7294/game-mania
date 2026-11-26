// Room Manager: authoritative in-memory room & player registry.
// Designed for AirConsole-style: one console screen, many smartphone controllers.

const MASCOTS = [
  { id: 'hippo', name: 'Hippo', emoji: '🦛' },
  { id: 'tiger', name: 'Tiger', emoji: '🐯' },
  { id: 'panda', name: 'Panda', emoji: '🐼' },
  { id: 'frog', name: 'Frog', emoji: '🐸' },
  { id: 'monkey', name: 'Monkey', emoji: '🐵' },
  { id: 'koala', name: 'Koala', emoji: '🐨' },
];

const COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // yellow
  '#a855f7', // purple
  '#f97316', // orange
];

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class RoomManager {
  constructor() {
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
  }

  createOrGetConsoleRoom(consoleSocketId) {
    // Reconnect existing console if it had the same socket id in a recent room? Not feasible, create new.
    let code = generateCode();
    while (this.rooms.has(code)) {
      code = generateCode();
    }
    const room = {
      code,
      consoleSocketId,
      createdAt: Date.now(),
      activeGame: null,
      players: [],
      status: 'lobby', // lobby | playing
    };
    this.rooms.set(code, room);
    return code;
  }

  addPlayer(roomCode, socketId, profile = {}) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'ROOM_NOT_FOUND' };
    }
    if (room.players.length >= 8) {
      return { success: false, error: 'ROOM_FULL' };
    }
    // Check if reconnecting
    const existingIndex = room.players.findIndex((p) => p.socketId === socketId);
    if (existingIndex >= 0) {
      room.players[existingIndex].disconnected = false;
      return { success: true, player: this.sanitizePlayer(room.players[existingIndex]) };
    }

    const takenMascots = new Set(room.players.map((p) => p.mascot));
    const takenColors = new Set(room.players.map((p) => p.color));
    const mascot = MASCOTS.find((m) => !takenMascots.has(m.id)) || MASCOTS[0];
    const color = COLORS.find((c) => !takenColors.has(c)) || COLORS[0];

    const player = {
      id: room.players.length + 1,
      socketId,
      name: profile.name || `Player ${room.players.length + 1}`,
      mascot: profile.mascot || mascot.id,
      mascotEmoji: MASCOTS.find((m) => m.id === (profile.mascot || mascot.id))?.emoji || mascot.emoji,
      color: profile.color || color,
      ready: false,
      disconnected: false,
      isPartyLeader: room.players.length === 0,
    };
    room.players.push(player);
    return { success: true, player: this.sanitizePlayer(player) };
  }

  updatePlayer(roomCode, socketId, updates) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    const player = room.players.find((p) => p.socketId === socketId);
    if (!player) return null;
    if (updates.name !== undefined) player.name = String(updates.name).slice(0, 12);
    if (updates.color !== undefined && /^#[0-9A-Fa-f]{6}$/.test(updates.color)) player.color = updates.color;
    if (updates.mascot !== undefined) {
      const m = MASCOTS.find((x) => x.id === updates.mascot);
      if (m) {
        player.mascot = m.id;
        player.mascotEmoji = m.emoji;
      }
    }
    if (updates.ready !== undefined) player.ready = Boolean(updates.ready);
    return this.sanitizeRoom(room);
  }

  markPlayerDisconnected(roomCode, socketId) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    const player = room.players.find((p) => p.socketId === socketId);
    if (player) {
      player.disconnected = true;
      // Promote next connected player to leader if leader left
      if (player.isPartyLeader) {
        player.isPartyLeader = false;
        const next = room.players.find((p) => !p.disconnected);
        if (next) next.isPartyLeader = true;
      }
    }
    return this.sanitizeRoom(room);
  }

  markConsoleDisconnected(roomCode) {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.consoleSocketId = null;
      room.status = 'host-disconnected';
    }
  }

  setActiveGame(roomCode, gameId) {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.activeGame = gameId;
      room.status = gameId ? 'playing' : 'lobby';
    }
  }

  getRoom(roomCode) {
    const room = this.rooms.get(roomCode);
    return room ? this.sanitizeRoom(room) : null;
  }

  getPlayer(roomCode, socketId) {
    const room = this.rooms.get(roomCode);
    return room ? room.players.find((p) => p.socketId === socketId) : null;
  }

  getRoomCount() {
    return this.rooms.size;
  }

  sanitizeRoom(room) {
    return {
      code: room.code,
      activeGame: room.activeGame,
      status: room.status,
      players: room.players.map((p) => this.sanitizePlayer(p)),
    };
  }

  sanitizePlayer(p) {
    return {
      id: p.id,
      name: p.name,
      mascot: p.mascot,
      mascotEmoji: p.mascotEmoji,
      color: p.color,
      ready: p.ready,
      isPartyLeader: p.isPartyLeader,
      disconnected: p.disconnected,
    };
  }
}

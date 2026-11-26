// Shared game constants for Game Mania platform

export const GAMES = {
  RAFT_BLAST: 'raft-blast',
  BUMPER_ARENA: 'bumper-arena',
  SYNC_DASH: 'sync-dash',
};

export const GAME_CONFIG = {
  [GAMES.RAFT_BLAST]: {
    id: GAMES.RAFT_BLAST,
    title: 'Raft Blast Co-Op',
    subtitle: 'Fart-powered physics rafting chaos',
    minPlayers: 2,
    maxPlayers: 4,
    thumbnail: '/thumbnails/raft-blast.png',
    controllerSchema: 'raft-blast',
  },
  [GAMES.BUMPER_ARENA]: {
    id: GAMES.BUMPER_ARENA,
    title: 'Bumper Arena',
    subtitle: 'Sumo bumper cars (Coming Soon)',
    minPlayers: 2,
    maxPlayers: 6,
    thumbnail: '/thumbnails/bumper-arena.png',
    controllerSchema: 'bumper-arena',
  },
  [GAMES.SYNC_DASH]: {
    id: GAMES.SYNC_DASH,
    title: 'Sync Dash',
    subtitle: 'Rhythm team runner (Coming Soon)',
    minPlayers: 2,
    maxPlayers: 4,
    thumbnail: '/thumbnails/sync-dash.png',
    controllerSchema: 'sync-dash',
  },
};

export const RAFT = {
  RADIUS: 2.2,
  MASS: 80,
  MAX_GAS: 100,
  GAS_DRAIN_RATE: 35, // per second while blasting
  GAS_RECHARGE_RATE: 60, // per second while not blasting
  BLAST_FORCE: 4200,
  BLAST_TORQUE: 18,
  SLIDE_SPEED: 2.5,
  MAX_SPEED: 18,
  EMPTY_COOLDOWN: 1.2,
};

export const INPUTS = {
  SLIDE_LEFT: 'slideLeft',
  SLIDE_RIGHT: 'slideRight',
  BLAST: 'blast',
  SELECT: 'select',
  BACK: 'back',
  READY: 'ready',
  PAUSE: 'pause',
};

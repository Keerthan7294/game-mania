import { GAMES, GAME_CONFIG } from '@shared/constants.js';
import RaftBlastGame from './RaftBlastGame.jsx';

export const gamesRegistry = {
  [GAMES.RAFT_BLAST]: {
    ...GAME_CONFIG[GAMES.RAFT_BLAST],
    component: RaftBlastGame,
  },
  [GAMES.BUMPER_ARENA]: {
    ...GAME_CONFIG[GAMES.BUMPER_ARENA],
    component: null, // Placeholder
  },
  [GAMES.SYNC_DASH]: {
    ...GAME_CONFIG[GAMES.SYNC_DASH],
    component: null, // Placeholder
  },
};

export const gamesList = Object.values(gamesRegistry);

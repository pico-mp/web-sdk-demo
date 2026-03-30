export type GamePhase = 'waiting' | 'discussion' | 'voting' | 'game_over';

export interface Player {
  id: string;
  name: string;
  role: 'mafia' | 'citizen' | null;
  isAlive: boolean;
  isHost: boolean;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  timer: number;
  winner: 'mafia' | 'citizens' | null;
  dayCount: number;
  lastEliminated: string | null;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  type: 'chat' | 'system';
}

export const INITIAL_GAME_STATE: GameState = {
  phase: 'waiting',
  players: [],
  timer: 0,
  winner: null,
  dayCount: 1,
  lastEliminated: null,
};

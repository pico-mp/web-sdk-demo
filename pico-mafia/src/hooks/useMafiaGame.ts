import { useState, useCallback } from 'react';
import type { GameState, Player } from '../types';
import { INITIAL_GAME_STATE } from '../types';

export const useMafiaGame = (myId: string, setRoomData: (k: string, v: any) => void) => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);

  const syncGame = useCallback((newState: GameState) => {
    setGameState(newState);
  }, []);

  const startGame = useCallback((peers: string[]) => {
    // Basic rules: 1 Mafia, others Citizens
    const allIds = [myId, ...peers];
    const mafiaIndex = Math.floor(Math.random() * allIds.length);
    const mafiaId = allIds[mafiaIndex];

    const players: Player[] = allIds.map(id => ({
      id,
      name: `Player ${id.substring(0, 4)}`,
      role: id === mafiaId ? 'mafia' : 'citizen', // Strictly in demo, store it in room data for simplicity
      isAlive: true,
      isHost: id === myId
    }));

    const newState: GameState = {
      ...INITIAL_GAME_STATE,
      phase: 'discussion',
      players,
      timer: 30,
      dayCount: 1,
    };

    setRoomData('gameState', newState);
  }, [myId, setRoomData]);

  const advancePhase = useCallback(() => {
    if (gameState.phase === 'discussion') {
      setRoomData('gameState', { ...gameState, phase: 'voting', timer: 20 });
    } else if (gameState.phase === 'voting') {
      // Logic for tallying votes would normally happen here or via a broadcast
      // This is simplified: the host or a consensus decides
    }
  }, [gameState, setRoomData]);

  return {
    gameState,
    syncGame,
    startGame,
    advancePhase,
    myRole: gameState.players.find(p => p.id === myId)?.role || null
  };
};

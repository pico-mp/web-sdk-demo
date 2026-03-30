import { useState, useEffect, useRef } from 'react';
import { PicoMP } from '@pico-mp/web';

export interface CursorData {
  x: number;
  y: number;
  emoji: string;
  name: string;
}

export const usePicoMP = (onPositionUpdate: (id: string, data: CursorData) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState('');
  const [peers, setPeers] = useState<string[]>([]);
  const updateRef = useRef(onPositionUpdate);
  updateRef.current = onPositionUpdate;

  useEffect(() => {
    const apiKey = (window as any).__ENV__?.VITE_PICO_API_KEY || import.meta.env.VITE_PICO_API_KEY;
    if (apiKey) PicoMP.useCloud(apiKey);
    else PicoMP.useLocal('http://localhost:7426');

    PicoMP.onPeerJoined = (id) => setPeers(prev => [...new Set([...prev, id])]);
    PicoMP.onPeerLeft = (id) => setPeers(prev => prev.filter(p => p !== id));

    return () => {
      PicoMP.onPeerJoined = null;
      PicoMP.onPeerLeft = null;
    };
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    
    // Subscribe to mouse move events from others
    const unsubMove = PicoMP.onReceive<CursorData>('move', (id, data) => {
      updateRef.current(id, data);
    });

    return () => { unsubMove(); };
  }, [isConnected]);

  const joinGlobalLobby = async () => {
    const LOBBY_CODE = 'PARTY1';
    try {
      // Try joining existing lobby first
      await PicoMP.joinRoom(LOBBY_CODE);
    } catch {
      // If not exists, create it
      await PicoMP.createRoom({ maxPlayers: 16 });
      // Note: In real app, creator would set the room code, 
      // but here we rely on the first user creating's random code 
      // if PARTY1 isn't fixed, but our SDK joinRoom is actually code-based.
      // PicoMP Cloud generates random 6-letter codes.
      // So 'Single Room' for a demo means we'll just join one if provided or create one.
    }
    setPlayerId(PicoMP.getMyPlayerId() || '');
    setIsConnected(true);
  };

  return {
    isConnected,
    playerId,
    peers,
    joinRoom: (code: string) => {
       PicoMP.joinRoom(code).then(() => {
         setPlayerId(PicoMP.getMyPlayerId() || '');
         setIsConnected(true);
       });
    },
    createRoom: () => {
       PicoMP.createRoom({ maxPlayers: 20 }).then(() => {
         setPlayerId(PicoMP.getMyPlayerId() || '');
         setIsConnected(true);
       });
    },
    broadcastPosition: (data: CursorData) => PicoMP.sendAll(data, 'move'),
    getRoomCode: () => (PicoMP as any).roomCode // Accessing private for demo
  };
};

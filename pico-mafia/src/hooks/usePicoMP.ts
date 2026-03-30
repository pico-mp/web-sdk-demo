import { useState, useEffect, useRef } from 'react';
import { PicoMP } from '@pico-mp/web';

export interface PicoMPCallbacks {
  onRoomDataChanged?: (key: string, value: any, setBy: string) => void;
  onReceiveMessage?: (senderId: string, payload: any) => void;
  onSyncReady?: (allData: Record<string, any>) => void;
}

export const usePicoMP = (callbacks: PicoMPCallbacks) => {
  const cbRef = useRef(callbacks);
  useEffect(() => { cbRef.current = callbacks; }, [callbacks]);

  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isConnectionLost, setIsConnectionLost] = useState(false);
  const [peers, setPeers] = useState<string[]>([]);

  useEffect(() => {
    // API Key resolution (docker-env or local-dev)
    const apiKey = (window as any).__ENV__?.VITE_PICO_API_KEY || import.meta.env.VITE_PICO_API_KEY;
    
    if (apiKey) {
      PicoMP.useCloud(apiKey);
    } else {
      PicoMP.useLocal('http://localhost:7426');
    }

    PicoMP.onConnectionLost = () => {
      setIsConnectionLost(true);
      setIsConnected(false);
    };

    PicoMP.onError = (code, msg) => {
      console.error(`[PicoMP] ${code}:`, msg);
    };

    PicoMP.onPeerJoined = (id) => setPeers(prev => [...new Set([...prev, id])]);
    PicoMP.onPeerLeft = (id) => setPeers(prev => prev.filter(p => p !== id));

    return () => {
      PicoMP.onConnectionLost = null;
      PicoMP.onError = null;
      PicoMP.onPeerJoined = null;
      PicoMP.onPeerLeft = null;
    };
  }, []);

  useEffect(() => {
    if (!isConnected) return;

    PicoMP.onRoomDataChanged = (key, value, setBy) => {
      cbRef.current.onRoomDataChanged?.(key, value, setBy);
    };

    // Chat handling
    const unsub = PicoMP.onReceive<{ text: string, senderName: string }>('chat', (senderId, msg) => {
      cbRef.current.onReceiveMessage?.(senderId, msg);
    });

    return () => {
      PicoMP.onRoomDataChanged = null;
      unsub();
    };
  }, [isConnected]);

  const createMatch = async (options?: { maxPlayers?: number }) => {
    const res = await PicoMP.createRoom(options);
    setRoomId(res.roomCode);
    setIsConnected(true);
    // Give some time for __room_data_sync to be handled by SDK (or wait for it if we added a hook)
    // For now, since we're the host, we'll just return.
    return res.roomCode;
  };

  const joinMatch = async (code: string) => {
    await PicoMP.joinRoom(code);
    setRoomId(code);
    setIsConnected(true);
    // Sync existing data
    const all = PicoMP.getAllRoomData();
    cbRef.current.onSyncReady?.(all);
  };

  return {
    isConnected,
    isConnectionLost,
    roomId,
    playerId: PicoMP.getMyPlayerId() || '',
    peers,
    createMatch,
    joinMatch,
    setRoomData: PicoMP.setRoomData,
    getRoomData: PicoMP.getRoomData,
    getAllRoomData: PicoMP.getAllRoomData,
    sendMessage: (msg: any, typeName: string = 'chat') => PicoMP.sendAll(msg, typeName),
  };
};

import { useState, useEffect, useCallback, useRef } from 'react';
import { PicoMP } from '@pico-mp/web';
import { GameState } from '../types/chess';
import { INITIAL_GAME_STATE } from './useChessGame';

export interface PicoMPCallbacks {
  onGameStateChanged: (state: GameState) => void;
}

/**
 * PicoMP SDK를 Web 앱(React)에 매끄럽게 연결하기 위한 커스텀 훅.
 *
 * setRoomData를 활용해 게임 상태를 서버에 보관합니다.
 * 덕분에 새 플레이어가 입장하면 별도 핸드쉐이크 없이 자동으로 현재 상태를 수신합니다.
 */
export const usePicoMP = (callbacks: PicoMPCallbacks) => {
  const cbRef = useRef(callbacks);

  useEffect(() => {
    cbRef.current = callbacks;
  }, [callbacks]);

  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [isOpponentJoined, setIsOpponentJoined] = useState(false);
  const [isConnectionLost, setIsConnectionLost] = useState(false);

  useEffect(() => {
    // [PicoMP 초기화]
    // 런타임(Docker env) → 빌드타임(import.meta.env) 순으로 API 키를 확인합니다.
    const apiKey = (window as Record<string, any>).__ENV__?.VITE_PICO_API_KEY
      || import.meta.env.VITE_PICO_API_KEY;

    if (apiKey) {
      PicoMP.useCloud(apiKey);
      console.log(`[PicoMP] 엔진 초기화 완료 (Official Cloud 모드 활성화)`);
    } else {
      PicoMP.useLocal('http://localhost:7426');
      console.log(`[PicoMP] 엔진 초기화 완료 (Local 백엔드 통신 대기 중: http://localhost:7426)`);
    }

    PicoMP.onConnectionLost = () => {
      console.warn('[PicoMP] 서버와의 연결이 끊어졌습니다.');
      setIsConnectionLost(true);
      setIsConnected(false);
    };

    PicoMP.onError = (error, msg) => {
      console.error(`[PicoMP] 에러 발생 (${error}):`, msg);
      // 필요 시 사용자에게 토스트 알림 등을 띄울 수 있습니다.
    };

    return () => {
      PicoMP.onConnectionLost = null;
      PicoMP.onError = null;
    };
  }, []);

  useEffect(() => {
    if (!isConnected) return;

    // setRoomData로 전파된 게임 상태 변경을 수신합니다.
    // 내가 직접 set한 경우(setBy === 나)는 이미 로컬에 반영했으므로 건너뜁니다.
    PicoMP.onRoomDataChanged = (key, value, setBy) => {
      if (key === 'gameState' && setBy !== PicoMP.getMyPlayerId()) {
        console.log(`[PicoMP] 게임 상태 변경 수신 (from ${setBy})`);
        cbRef.current.onGameStateChanged(value as GameState);
      }
    };

    PicoMP.onPeerJoined = (peerId) => {
      console.log(`[PicoMP] 상대방 접속 완료! : ${peerId}`);
      setIsOpponentJoined(true);
    };

    PicoMP.onPeerLeft = (peerId) => {
      console.log(`[PicoMP] 상대방 퇴장 : ${peerId}`);
      setIsOpponentJoined(false);
    };

    return () => {
      PicoMP.onRoomDataChanged = null;
      PicoMP.onPeerJoined = null;
      PicoMP.onPeerLeft = null;
    };
  }, [isConnected]);

  /**
   * 새로운 체스 방 생성.
   * 방 생성 직후 초기 게임 상태를 룸 데이터로 저장해 나중에 입장하는 플레이어도 동기화됩니다.
   */
  const createMatch = async () => {
    try {
      const res = await PicoMP.createRoom({ maxPlayers: 2 });
      setPlayerId(PicoMP.getMyPlayerId() || '');
      setRoomId(res.roomCode);
      // 초기 게임 상태를 룸 데이터에 기록 — 입장자가 자동으로 수신합니다
      PicoMP.setRoomData('gameState', INITIAL_GAME_STATE);
      setIsConnected(true);
      return res.roomCode;
    } catch (err) {
      console.error('[PicoMP] 방 생성 에러:', err);
      alert('방을 만들 수 없습니다(서버가 꺼져있는지 확인).');
    }
  };

  /**
   * 룸 코드로 방에 입장.
   * 서버가 보관 중인 게임 상태를 getAllRoomData()로 즉시 읽어 보드를 복원합니다.
   * RequestSync/BoardSync 핸드쉐이크가 필요 없습니다.
   */
  const joinMatch = async (joinRoomCode: string) => {
    try {
      await PicoMP.joinRoom(joinRoomCode);
      setPlayerId(PicoMP.getMyPlayerId() || '');
      setRoomId(joinRoomCode);
      setIsOpponentJoined(true);

      // 서버에 보관된 현재 게임 상태를 즉시 읽어 복원합니다
      const saved = PicoMP.getAllRoomData()['gameState'] as GameState | undefined;
      if (saved) {
        console.log('[PicoMP] 기존 게임 상태 복원 완료');
        cbRef.current.onGameStateChanged(saved);
      }

      setIsConnected(true);
    } catch (err) {
      console.error('[PicoMP] 방 접속 에러:', err);
      alert('올바르지 않은 룸 코드이거나 방이 꽉 찼습니다.');
      throw err;
    }
  };

  /**
   * 게임 상태를 룸 데이터에 저장하고 상대방에게 전파합니다.
   * 이 한 줄로 실시간 동기화와 재접속 복원이 동시에 해결됩니다.
   */
  const setGameState = useCallback((state: GameState) => {
    if (!isConnected) return;
    PicoMP.setRoomData('gameState', state);
  }, [isConnected]);

  return {
    isConnected,
    isConnectionLost,
    isOpponentJoined,
    roomId,
    playerId,
    createMatch,
    joinMatch,
    setGameState,
  };
};

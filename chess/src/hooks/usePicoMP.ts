import { useState, useEffect, useCallback, useRef } from 'react';
import { PicoMP } from '@pico-mp/web';

/**
 * 네트워크 패킷 페이로드 (한 턴의 이동 정보)
 */
export interface ChessMoveEventPayload {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
}

export interface PicoMPCallbacks {
  onNetworkMove: (payload: ChessMoveEventPayload) => void;
  onNetworkSync: (state: any) => void;
  onRequestSync: (senderId: string) => void;
  onNetworkReset: () => void;
}

/**
 * PicoMP SDK를 Web 앱(React)에 매끄럽게 연결하기 위한 커스텀 훅.
 * 이 훅에서 PicoMP의 접속/전파(send)/수신(receive) API를 모두 캡슐화합니다.
 */
export const usePicoMP = (callbacks: PicoMPCallbacks) => {
  const cbRef = useRef(callbacks);

  // 리렌더링마다 콜백이 바뀌어 발생하는 불필요한 이벤트 재구독 방지
  useEffect(() => {
    cbRef.current = callbacks;
  }, [callbacks]);

  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [isOpponentJoined, setIsOpponentJoined] = useState(false);
  const [isConnectionLost, setIsConnectionLost] = useState(false);

  // [Bug 3 fix] joinMatch가 setIsConnected(true)를 호출하기 전에 세워두는 플래그.
  // isConnected effect가 구독 등록을 마친 직후 RequestSync를 전송하기 위해 사용.
  // 구독 등록 전에 RequestSync를 보내면 BoardSync 응답을 놓칠 수 있는 race condition 방어.
  const pendingRequestSync = useRef(false);

  useEffect(() => {
    // [PicoMP 초기화]
    // 런타임(Docker env) → 빌드타임(import.meta.env) 순으로 API 키를 확인합니다.
    const apiKey = (window as Record<string, any>).__ENV__?.VITE_PICO_API_KEY
      || import.meta.env.VITE_PICO_API_KEY;

    if (apiKey) {
      // API 키가 존재: SDK 내부의 공식 상용망(Cloud) 서버 주소로 자동 연결됩니다.
      PicoMP.useCloud(apiKey);
      console.log(`[PicoMP] 엔진 초기화 완료 (Official Cloud 모드 활성화)`);
    } else {
      // API 키가 없음: 개발을 위한 로컬 서버(기본 포트 7426) 버전을 사용합니다.
      PicoMP.useLocal('http://localhost:7426');
      console.log(`[PicoMP] 엔진 초기화 완료 (Local 백엔드 통신 대기 중: http://localhost:7426)`);
    }

    // [4번 이슈 해결] 네트워크 단절(소켓 끊어짐) 감지
    PicoMP.onConnectionLost = () => {
      console.warn('[PicoMP] 서버와의 연결이 끊어졌습니다.');
      setIsConnectionLost(true);
      setIsConnected(false);
    };

    return () => {
      PicoMP.onConnectionLost = null;
    };
  }, []);

  useEffect(() => {
    // 방에 접속(isConnected)된 상태일 때만 네트워크 이벤트를 구독(Subscribe)합니다.
    if (!isConnected) return;

    // 1. 상대방의 체스 말 이동 이벤트 수신 ('ChessMove' 커스텀 이벤트)
    const unsubMove = PicoMP.onReceive<ChessMoveEventPayload>('ChessMove', (senderId, payload) => {
      console.log(`[PicoMP] 상대편(${senderId})의 말 이동:`, payload);
      cbRef.current.onNetworkMove(payload);
    });

    // 보드 상태 동기화 응답 수신
    const unsubSync = PicoMP.onReceive<any>('BoardSync', (_, payload) => {
      console.log(`[PicoMP] 상태 동기화 스냅샷 수신 완료`);
      cbRef.current.onNetworkSync(payload);
    });

    // 방에 새로 접속한 유저의 상태 동기화 요청 수신
    const unsubReqSync = PicoMP.onReceive<void>('RequestSync', (senderId) => {
      console.log(`[PicoMP] 상태 동기화 요청 받음 (from ${senderId})`);
      cbRef.current.onRequestSync(senderId);
    });

    // 상대방이 보낸 게임 리셋 요청 수신
    const unsubReset = PicoMP.onReceive<void>('ResetGame', (senderId) => {
      console.log(`[PicoMP] 게임 리셋 요청 받음 (from ${senderId})`);
      cbRef.current.onNetworkReset();
    });

    // 2. 새로운 플레이어의 방 입장 감지 (시스템 이벤트 → onPeerJoined 핸들러 사용)
    PicoMP.onPeerJoined = (peerId) => {
      console.log(`[PicoMP] 상대방 접속 완료! : ${peerId}`);
      setIsOpponentJoined(true);
    };

    // 3. 기존 플레이어의 방 퇴장 감지 (시스템 이벤트 → onPeerLeft 핸들러 사용)
    PicoMP.onPeerLeft = (peerId) => {
      console.log(`[PicoMP] 상대방 퇴장 : ${peerId}`);
      setIsOpponentJoined(false);
    };

    // [Bug 3 fix] 모든 구독이 등록된 후 RequestSync를 전송.
    // joinMatch 내에서 직접 보내면 이 effect가 아직 실행되기 전이라 BoardSync 응답을 놓칠 수 있음.
    if (pendingRequestSync.current) {
      pendingRequestSync.current = false;
      PicoMP.sendAll({}, 'RequestSync');
    }

    return () => {
      unsubMove();
      unsubSync();
      unsubReqSync();
      unsubReset();
      PicoMP.onPeerJoined = null;
      PicoMP.onPeerLeft   = null;
    };
  }, [isConnected]);

  /**
   * 새로운 체스 방 생성
   * maxPlayers를 2로 제한함으로써 1대1 매치 외의 관전자 난입을 방지하는 모범 사례를 따릅니다.
   */
  const createMatch = async () => {
    try {
      // PicoMP.createRoom() API: 방 개설. 식별자(playerId)는 서버에서 자동 생성 및 부여
      const res = await PicoMP.createRoom({ maxPlayers: 2 });

      setPlayerId(PicoMP.getMyPlayerId() || '');
      setRoomId(res.roomCode);
      setIsConnected(true);
      return res.roomCode;
    } catch (err) {
      console.error('[PicoMP] 방 생성 에러:', err);
      alert('방을 만들 수 없습니다(서버가 꺼져있는지 확인).');
    }
  };

  /**
   * 생성된 룸 코드(6자리 문자)를 통해 방에 입장(Join)
   * 1대1 게임이므로 늦게 들어온 사람이 항상 (White의 타겟) Black 턴을 가지게 됩니다.
   */
  const joinMatch = async (joinRoomCode: string) => {
    try {
      // PicoMP.joinRoom API: 코드를 전송하여 방 합류를 시도합니다.
      await PicoMP.joinRoom(joinRoomCode);
      setPlayerId(PicoMP.getMyPlayerId() || '');
      setRoomId(joinRoomCode);
      setIsOpponentJoined(true);
      // [Bug 3 fix] RequestSync를 여기서 직접 보내지 않고 isConnected effect에 위임.
      // effect가 구독을 모두 등록한 뒤 전송하므로 BoardSync 응답 누락 위험이 없음.
      pendingRequestSync.current = true;
      setIsConnected(true);
    } catch (err) {
      console.error('[PicoMP] 방 접속 에러:', err);
      alert('올바르지 않은 룸 코드이거나 방이 꽉 찼습니다.');
      // [Bug 1 fix] 에러를 re-throw해서 호출부(handleJoinRoom)가 실패를 감지하도록 함.
      // 없으면 joinMatch 실패 시에도 setMyColor('black')과 sessionStorage 저장이 실행됨.
      throw err;
    }
  };

  /**
   * 내가 말을 움직였을 때(로컬 이벤트 발생) 해당 수의 정보를 같은 방 안의 플레이어에게 전송
   */
  const broadcastMove = useCallback((payload: ChessMoveEventPayload) => {
    if (!isConnected) return;
    PicoMP.sendAll(payload, 'ChessMove');
  }, [isConnected]);

  // 체스판 전체 스냅샷 통째로 브로드캐스트
  const broadcastSync = useCallback((state: any) => {
    if (!isConnected) return;
    PicoMP.sendAll(state, 'BoardSync');
  }, [isConnected]);

  // 내가 방금 들어왔으니 보드 상태를 달라고 요청 브로드캐스트
  const broadcastRequestSync = useCallback(() => {
    if (!isConnected) return;
    PicoMP.sendAll({}, 'RequestSync');
  }, [isConnected]);

  // [Bug 2 fix] 게임 리셋 신호를 상대방에게 전파
  const broadcastReset = useCallback(() => {
    if (!isConnected) return;
    PicoMP.sendAll({}, 'ResetGame');
  }, [isConnected]);

  return {
    isConnected,
    isConnectionLost,
    isOpponentJoined,
    roomId,
    playerId,
    createMatch,
    joinMatch,
    broadcastMove,
    broadcastSync,
    broadcastRequestSync,
    broadcastReset,
  };
};

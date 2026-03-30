import { useState, useCallback, useEffect, useRef } from 'react';
import { usePicoMP, CursorData } from './hooks/usePicoMP';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer2, User, Globe, Users } from 'lucide-react';

const AVATARS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', 
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐣', '🦖', '🦄', '🐝', '🐙'
];

/**
 * [Pico Cursor Party Demo]
 * PicoMP SDK의 sendAll()을 이용한 고주파수 실시간 좌표 동기화 예제입니다.
 * 
 * 주요 포인트:
 * 1. 마우스 이동(onMouseMove) 시 60fps에 근접한 속도로 좌표 패킷 전송
 * 2. 전송 오버헤드를 줄이기 위해 room_data가 아닌 sendAll relay 사용
 * 3. 다른 모든 플레이어의 캐릭터를 로컬 Map 객체로 추적하고 렌더링
 */
export default function App() {
  const [myEmoji, setMyEmoji] = useState('🐼');
  const [myName, setMyName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  
  // 모든 플레이어의 실시간 위치 저장 (PeerID -> {x, y, emoji, name})
  const [remoteCursors, setRemoteCursors] = useState<Map<string, CursorData>>(new Map());
  const [myPos, setMyPos] = useState({ x: 0, y: 0 });

  const { isConnected, playerId, peers, broadcastPosition, joinRoom, createRoom } = usePicoMP(
    // [PicoMP] 상대방이 보낸 'move' 타입 메시지를 수신하여 로컬 맵 갱신
    (id, data) => {
      setRemoteCursors(prev => {
        const next = new Map(prev);
        next.set(id, data);
        return next;
      });
    }
  );

  // 마우스 이동 시 내 위치를 기록하고 다른 사람에게 즉시 알립니다
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isConnected) return;
    const pos = { x: e.clientX, y: e.clientY };
    setMyPos(pos);
    
    // [PicoMP] sendAll을 사용해 방 안의 모든 사람에게 내 캐릭터 위치 전송
    broadcastPosition({ ...pos, emoji: myEmoji, name: myName || `Player ${playerId.slice(0,4)}` });
  }, [isConnected, myEmoji, myName, playerId, broadcastPosition]);

  return (
    <div className="playground h-screen w-full relative overflow-hidden" onMouseMove={handleMouseMove}>
      <AnimatePresence>
        {!isConnected ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md"
          >
            <div className="glass-panel w-full max-w-sm text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-black p-4 text-white">
                  <MousePointer2 size={32} />
                </div>
              </div>
              <h1 style={{ margin: '0 0 10px 0', fontSize: '28px', fontWeight: 900 }}>CURSOR PARTY</h1>
              <p style={{ margin: '0 0 24px 0', color: '#666' }}>멀티플레이 마우스 파티에 참여하세요!</p>

              <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(0,0,0,0.03)', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 700, color: '#888' }}>SELECT AVATAR</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  {AVATARS.map(a => (
                    <button 
                      key={a}
                      onClick={() => setMyEmoji(a)}
                      style={{ 
                        fontSize: '24px', padding: '8px', borderRadius: '12px', border: 'none',
                        background: myEmoji === a ? 'white' : 'transparent',
                        boxShadow: myEmoji === a ? '0 4px 10px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer'
                      }}
                    >{a}</button>
                  ))}
                </div>
              </div>

              <input 
                value={myName} onChange={e => setMyName(e.target.value)}
                placeholder="YOUR NAME" 
                style={{ width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: '12px', marginBottom: '16px', textAlign: 'center', fontWeight: 'bold' }}
              />

              <div className="flex flex-col gap-2">
                 <button onClick={() => createRoom()} className="btn w-full">🎉 CREATE PARTY</button>
                 <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input 
                      value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())}
                      placeholder="ROOM CODE" 
                      style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '12px', textAlign: 'center' }}
                    />
                    <button onClick={() => joinRoom(roomCode)} style={{ padding: '0 20px', borderRadius: '12px', border: 'none', background: '#333', color: 'white', fontWeight: 'bold' }}>JOIN</button>
                 </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Header info bar */}
            <div style={{ position: 'fixed', top: '20px', left: '20px', zIndex: 100, pointerEvents: 'none' }} className="glass-panel py-3 px-6 flex items-center gap-6">
                <div className="flex items-center gap-2">
                   <Users size={16} /> <span style={{ fontWeight: 800 }}>{peers.length + 1} ONLINE</span>
                </div>
                <div style={{ width: '1px', height: '16px', background: '#ddd' }} />
                <div style={{ color: '#888', fontSize: '14px' }}>Move your mouse to play!</div>
            </div>

            {/* My Cursor */}
            <div 
               className="avatar-container" 
               style={{ 
                 left: 0, top: 0, 
                 transform: `translate(${myPos.x - 24}px, ${myPos.y - 24}px)` 
               }}
            >
              <div className="avatar-blob" style={{ background: '#ff6b6b' }}>{myEmoji}</div>
              <div className="avatar-name">YOU</div>
            </div>

            {/* Remote Cursors */}
            {Array.from(remoteCursors.entries()).map(([id, data]) => (
              <div 
                key={id} 
                className="avatar-container" 
                style={{ 
                   left: 0, top: 0,
                   transform: `translate(${data.x - 24}px, ${data.y - 24}px)`,
                   zIndex: 5
                }}
              >
                <div className="avatar-blob" style={{ background: 'white' }}>{data.emoji}</div>
                <div className="avatar-name">{data.name}</div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

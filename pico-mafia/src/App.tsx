import { useState, useEffect, useRef, useMemo } from 'react';
import { usePicoMP } from './hooks/usePicoMP';
import { useMafiaGame } from './hooks/useMafiaGame';
import type { ChatMessage } from './types';
import { 
  Hash, 
  Settings, 
  Mic, 
  Headphones, 
  Users, 
  Plus, 
  Compass, 
  Skull, 
  Lock,
  ChevronDown,
  Info,
  UserX,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * [Pico Mafia Demo - Discord Edition]
 * PicoMP SDK를 활용한 디스코드 스타일의 마피아 게임 예제입니다.
 * 
 * 디자인 포인트:
 * 1. Discord 3단 레이아웃 (서버사이드바 - 채널바 - 채팅/멤버리스트)
 * 2. 게임 상태(Phase)를 보이스 채널 및 채팅 채널 잠금 상태로 시각화
 * 3. 시스템 메시지를 Discord Embed 스타일로 표현
 */
export default function App() {
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  const [isChannelSidebarOpen, setChannelSidebarOpen] = useState(false);
  const [isMemberSidebarOpen, setMemberSidebarOpen] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const {
    isConnected, isConnectionLost, roomId, playerId, peers,
    createMatch, joinMatch, sendMessage, setRoomData
  } = usePicoMP({
    onRoomDataChanged: (k, v) => {
      if (k === 'gameState') syncGame(v);
    },
    onReceiveMessage: (senderId, msg) => {
      setChatMessages(prev => [...prev, {
        id: Math.random().toString(),
        senderId,
        senderName: msg.senderName,
        text: msg.text,
        timestamp: Date.now(),
        type: 'chat'
      }]);
    },
    onSyncReady: (all) => {
      if (all.gameState) syncGame(all.gameState);
    }
  });

  const { gameState, syncGame, startGame, myRole } = useMafiaGame(playerId, setRoomData);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages]);

  const handleCreate = async () => {
    await createMatch({ maxPlayers: 10 });
  };

  const handleJoin = async () => {
    if (inputRoomCode) await joinMatch(inputRoomCode);
  };

  const handleStart = () => {
    if (peers.length >= 0) startGame(peers);
  };

  const handleSendChat = () => {
    if (inputText.trim()) {
      const msg = { text: inputText, senderName: `Player${playerId.substring(0, 4)}` };
      sendMessage(msg, 'chat');
      setChatMessages(prev => [...prev, {
        id: Math.random().toString(),
        senderId: playerId,
        senderName: 'Me',
        text: inputText,
        timestamp: Date.now(),
        type: 'chat'
      }]);
      setInputText('');
    }
  };

  const myPlayer = useMemo(() => gameState.players.find(p => p.id === playerId), [gameState, playerId]);
  const isDead = myPlayer?.isAlive === false;

  const alivePlayers = useMemo(() => gameState.players.filter(p => p.isAlive), [gameState.players]);
  const deadPlayers = useMemo(() => gameState.players.filter(p => !p.isAlive), [gameState.players]);

  // 1. 초기 입장 화면 (Discord Invite Style)
  if (!isConnected) {
    return (
      <div className="discord-container items-center justify-center bg-discord-main">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ width: '480px' }} 
          className="bg-discord-main p-8 rounded-lg shadow-2xl overflow-hidden lobby-card"
        >
          <div className="lobby-icon-container">
            <Skull size={40} />
          </div>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">PICO MAFIA SERVER</h1>
            <p className="text-[#949BA4]">초대 코드를 입력하거나 새로운 게임 서버를 개설하세요.</p>
          </div>

          <div className="space-y-6">
             <div className="flex flex-col">
               <label className="text-xs font-bold text-[#B5BAC1] uppercase mb-2 block">ROOM CODE (UPLINK ID)</label>
               <input 
                 value={inputRoomCode}
                 onChange={e => setInputRoomCode(e.target.value.toUpperCase())}
                 className="w-full bg-discord-dark p-3 rounded text-white border-none outline-none"
                 placeholder="예: XY7Z9K"
               />
             </div>
             
             <div className="flex flex-col gap-3">
               <button onClick={handleJoin} className="discord-btn">서버 참가하기</button>
               <div className="discord-divider">
                 <span className="text-xs text-[#949BA4] font-bold">또는</span>
               </div>
               <button onClick={handleCreate} className="discord-btn bg-discord-green">새 프로젝트 서버 개설</button>
             </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // 2. 메인 게임 화면 (Discord App Layout)
  return (
    <div className="discord-container">
      {/* (1) 서버 사이드바 */}
      <nav className="server-sidebar">
         <div className="server-icon pico active">
            <Skull size={28} />
         </div>
         <div className="w-8 h-[2px] bg-white/10 my-1" />
         <div className="server-icon"> <Plus size={24} /> </div>
         <div className="server-icon"> <Compass size={24} /> </div>
      </nav>

      {/* (2) 채널 사이드바 */}
      <section className={cn("channel-sidebar", isChannelSidebarOpen && "open")}>
         <header className="sidebar-header" onClick={() => setChannelSidebarOpen(false)}>
            PicoMP Server <ChevronDown className="ml-auto" size={18} />
         </header>
         
         <div className="channel-list">
            <div className="mb-4">
              <div className="text-[11px] font-bold text-[#949BA4] flex items-center gap-2 uppercase tracking-wide px-2 mb-1">
                <ChevronDown size={12} /> Public Access
              </div>
              <div className={cn("channel-item", gameState.phase === 'discussion' && "active")}>
                <Hash size={18} className="mr-1.5 opacity-60" /> discussion
              </div>
              <div className={cn("channel-item", gameState.phase === 'voting' && "active")}>
                <Hash size={18} className="mr-1.5 opacity-60" /> voting-booth
              </div>
            </div>

            {myRole === 'mafia' && (
              <div className="mb-4">
                <div className="text-[11px] font-bold text-[#ED4245] flex items-center gap-2 uppercase tracking-wide px-2 mb-1">
                  <Lock size={12} /> Mafia Secret
                </div>
                <div className="channel-item">
                  <Hash size={18} className="mr-1.5 opacity-60" /> hideout
                </div>
              </div>
            )}

            <div>
              <div className="text-[11px] font-bold text-[#949BA4] flex items-center gap-2 uppercase tracking-wide px-2 mb-1">
                <ChevronDown size={12} /> Voice Channels
              </div>
              <div className="channel-item">
                <Volume2 size={18} className="mr-1.5 opacity-60" /> General Lobby
              </div>
              <div className="pl-8 flex flex-col gap-1 mt-1">
                 {alivePlayers.map(p => (
                   <div key={p.id} className="flex items-center gap-2 py-1 text-sm text-[#949BA4]">
                      <div className="w-4 h-4 rounded-full bg-orange-500 overflow-hidden" /> {p.name}
                   </div>
                 ))}
              </div>
            </div>
         </div>

         {/* 유저 상태 바 (하단) */}
         <footer className="bg-[#232428] p-2 flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-blue-500" />
              <div className="member-status status-online bg-[#2B2D31]" />
            </div>
            <div className="flex-1 overflow-hidden">
               <div className="text-white text-xs font-bold truncate">Player{playerId.substring(0, 4)}</div>
               <div className="text-[#949BA4] text-[10px]">#{playerId.substring(0, 4)}</div>
            </div>
            <div className="flex gap-1 text-[#B5BAC1]">
               <Mic size={16} /> <Headphones size={16} /> <Settings size={16} />
            </div>
         </footer>
      </section>

      {/* (3) 중앙 채팅창 */}
      <main className="chat-area" onClick={() => { setChannelSidebarOpen(false); setMemberSidebarOpen(false); }}>
         <header className="chat-header">
            {isMobile && (
              <button 
                className="bg-transparent border-none text-[#949BA4] cursor-pointer mr-2"
                onClick={(e) => { e.stopPropagation(); setChannelSidebarOpen(!isChannelSidebarOpen); }}
              >
                 <Hash size={24} />
              </button>
            )}
            <span className="text-white font-bold">{gameState.phase}</span>
            <div className="ml-auto flex items-center gap-4 text-[#B5BAC1]">
               {!isMobile && (
                 <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> UPLINK: {roomId}
                 </div>
               )}
               {isMobile && (
                 <button 
                   className="bg-transparent border-none text-[#B5BAC1] cursor-pointer"
                   onClick={(e) => { e.stopPropagation(); setMemberSidebarOpen(!isMemberSidebarOpen); }}
                 >
                    <Users size={20} />
                 </button>
               )}
            </div>
         </header>

         <div className="chat-messages" ref={chatScrollRef}>
            {/* 웰컴 메시지 */}
            <div className="px-4 py-8">
               <div className="w-16 h-16 rounded-full bg-[#404249] flex items-center justify-center mb-4">
                  <Users size={32} className="text-[#DBDEE1]" />
               </div>
               <h1 className="text-3xl font-bold text-white mb-2">Welcome to #{gameState.phase}!</h1>
               <p className="text-[#949BA4]">여기는 서버의 시작 지점입니다.</p>
               <div className="h-px bg-white/5 my-6" />
            </div>

            {/* 실제 채팅 히스토리 */}
            {chatMessages.map(m => (
              <div key={m.id} className="message hover:bg-black/5 transition-colors">
                 <div className="avatar"> {m.senderName[0]} </div>
                 <div className="message-content">
                    <div className="flex items-baseline">
                       <span className="message-user" style={{ color: m.senderId === playerId ? '#5865F2' : 'white' }}>{m.senderName}</span>
                       <span className="message-time">오늘 {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="message-text"> {m.text} </div>
                 </div>
              </div>
            ))}

            {/* 시스템 공지 (Discord Embed Style) */}
            {gameState.phase !== 'waiting' && (
              <div className="message">
                 <div className="avatar bg-red-500"> <Info size={24} /> </div>
                 <div className="message-content">
                    <div className="embed border-l-[#5865F2]">
                       <div className="embed-title">🚨 시스템 공지 - {gameState.phase}</div>
                       <div className="text-sm text-[#DBDEE1]">
                          {gameState.phase === 'discussion' 
                            ? "토론 시간입니다. 의심스러운 인물을 찾아내세요." 
                            : "투표가 시작되었습니다. 제거할 대상의 이름을 클릭하세요."}
                       </div>
                    </div>
                 </div>
              </div>
            )}
         </div>

         {/* 투표 액션바 (페이즈에 따라 표시) */}
         {gameState.phase === 'voting' && !isDead && (
           <div className="px-4 pb-4">
              <div className="bg-[#2B2D31] p-4 rounded-lg flex items-center justify-between">
                 <span className="text-sm font-bold text-white uppercase italic">Target Locked: {voteTarget ? `Player${voteTarget.substring(0,4)}` : "Not Selected"}</span>
                 <button disabled={!voteTarget} className="discord-btn danger px-8">VOTE NOW</button>
              </div>
           </div>
         )}

         {/* 채팅 입력바 */}
         <div className="chat-input-container">
            <div className="chat-input-wrapper">
               <Plus className="text-[#B5BAC1] mr-4 cursor-pointer" />
               <input 
                 disabled={isDead}
                 value={inputText}
                 onChange={e => setInputText(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                 className="chat-input"
                 placeholder={isDead ? "당신은 이미 처형되었습니다. 관전자 모드입니다." : `#${gameState.phase} 채널에 메시지 보내기`}
               />
            </div>
         </div>
      </main>

      {/* (4) 우측 멤버 리스트 */}
      <aside className={cn("member-sidebar", isMemberSidebarOpen && "open")}>
         <div className="member-group-title" onClick={() => setMemberSidebarOpen(false)}>생존자 — {alivePlayers.length}</div>
         {alivePlayers.map(p => (
           <div 
             key={p.id} 
             onClick={() => gameState.phase === 'voting' && setVoteTarget(p.id)}
             className={cn("member-item", voteTarget === p.id && "bg-white/5")}
           >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center font-bold text-xs" style={{ background: p.id === playerId ? '#5865F2' : '#3F4147' }}>
                   {p.name[0]}
                </div>
                <div className="member-status status-online" />
              </div>
              <div className={cn("text-sm font-medium", p.id === playerId ? "text-white" : "text-[#949BA4]")}>{p.name}</div>
              {gameState.phase === 'voting' && !isDead && p.id !== playerId && <UserX size={14} className="ml-auto opacity-0 group-hover:opacity-100" />}
           </div>
         ))}

         <div className="member-group-title mt-6">제거됨 — {deadPlayers.length}</div>
         {deadPlayers.map(p => (
           <div key={p.id} className="member-item grayscale opacity-40">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-[#1E1F22] flex items-center justify-center"> <Skull size={18} /> </div>
                <div className="member-status status-offline" />
              </div>
              <div className="text-sm font-medium">{p.name}</div>
           </div>
         ))}

         {gameState.phase === 'waiting' && peers.length > 0 && playerId === (gameState.players[0]?.id || playerId) && (
           <div className="mt-8 px-2">
              <button onClick={handleStart} className="discord-btn w-full bg-[#23A559] hover:bg-[#1C8B46]">게임 시작하기</button>
           </div>
         )}
      </aside>

      {/* 연결 유실 오버레이 */}
      <AnimatePresence>
        {isConnectionLost && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center text-center backdrop-blur-sm">
             <div className="bg-[#313338] p-8 rounded-lg shadow-2xl max-w-sm">
                <Skull size={48} className="text-[#ED4245] mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">연결이 끊겼습니다</h2>
                <p className="text-[#949BA4] mb-6">RTC 게이트웨이와의 통신이 원활하지 않습니다.</p>
                <button onClick={() => window.location.reload()} className="discord-btn w-full">다시 접속하기</button>
             </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Utility for class merging */
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

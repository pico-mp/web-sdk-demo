import { useState, useEffect } from 'react';
import './index.css';
import { useChessGame } from './hooks/useChessGame';
import { ChessBoard } from './components/ChessBoard';
import { PrisonCamp } from './components/PrisonCamp';
import { usePicoMP, ChessMoveEventPayload } from './hooks/usePicoMP';
import { getSafeValidMoves, pieceInfo } from './engine/rules';

function App() {
  const { 
    board, turn, winner, isCheck, 
    deadPiecesWhite, deadPiecesBlack, 
    executeMove, resetGame, syncGame
  } = useChessGame();

  // [핵심] PicoMP를 통해 네트워크에서 들어온 'ChessMove' 이벤트를 처리하는 핸들러
  const handleNetworkMove = (payload: ChessMoveEventPayload) => {
    const { fromRow, fromCol, toRow, toCol } = payload;
    
    // 1. 내 턴(myColor)에 수신된 패킷이면 무시합니다. (상대방이 불법적으로 내 턴에 움직임을 보낼 경우 대비)
    if (turn === myColor) return; 

    const targetPiece = pieceInfo(board[fromRow][fromCol]);
    
    // 2. 조작하려는 기물이 존재하지 않거나, 상대방의 소유가 아닌 기물을 조작하려 했다면 핵(부정행위)으로 간주
    if (!targetPiece || targetPiece.color !== turn) {
      alert("⚠️ 핵(부정행위) 감지: 턴에 맞지 않는 기물(상대 기물)을 강제로 조작/이동 시켰습니다!");
      return;
    }

    // 3. (Anti-Cheat) 하객(상대방)이 보낸 움직임 좌표가 체스 룰에 어긋나지 않는지 1차 엔진 검증
    // 이를 통해 클라이언트 변조를 통한 비정상적인 말이동 텔레포트를 완벽히 차단합니다.
    const opponentValidMoves = getSafeValidMoves(board, fromRow, fromCol, turn);
    const cheatingDetected = !opponentValidMoves.some(m => m[0] === toRow && m[1] === toCol);
    
    if (cheatingDetected) {
      alert("차단됨: 적이 물리적으로 불가능한 수를 전송했습니다.");
      return;
    }
    
    // 모든 검증을 통과했다면 로컬 게임 엔진에 통과된 움직임 반영
    executeMove(fromRow, fromCol, toRow, toCol);
  };

  // 커스텀 훅을 통해 PicoMP 모듈의 모든 이벤트 통신부 초기화
  const {
    isConnected, isConnectionLost, isOpponentJoined, roomId,
    createMatch, joinMatch, broadcastMove, broadcastSync, broadcastReset
  } = usePicoMP({
    onNetworkMove: handleNetworkMove,
    // [1번 이슈 관련] 상대가 상태 스냅샷을 쏴주면, 오프라인 체스판 정보를 그대로 덮어씌움
    onNetworkSync: (state) => syncGame(state),
    // [1번 이슈 관련] 새로 접속/재접속한 유저가 정보 동기화를 요청하면, 내 보드 상태를 통째로 넘겨줌
    onRequestSync: () => {
      broadcastSync({ board, turn, winner, deadPiecesWhite, deadPiecesBlack });
    },
    // [Bug 2 fix] 상대방이 보낸 리셋 신호 수신 시 내 보드도 초기화
    onNetworkReset: () => resetGame(),
  });

  const [inputRoomCode, setInputRoomCode] = useState('');
  const [myColor, setMyColor] = useState<'white' | 'black' | null>(null);

  // [3번 이슈 예방] 세션 유지 시스템 - F5 또는 브라우저 이탈로 인한 게임 세션 휘발 방어
  useEffect(() => {
    const saved = sessionStorage.getItem('pico_chess_session');
    if (saved) {
      try {
        const { room, color } = JSON.parse(saved);
        // 저장된 방 코드로 즉시 재시작(Join)을 시도합니다. 연결되면 joinMatch 내부에서 알아서 RequestSync를 발송하여 상태도 복구됩니다!
        joinMatch(room).then(() => setMyColor(color));
      } catch(e) { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateRoom = async () => {
    const code = await createMatch();
    if (code) {
      setMyColor('white');
      sessionStorage.setItem('pico_chess_session', JSON.stringify({ room: code, color: 'white' }));
    }
  };

  const handleJoinRoom = async (codeToJoin: string) => {
    if (!codeToJoin) return;
    try {
      await joinMatch(codeToJoin);
      setMyColor('black');
      sessionStorage.setItem('pico_chess_session', JSON.stringify({ room: codeToJoin, color: 'black' }));
    } catch {
      // joinMatch가 이미 alert를 표시하므로 여기서는 상태 변경 없이 종료
    }
  };

  // [Bug 2 fix] 로컬 리셋 후 상대방에게도 리셋 신호 전파
  const handleResetGame = () => {
    resetGame();
    broadcastReset();
  };

  // UI에서 발생하는 로컬의 말 이동 조작 이벤트
  const handleLocalMove = (fromRow: number, fromCol: number, toRow: number, toCol: number) => {
    // 먼저 내 화면(엔진)에 즉시 움직임을 반영
    executeMove(fromRow, fromCol, toRow, toCol);
    
    // 네트워크에 연결된 상태라면, 해당 움직임을 상대방에게 전파(브로드캐스트)
    if (isConnected) {
      broadcastMove({ fromRow, fromCol, toRow, toCol });
    }
  }

  return (
    <div className="game-container">
      {/* [4번 이슈 방어] 서버 네트워크 유실/종료 시 경고용 오버레이 노출 */}
      {isConnectionLost && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ color: '#ff6b6b' }}>서버 통신 유실 ⚠️</h2>
          <p style={{ color: 'white', maxWidth: '300px', textAlign: 'center' }}>
            네트워크 연결이 끊어졌거나 서버가 종료되었습니다. 브라우저를 새로고침하여 재접속을 시도하세요.
          </p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>새로고침</button>
        </div>
      )}

      {/* 왼쪽: 체스판 영역 */}
      <div className="board-area">
        <div className="player-info">
          {/* 상대방 아바타: 내 색깔의 반대 색을 표시 */}
          <div className="avatar" style={{ background: myColor === 'white' ? '#333' : '#eee', color: myColor === 'white' ? '#fff' : '#000' }}>
            {myColor ? (myColor === 'white' ? 'B' : 'W') : '?'}
          </div>
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {isOpponentJoined ? 'Opponent' : 'Waiting for Opponent...'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {isOpponentJoined ? 'Online' : 'Open for join'}
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            {myColor && turn !== myColor && <span className="status-badge online">Thinking...</span>}
          </div>
        </div>

        <div style={{ opacity: isConnected && !isOpponentJoined ? 0.6 : 1, transition: '0.4s' }}>
          <ChessBoard 
            board={board} 
            turn={turn} 
            myColor={myColor}
            winner={winner} 
            inCheck={isCheck} 
            onMoveCommand={handleLocalMove} 
            flipped={myColor === 'black'}
          />
        </div>

        <div className="player-info">
          {/* 내 아바타: 내 실제 색깔 표시 */}
          <div className="avatar" style={{ background: myColor === 'black' ? '#333' : '#eee', color: myColor === 'black' ? '#fff' : '#000' }}>
            {myColor ? (myColor === 'white' ? 'W' : 'B') : '?'}
          </div>
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {myColor ? `You (${myColor.toUpperCase()})` : 'Spectating'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status: Active</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            {myColor && turn === myColor && <span className="status-badge online">Your Turn</span>}
            {isCheck && <span style={{ marginLeft: '10px', color: '#ff6b6b', fontWeight: 'bold' }}>CHECK!</span>}
          </div>
        </div>
      </div>

      {/* 오른쪽: 사이드 정보 패널 */}
      <div className="side-panel">
        <h2 style={{ margin: 0, color: 'var(--accent)' }}>ingChess</h2>
        
        {!isConnected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>멀티플레이를 위해 방을 만들거나 코드로 입장하세요.</p>
            <button 
              className="btn btn-primary"
              onClick={handleCreateRoom}
            >Create Room (White)</button>
            <div style={{ borderTop: '1px solid #444', margin: '10px 0' }}></div>
            <input 
              className="room-input"
              value={inputRoomCode} 
              onChange={e => setInputRoomCode(e.target.value.toUpperCase())} 
              placeholder="Room Code"
              style={{ background: '#1a1917', border: '1px solid #444', padding: '10px', borderRadius: '4px', color: 'white' }}
            />
            <button 
              className="btn btn-secondary"
              onClick={() => handleJoinRoom(inputRoomCode)}
            >Join as Black</button>
          </div>
        ) : (
          <div>
            <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: 'var(--text-muted)' }}>ROOM CODE</p>
            <div className="room-code-display">{roomId}</div>
            <p style={{ fontSize: '13px', color: 'var(--accent)' }}>
              {myColor === 'white' ? 'Share this code with your friend!' : 'Successfully joined the room!'}
            </p>
          </div>
        )}

        <div style={{ marginTop: 'auto' }}>
          <p style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Captured Pieces</p>
          <PrisonCamp deadWhite={deadPiecesWhite} deadBlack={deadPiecesBlack} />
        </div>

        <button 
          className="btn btn-secondary" 
          style={{ marginTop: '20px' }}
          onClick={handleResetGame}
        >Reset Board</button>

        {winner && (
          <div style={{ padding: '20px', background: 'rgba(129, 182, 76, 0.2)', border: '1px solid var(--accent)', borderRadius: '8px', color: 'var(--accent)', fontWeight: 'bold' }}>
            🏆 {winner.toUpperCase()} WINS!
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

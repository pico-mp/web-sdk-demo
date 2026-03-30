import { useState, useEffect } from 'react';
import './index.css';
import { useChessGame, INITIAL_GAME_STATE } from './hooks/useChessGame';
import { ChessBoard } from './components/ChessBoard';
import { PrisonCamp } from './components/PrisonCamp';
import { usePicoMP } from './hooks/usePicoMP';

function App() {
  const {
    board, turn, winner, isCheck,
    deadPiecesWhite, deadPiecesBlack,
    executeMove, resetGame, syncGame
  } = useChessGame();

  const {
    isConnected, isConnectionLost, isOpponentJoined, roomId,
    createMatch, joinMatch, setGameState,
  } = usePicoMP({
    // setRoomData로 전파된 상대방의 게임 상태를 수신해 보드에 반영합니다
    onGameStateChanged: (state) => syncGame(state),
  });

  const [inputRoomCode, setInputRoomCode] = useState('');
  const [myColor, setMyColor] = useState<'white' | 'black' | null>(null);

  // 세션 유지 시스템 - F5 또는 브라우저 이탈 후 재접속 시 자동 복원
  // PicoMP.getAllRoomData()가 서버에 보관된 상태를 바로 돌려주므로 별도 동기화 요청이 불필요합니다
  useEffect(() => {
    const saved = sessionStorage.getItem('pico_chess_session');
    if (saved) {
      try {
        const { room, color } = JSON.parse(saved);
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

  // 말 이동: 로컬 엔진에 적용하고, 결과 상태를 setRoomData로 전파합니다
  const handleLocalMove = (fromRow: number, fromCol: number, toRow: number, toCol: number) => {
    const newState = executeMove(fromRow, fromCol, toRow, toCol);
    if (newState && isConnected) {
      setGameState(newState);
    }
  };

  // 리셋: 초기 상태를 setRoomData로 전파해 상대방 보드도 함께 초기화합니다
  const handleResetGame = () => {
    resetGame();
    if (isConnected) {
      setGameState(INITIAL_GAME_STATE);
    }
  };

  return (
    <div className="game-container">
      {/* 서버 네트워크 유실/종료 시 경고용 오버레이 */}
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
        <h2 style={{ margin: 0, color: 'var(--accent)' }}>pico-chess</h2>

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

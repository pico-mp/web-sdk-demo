import { useState } from 'react';
import { BoardState, Color } from '../types/chess';
import { pieceInfo, checkMateTest, isKingInCheck } from '../engine/rules';

// 체스 보드의 초기 상태 (소문자: Black, 대문자: White)
export const INITIAL_BOARD: BoardState = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
];

/**
 * [오프라인 게임 엔진]
 * PicoMP(네트워크 통신)와 독립적으로 체스 보드의 상태, 턴, 캡처된/사망한 기물을 관리합니다.
 * 백엔드 서버 개입 없이 100% 프론트엔드상에서 동작합니다.
 */
export const useChessGame = () => {
  const [board, setBoard] = useState<BoardState>(INITIAL_BOARD);
  const [turn, setTurn] = useState<Color>('white');
  const [winner, setWinner] = useState<Color | null>(null);
  const [deadPiecesWhite, setDeadPiecesWhite] = useState<string[]>([]);
  const [deadPiecesBlack, setDeadPiecesBlack] = useState<string[]>([]);

  /**
   * 지정된 좌표에서 목표 좌표로 기물을 이동시키는 실제 로직
   * @param sr 시작 row
   * @param sc 시작 column
   * @param r 목표 row
   * @param c 목표 column
   */
  const executeMove = (sr: number, sc: number, r: number, c: number) => {
    if (winner) return;

    const newBoard = board.map(row => [...row]);
    const capturedPiece = newBoard[r][c];
    
    newBoard[r][c] = newBoard[sr][sc];
    newBoard[sr][sc] = null;
    
    // Auto Pawn Promotion
    const pieceMoved = newBoard[r][c];
    const isMovedPawn = pieceInfo(pieceMoved)?.type === 'pawn';
    if (isMovedPawn && (r === 0 || r === 7)) {
      newBoard[r][c] = turn === 'white' ? 'Q' : 'q';
    }

    setBoard(newBoard);

    if (capturedPiece) {
      const capInfo = pieceInfo(capturedPiece);
      if (capInfo) {
        if (capInfo.color === 'white') setDeadPiecesWhite(prev => [...prev, capturedPiece]);
        else setDeadPiecesBlack(prev => [...prev, capturedPiece]);

        if (capInfo.type === 'king') {
          setWinner(turn);
          return;
        }
      }
    }

    const nextTurn = turn === 'white' ? 'black' : 'white';
    if (checkMateTest(newBoard, nextTurn)) {
      setWinner(turn);
    } else {
      setTurn(nextTurn);
    }
  };

  const resetGame = () => {
    setBoard(INITIAL_BOARD);
    setTurn('white');
    setWinner(null);
    setDeadPiecesWhite([]);
    setDeadPiecesBlack([]);
  };

  /**
   * [1번 이슈 해결] 재접속 시 상대방이 보내준 스냅샷으로 내 상태를 안전하게 덮어씌웁니다.
   */
  const syncGame = (newState: any) => {
    if (!newState) return;
    if (newState.board) setBoard(newState.board);
    if (newState.turn) setTurn(newState.turn);
    if (newState.winner !== undefined) setWinner(newState.winner);
    if (newState.deadPiecesWhite) setDeadPiecesWhite(newState.deadPiecesWhite);
    if (newState.deadPiecesBlack) setDeadPiecesBlack(newState.deadPiecesBlack);
  };

  return {
    board,
    turn,
    winner,
    deadPiecesWhite,
    deadPiecesBlack,
    executeMove,
    resetGame,
    syncGame,
    isCheck: isKingInCheck(board, turn)
  };
};

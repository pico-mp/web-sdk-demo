import { useState } from 'react';
import { BoardState, Color, GameState } from '../types/chess';
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

export const INITIAL_GAME_STATE: GameState = {
  board: INITIAL_BOARD,
  turn: 'white',
  winner: null,
  deadPiecesWhite: [],
  deadPiecesBlack: [],
};

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
   * 지정된 좌표에서 목표 좌표로 기물을 이동시키는 실제 로직.
   * 새로운 게임 상태를 반환하므로 호출부에서 setRoomData 등에 즉시 활용할 수 있습니다.
   * @returns 이동 후 확정된 GameState, 이동 불가능 시 null
   */
  const executeMove = (sr: number, sc: number, r: number, c: number): GameState | null => {
    if (winner) return null;

    const newBoard = board.map(row => [...row]);
    const capturedPiece = newBoard[r][c];

    newBoard[r][c] = newBoard[sr][sc];
    newBoard[sr][sc] = null;

    // Auto Pawn Promotion
    const pieceMoved = newBoard[r][c];
    if (pieceInfo(pieceMoved)?.type === 'pawn' && (r === 0 || r === 7)) {
      newBoard[r][c] = turn === 'white' ? 'Q' : 'q';
    }

    setBoard(newBoard);

    let newDeadWhite = deadPiecesWhite;
    let newDeadBlack = deadPiecesBlack;
    let newWinner: Color | null = null;
    let newTurn: Color = turn;

    if (capturedPiece) {
      const capInfo = pieceInfo(capturedPiece);
      if (capInfo) {
        if (capInfo.color === 'white') {
          newDeadWhite = [...newDeadWhite, capturedPiece];
          setDeadPiecesWhite(newDeadWhite);
        } else {
          newDeadBlack = [...newDeadBlack, capturedPiece];
          setDeadPiecesBlack(newDeadBlack);
        }

        if (capInfo.type === 'king') {
          newWinner = turn;
          setWinner(newWinner);
          return { board: newBoard, turn: newTurn, winner: newWinner, deadPiecesWhite: newDeadWhite, deadPiecesBlack: newDeadBlack };
        }
      }
    }

    const nextTurn: Color = turn === 'white' ? 'black' : 'white';
    if (checkMateTest(newBoard, nextTurn)) {
      newWinner = turn;
      setWinner(newWinner);
    } else {
      newTurn = nextTurn;
      setTurn(nextTurn);
    }

    return { board: newBoard, turn: newTurn, winner: newWinner, deadPiecesWhite: newDeadWhite, deadPiecesBlack: newDeadBlack };
  };

  const resetGame = () => {
    setBoard(INITIAL_BOARD);
    setTurn('white');
    setWinner(null);
    setDeadPiecesWhite([]);
    setDeadPiecesBlack([]);
  };

  /**
   * 원격에서 수신된 게임 상태 스냅샷으로 로컬 상태를 덮어씁니다.
   */
  const syncGame = (newState: GameState) => {
    if (!newState) return;
    if (newState.board) setBoard(newState.board);
    if (newState.turn) setTurn(newState.turn);
    setWinner(newState.winner ?? null);
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

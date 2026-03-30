import { Color, PieceInfo, PieceType, BoardState, Position } from '../types/chess';
import piecesData from '../data/pieces.json';

export const pieceInfo = (char: string | null): PieceInfo | null => {
  if (!char) return null;
  const isWhite = char === char.toUpperCase();
  const c = char.toLowerCase();
  const map: Record<string, PieceType> = {
    'k': 'king', 'q': 'queen', 'r': 'rook', 'b': 'bishop', 'n': 'knight', 'p': 'pawn'
  };
  return { type: map[c] || 'pawn', color: isWhite ? 'white' : 'black' };
};

export const renderPieceSymbol = (char: string | null) => {
  if (!char) return null;
  const map: Record<string, string> = {
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙'
  };
  return map[char] || char;
};

export const calculateValidMoves = (board: BoardState, row: number, col: number): Position[] => {
  const pInfo = pieceInfo(board[row][col]);
  if (!pInfo) return [];
  const { type, color } = pInfo;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rule: any = (piecesData as any)[type];
  if (!rule) return [];

  const forwardDir = color === 'white' ? -1 : 1;
  const validMoves: Position[] = [];

  const isTargetEnemyOrEmpty = (tr: number, tc: number) => {
    const tp = pieceInfo(board[tr][tc]);
    return tp ? tp.color !== color : true;
  };

  if (type === 'pawn') {
    const mDirs = rule.moves as {direction: [number, number], maxSteps: number}[];
    for(const md of mDirs) {
      const dr = forwardDir * md.direction[0];
      const dc = md.direction[1];
      let maxS = md.maxSteps;
      if ((color === 'white' && row === 6) || (color === 'black' && row === 1)) {
         maxS = 2; // 첫 이동 보너스
      }
      for (let s = 1; s <= maxS; s++) {
        const tr = row + dr * s;
        const tc = col + dc * s;
        if (tr < 0 || tr >= 8 || tc < 0 || tc >= 8) break;
        if (board[tr][tc] !== null) break;
        validMoves.push([tr, tc]);
      }
    }
    const aDirs = rule.attacks as {direction: [number, number], maxSteps: number}[];
    if (aDirs) {
      for(const ad of aDirs) {
        const tr = row + forwardDir * ad.direction[0];
        const tc = col + ad.direction[1];
        if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
           const tp = pieceInfo(board[tr][tc]);
           if (tp && tp.color !== color) {
             validMoves.push([tr, tc]);
           }
        }
      }
    }
    return validMoves;
  }

  const mDirs = rule.moves as {direction: [number, number], maxSteps: number, jump?: boolean}[];
  if (!mDirs) return [];

  for (const md of mDirs) {
    const dr = md.direction[0];
    const dc = md.direction[1];
    const maxSteps = md.maxSteps;

    if (md.jump) {
      const tr = row + dr;
      const tc = col + dc;
      if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8 && isTargetEnemyOrEmpty(tr, tc)) {
        validMoves.push([tr, tc]);
      }
    } else {
      for (let s = 1; s <= maxSteps; s++) {
        const tr = row + dr * s;
        const tc = col + dc * s;
        if (tr < 0 || tr >= 8 || tc < 0 || tc >= 8) break;
        
        const targetInfo = pieceInfo(board[tr][tc]);
        if (targetInfo) {
          if (targetInfo.color !== color) {
            validMoves.push([tr, tc]); 
          }
          break;
        }
        validMoves.push([tr, tc]);
      }
    }
  }

  return validMoves;
};

export const isKingInCheck = (board: BoardState, kingColor: Color): boolean => {
  let kingPos: Position | null = null;
  out: for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = pieceInfo(board[r][c]);
      if (p && p.type === 'king' && p.color === kingColor) {
        kingPos = [r, c];
        break out;
      }
    }
  }
  if (!kingPos) return true;

  const oppColor = kingColor === 'white' ? 'black' : 'white';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = pieceInfo(board[r][c]);
      if (p && p.color === oppColor) {
        const potentialMoves = calculateValidMoves(board, r, c);
        if (potentialMoves.some(m => m[0] === kingPos![0] && m[1] === kingPos![1])) {
          return true;
        }
      }
    }
  }
  return false;
};

export const getSafeValidMoves = (board: BoardState, r: number, c: number, turn: Color): Position[] => {
  const rawMoves = calculateValidMoves(board, r, c);
  return rawMoves.filter(m => {
    const tempBoard = board.map(row => [...row]);
    tempBoard[m[0]][m[1]] = tempBoard[r][c];
    tempBoard[r][c] = null;
    return !isKingInCheck(tempBoard, turn);
  });
};

export const checkMateTest = (testBoard: BoardState, testTurn: Color): boolean => {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = pieceInfo(testBoard[r][c]);
      if (p && p.color === testTurn) {
        const safe = getSafeValidMoves(testBoard, r, c, testTurn);
        if (safe.length > 0) return false;
      }
    }
  }
  return true;
};

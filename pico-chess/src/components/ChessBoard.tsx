import React, { useState } from 'react';
import { BoardState, Color, Position } from '../types/chess';
import { pieceInfo, renderPieceSymbol, getSafeValidMoves } from '../engine/rules';

interface ChessBoardProps {
  board: BoardState;
  turn: Color;
  myColor: Color | null;
  winner: Color | null;
  inCheck: boolean;
  onMoveCommand: (fromRow: number, fromCol: number, toRow: number, toCol: number) => void;
  flipped?: boolean;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({ board, turn, myColor, winner, inCheck, onMoveCommand, flipped = false }) => {
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);

  const handleCellClick = (r: number, c: number) => {
    if (winner) return;
    
    // [보안/규칙] 멀티플레이 상태일 때, 내 턴이 아니면 말을 아예 만지지 못하게 차단!
    if (myColor && turn !== myColor) return;

    const targetInfo = pieceInfo(board[r][c]);

    if (selectedPos) {
      const [sr, sc] = selectedPos;
      
      if (targetInfo && targetInfo.color === turn) {
        if (sr === r && sc === c) {
          setSelectedPos(null);
          setValidMoves([]);
        } else {
          setSelectedPos([r, c]);
          setValidMoves(getSafeValidMoves(board, r, c, turn));
        }
        return;
      }

      const isValid = validMoves.some(m => m[0] === r && m[1] === c);
      if (isValid) {
        onMoveCommand(sr, sc, r, c);
        setSelectedPos(null);
        setValidMoves([]);
      } else {
        setSelectedPos(null);
        setValidMoves([]);
      }
    } else {
      if (targetInfo && targetInfo.color === turn) {
        setSelectedPos([r, c]);
        setValidMoves(getSafeValidMoves(board, r, c, turn));
      }
    }
  };

  // 화면 렌더링용 배열 생성 (flipped가 true면 위아래/좌우 반전)
  const rows = flipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];
  const cols = flipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];

  return (
    <div className="chess-board">
      {rows.map((rIdx) => (
        <div key={`row-${rIdx}`} style={{ display: 'contents' }}>
          {cols.map((cIdx) => {
            const cell = board[rIdx][cIdx];
          const isWhiteCell = (rIdx + cIdx) % 2 === 0;
          const isSelected = selectedPos && selectedPos[0] === rIdx && selectedPos[1] === cIdx;
          const isValidMove = validMoves.some(m => m[0] === rIdx && m[1] === cIdx);
          const isKingInCheckFlag = cell && pieceInfo(cell)?.type === 'king' && pieceInfo(cell)?.color === turn && inCheck;
          
          return (
            <div
              key={`${rIdx}-${cIdx}`}
              className={`cell ${isWhiteCell ? 'white' : 'black'} ${isSelected ? 'selected' : ''}`}
              onClick={() => handleCellClick(rIdx, cIdx)}
              style={isKingInCheckFlag ? { boxShadow: 'inset 0 0 16px 2px rgba(231, 76, 60, 0.8)' } : {}}
            >
              {cell && (
                <div className="piece" style={{
                  color: cell === cell.toUpperCase() ? '#fff' : '#000',
                  textShadow: cell === cell?.toUpperCase() ? '0 1px 2px rgba(0,0,0,0.4)' : 'none',
                }}>
                  {renderPieceSymbol(cell)}
                </div>
              )}
              {isValidMove && (
                <div className={cell ? 'valid-move-capture' : 'valid-move-dot'} />
              )}
            </div>
          );
        })}
      </div>
    ))}
  </div>
);
};

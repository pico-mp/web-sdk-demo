export type Color = 'white' | 'black';

export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn' | string;

export interface PieceInfo {
  type: PieceType;
  color: Color;
}

export type BoardState = (string | null)[][];

export type Position = [number, number];

export interface Move {
  from: Position;
  to: Position;
}

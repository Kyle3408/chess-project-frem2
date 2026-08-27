// src/chess_core/piece.js

export const COLOR = Object.freeze({
  WHITE: 'WHITE',
  BLACK: 'BLACK'
});

export const PIECE_TYPE = Object.freeze({
  PAWN: 'PAWN',
  KNIGHT: 'KNIGHT',
  BISHOP: 'BISHOP',
  ROOK: 'ROOK',
  QUEEN: 'QUEEN',
  KING: 'KING'
});

// Direction offsets: [rowOffset, colOffset]
export const DIRECTIONS = {
  ORTHOGONAL: [[-1, 0], [1, 0], [0, -1], [0, 1]],
  DIAGONAL: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
  KNIGHT: [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2],  [1, 2],  [2, -1],  [2, 1]
  ]
};

const UNICODE_PIECES = {
  [COLOR.WHITE]: {
    [PIECE_TYPE.PAWN]: '♟',
    [PIECE_TYPE.KNIGHT]: '♞',
    [PIECE_TYPE.BISHOP]: '♝',
    [PIECE_TYPE.ROOK]: '♜',
    [PIECE_TYPE.QUEEN]: '♛',
    [PIECE_TYPE.KING]: '♚',
  },
  [COLOR.BLACK]: {
    [PIECE_TYPE.PAWN]: '♟',
    [PIECE_TYPE.KNIGHT]: '♞',
    [PIECE_TYPE.BISHOP]: '♝',
    [PIECE_TYPE.ROOK]: '♜',
    [PIECE_TYPE.QUEEN]: '♛',
    [PIECE_TYPE.KING]: '♚',
  }
};

export class Piece {
  constructor(color, type) {
    this.color = color;
    this.type = type;
  }

  get symbol() {
    return UNICODE_PIECES[this.color][this.type];
  }

  // Helper to identify sliding pieces
  get isSliding() {
    return (
      this.type === PIECE_TYPE.ROOK ||
      this.type === PIECE_TYPE.BISHOP ||
      this.type === PIECE_TYPE.QUEEN
    );
  }
}
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

// Unicode symbols map to render pieces directly into HTML
const UNICODE_PIECES = {
  [COLOR.WHITE]: {
    [PIECE_TYPE.PAWN]: '♙',
    [PIECE_TYPE.KNIGHT]: '♘',
    [PIECE_TYPE.BISHOP]: '♗',
    [PIECE_TYPE.ROOK]: '♖',
    [PIECE_TYPE.QUEEN]: '♕',
    [PIECE_TYPE.KING]: '♔',
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

  // Returns the Unicode character corresponding to this piece
  get symbol() {
    return UNICODE_PIECES[this.color][this.type];
  }
}
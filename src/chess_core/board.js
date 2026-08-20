import { Piece, COLOR, PIECE_TYPE } from './piece.js';

export class Board {
  constructor() {
    // Initialize an 8x8 matrix (64 squares) filled with null
    this.grid = Array(8).fill(null).map(() => Array(8).fill(null));
    this.setupBoard();
  }

  setupBoard() {
    const mainRowOrder = [
      PIECE_TYPE.ROOK,
      PIECE_TYPE.KNIGHT,
      PIECE_TYPE.BISHOP,
      PIECE_TYPE.QUEEN,
      PIECE_TYPE.KING,
      PIECE_TYPE.BISHOP,
      PIECE_TYPE.KNIGHT,
      PIECE_TYPE.ROOK
    ];

    // Row 0 (Rank 8): Black major/minor pieces
    mainRowOrder.forEach((type, col) => {
      this.grid[0][col] = new Piece(COLOR.BLACK, type);
    });

    // Row 1 (Rank 7): Black pawns
    for (let col = 0; col < 8; col++) {
      this.grid[1][col] = new Piece(COLOR.BLACK, PIECE_TYPE.PAWN);
    }

    // Row 6 (Rank 2): White pawns
    for (let col = 0; col < 8; col++) {
      this.grid[6][col] = new Piece(COLOR.WHITE, PIECE_TYPE.PAWN);
    }

    // Row 7 (Rank 1): White major/minor pieces
    mainRowOrder.forEach((type, col) => {
      this.grid[7][col] = new Piece(COLOR.WHITE, type);
    });
  }

  // Helper method to retrieve a piece using a 1-based index (1 to 64)
  getPieceByIndex(index) {
    const row = Math.floor((index - 1) / 8);
    const col = (index - 1) % 8;
    return this.grid[row][col];
  }
}
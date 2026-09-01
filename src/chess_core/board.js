// src/chess_core/board.js
import { Piece, PIECE_TYPE, COLOR } from './piece.js';

export class Board {
  constructor() {
    this.squares = new Array(64).fill(null);
    this.activeColor = COLOR.WHITE;

    this.setupBoard();
  }

  setupBoard() {
    // Black non-pawn pieces
    this.squares[0] = new Piece(PIECE_TYPE.ROOK, COLOR.BLACK);
    this.squares[1] = new Piece(PIECE_TYPE.KNIGHT, COLOR.BLACK);
    this.squares[2] = new Piece(PIECE_TYPE.BISHOP, COLOR.BLACK);
    this.squares[3] = new Piece(PIECE_TYPE.QUEEN, COLOR.BLACK);
    this.squares[4] = new Piece(PIECE_TYPE.KING, COLOR.BLACK);
    this.squares[5] = new Piece(PIECE_TYPE.BISHOP, COLOR.BLACK);
    this.squares[6] = new Piece(PIECE_TYPE.KNIGHT, COLOR.BLACK);
    this.squares[7] = new Piece(PIECE_TYPE.ROOK, COLOR.BLACK);

    // Black pawns
    for (let i = 8; i < 16; i++) {
      this.squares[i] = new Piece(PIECE_TYPE.PAWN, COLOR.BLACK);
    }

    // White pawns
    for (let i = 48; i < 56; i++) {
      this.squares[i] = new Piece(PIECE_TYPE.PAWN, COLOR.WHITE);
    }

    // White non-pawn pieces
    this.squares[56] = new Piece(PIECE_TYPE.ROOK, COLOR.WHITE);
    this.squares[57] = new Piece(PIECE_TYPE.KNIGHT, COLOR.WHITE);
    this.squares[58] = new Piece(PIECE_TYPE.BISHOP, COLOR.WHITE);
    this.squares[59] = new Piece(PIECE_TYPE.QUEEN, COLOR.WHITE);
    this.squares[60] = new Piece(PIECE_TYPE.KING, COLOR.WHITE);
    this.squares[61] = new Piece(PIECE_TYPE.BISHOP, COLOR.WHITE);
    this.squares[62] = new Piece(PIECE_TYPE.KNIGHT, COLOR.WHITE);
    this.squares[63] = new Piece(PIECE_TYPE.ROOK, COLOR.WHITE);
  }

  getPieceByIndex(index) {
    return this.squares[index - 1] || null;
  }

  getValidMovesByIndex(index) {
    const piece = this.getPieceByIndex(index);
    if (!piece) return [];

    const moves = [];
    const row = Math.floor((index - 1) / 8);
    const col = (index - 1) % 8;

    if (piece.type === PIECE_TYPE.PAWN) {
      const direction = piece.color === COLOR.WHITE ? -1 : 1;
      const startRow = piece.color === COLOR.WHITE ? 6 : 1;

      // Forward step
      const forwardRow = row + direction;
      const forwardIndex = forwardRow * 8 + col + 1;
      if (forwardRow >= 0 && forwardRow <= 7 && !this.getPieceByIndex(forwardIndex)) {
        moves.push(forwardIndex);

        // Double forward step
        if (row === startRow) {
          const doubleForwardRow = row + 2 * direction;
          const doubleForwardIndex = doubleForwardRow * 8 + col + 1;
          if (!this.getPieceByIndex(doubleForwardIndex)) {
            moves.push(doubleForwardIndex);
          }
        }
      }

      // Diagonal capture
      for (const targetCol of [col - 1, col + 1]) {
        if (targetCol >= 0 && targetCol <= 7) {
          const captureIndex = forwardRow * 8 + targetCol + 1;
          const targetPiece = this.getPieceByIndex(captureIndex);
          if (targetPiece && targetPiece.color !== piece.color) {
            moves.push(captureIndex);
          }
        }
      }
    } else {
      // Basic moves for other pieces
      for (let i = 1; i <= 64; i++) {
        if (i === index) continue;
        const targetPiece = this.getPieceByIndex(i);
        if (!targetPiece || targetPiece.color !== piece.color) {
          moves.push(i);
        }
      }
    }

    return moves;
  }

  movePiece(fromIndex, toIndex, promotionType = PIECE_TYPE.QUEEN) {
    const movingPiece = this.getPieceByIndex(fromIndex);
    if (!movingPiece) return false;

    const toRow = Math.floor((toIndex - 1) / 8);
    const isPawn = movingPiece.type === PIECE_TYPE.PAWN;
    const isPromotionRank = (movingPiece.color === COLOR.WHITE && toRow === 0) ||
                            (movingPiece.color === COLOR.BLACK && toRow === 7);

    // If pawn promotion, place the newly promoted piece
    if (isPawn && isPromotionRank) {
      this.squares[toIndex - 1] = new Piece(promotionType, movingPiece.color);
    } else {
      this.squares[toIndex - 1] = movingPiece;
    }

    this.squares[fromIndex - 1] = null;
    this.activeColor = this.activeColor === COLOR.WHITE ? COLOR.BLACK : COLOR.WHITE;

    return true;
  }
}
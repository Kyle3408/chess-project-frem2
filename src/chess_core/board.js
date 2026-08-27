// src/chess_core/board.js
import { Piece, COLOR, PIECE_TYPE, DIRECTIONS } from './piece.js';
import { FENHandler } from './fen.js';

export const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export class Board {
  constructor(fen = DEFAULT_FEN) {
    this.pgnHistory = [];
    this.loadFEN(fen);
  }

  loadFEN(fenString) {
    const parsed = FENHandler.parse(fenString);
    this.grid = parsed.grid;
    this.activeColor = parsed.activeColor;
    this.castlingRights = parsed.castlingRights;
    this.enPassantTarget = parsed.enPassantTarget;
    this.halfMoveClock = parsed.halfMoveClock;
    this.fullMoveNumber = parsed.fullMoveNumber;
  }

  toFEN() {
    return FENHandler.generate({
      grid: this.grid,
      activeColor: this.activeColor,
      castlingRights: this.castlingRights,
      enPassantTarget: this.enPassantTarget,
      halfMoveClock: this.halfMoveClock,
      fullMoveNumber: this.fullMoveNumber,
    });
  }

  // PGN Tracking Methods
  recordMove(sanMove) {
    this.pgnHistory.push({
      moveNumber: this.fullMoveNumber,
      color: this.activeColor,
      san: sanMove,
    });
  }

  exportPGN(headers = {}) {
    const headerLines = [
      `[Event "${headers.event || 'Casual Game'}"]`,
      `[Site "${headers.site || 'Localhost'}"]`,
      `[Date "${headers.date || new Date().toISOString().split('T')[0]}"]`,
      `[White "${headers.white || 'Player 1'}"]`,
      `[Black "${headers.black || 'Player 2'}"]`,
      `[Result "${headers.result || '*'}"]`,
    ];

    let pgnBody = '';
    for (let i = 0; i < this.pgnHistory.length; i++) {
      const move = this.pgnHistory[i];
      if (move.color === COLOR.WHITE) {
        pgnBody += `${move.moveNumber}. ${move.san} `;
      } else {
        pgnBody += `${move.san} `;
      }
    }

    return `${headerLines.join('\n')}\n\n${pgnBody.trim()}`;
  }

  // Execute a move on the board by 1-64 index
  movePiece(fromIndex, toIndex) {
    const fromRow = Math.floor((fromIndex - 1) / 8);
    const fromCol = (fromIndex - 1) % 8;
    const toRow = Math.floor((toIndex - 1) / 8);
    const toCol = (toIndex - 1) % 8;

    const movingPiece = this.grid[fromRow][fromCol];
    if (!movingPiece) return false;

    // Move piece on the grid
    this.grid[toRow][toCol] = movingPiece;
    this.grid[fromRow][fromCol] = null;

    // Increment fullMoveNumber when black completes a turn
    if (this.activeColor === COLOR.BLACK) {
      this.fullMoveNumber += 1;
    }

    // Toggle active color
    this.activeColor = this.activeColor === COLOR.WHITE ? COLOR.BLACK : COLOR.WHITE;

    return true;
  }

  isInBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  toIndex(row, col) {
    return row * 8 + col + 1;
  }

  getPieceByIndex(index) {
    const row = Math.floor((index - 1) / 8);
    const col = (index - 1) % 8;
    return this.grid[row][col];
  }

  getValidMoves(row, col) {
    const piece = this.grid[row][col];
    if (!piece || piece.color !== this.activeColor) return [];

    const validMoves = [];

    if (piece.type === PIECE_TYPE.PAWN) {
      this.getPawnMoves(row, col, piece, validMoves);
    } else if (piece.type === PIECE_TYPE.KNIGHT) {
      this.getStepMoves(row, col, piece, DIRECTIONS.KNIGHT, validMoves);
    } else if (piece.type === PIECE_TYPE.KING) {
      const kingDirs = [...DIRECTIONS.ORTHOGONAL, ...DIRECTIONS.DIAGONAL];
      this.getStepMoves(row, col, piece, kingDirs, validMoves);
    } else if (piece.isSliding) {
      let directions = [];
      if (piece.type === PIECE_TYPE.ROOK) directions = DIRECTIONS.ORTHOGONAL;
      if (piece.type === PIECE_TYPE.BISHOP) directions = DIRECTIONS.DIAGONAL;
      if (piece.type === PIECE_TYPE.QUEEN) directions = [...DIRECTIONS.ORTHOGONAL, ...DIRECTIONS.DIAGONAL];

      this.getSlidingMoves(row, col, piece, directions, validMoves);
    }

    return validMoves;
  }

  getSlidingMoves(row, col, piece, directions, validMoves) {
    for (const [dRow, dCol] of directions) {
      let r = row + dRow;
      let c = col + dCol;

      while (this.isInBounds(r, c)) {
        const target = this.grid[r][c];
        if (!target) {
          validMoves.push(this.toIndex(r, c));
        } else {
          if (target.color !== piece.color) {
            validMoves.push(this.toIndex(r, c));
          }
          break;
        }
        r += dRow;
        c += dCol;
      }
    }
  }

  getStepMoves(row, col, piece, offsets, validMoves) {
    for (const [dRow, dCol] of offsets) {
      const r = row + dRow;
      const c = col + dCol;

      if (this.isInBounds(r, c)) {
        const target = this.grid[r][c];
        if (!target || target.color !== piece.color) {
          validMoves.push(this.toIndex(r, c));
        }
      }
    }
  }

  getPawnMoves(row, col, piece, validMoves) {
    const direction = piece.color === COLOR.WHITE ? -1 : 1;
    const startRank = piece.color === COLOR.WHITE ? 6 : 1;

    const forwardRow = row + direction;
    if (this.isInBounds(forwardRow, col) && !this.grid[forwardRow][col]) {
      validMoves.push(this.toIndex(forwardRow, col));

      const doubleForwardRow = row + 2 * direction;
      if (row === startRank && !this.grid[doubleForwardRow][col]) {
        validMoves.push(this.toIndex(doubleForwardRow, col));
      }
    }

    for (const dCol of [-1, 1]) {
      const capRow = row + direction;
      const capCol = col + dCol;

      if (this.isInBounds(capRow, capCol)) {
        const target = this.grid[capRow][capCol];
        if (target && target.color !== piece.color) {
          validMoves.push(this.toIndex(capRow, capCol));
        }
      }
    }
  }
}
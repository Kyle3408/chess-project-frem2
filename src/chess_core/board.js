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

  getPieceByIndex(index) {
    const row = Math.floor((index - 1) / 8);
    const col = (index - 1) % 8;
    return this.grid[row][col];
  }

  getValidMovesByIndex(index) {
    const row = Math.floor((index - 1) / 8);
    const col = (index - 1) % 8;
    return this.getLegalMoves(row, col);
  }

  findKing(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.grid[r][c];
        if (piece && piece.type === PIECE_TYPE.KING && piece.color === color) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  isInCheck(color = this.activeColor) {
    const kingPos = this.findKing(color);
    if (!kingPos) return false;
    return this.isSquareAttacked(kingPos.row, kingPos.col, this.oppositeColor(color));
  }

  getCheckedKingIndex(color = this.activeColor) {
    if (this.isInCheck(color)) {
      const kingPos = this.findKing(color);
      if (kingPos) {
        return this.toIndex(kingPos.row, kingPos.col);
      }
    }
    return null;
  }

  getPseudoLegalMoves(row, col) {
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
      this.getCastlingMoves(row, col, piece, validMoves);
    } else if (piece.isSliding) {
      let directions = [];
      if (piece.type === PIECE_TYPE.ROOK) directions = DIRECTIONS.ORTHOGONAL;
      if (piece.type === PIECE_TYPE.BISHOP) directions = DIRECTIONS.DIAGONAL;
      if (piece.type === PIECE_TYPE.QUEEN) directions = [...DIRECTIONS.ORTHOGONAL, ...DIRECTIONS.DIAGONAL];

      this.getSlidingMoves(row, col, piece, directions, validMoves);
    }

    return validMoves;
  }

  getLegalMoves(row, col) {
    const pseudoMoves = this.getPseudoLegalMoves(row, col);
    const piece = this.grid[row][col];
    if (!piece) return [];

    const legalMoves = [];

    for (const toIndex of pseudoMoves) {
      if (this.isMoveLegal(row, col, toIndex)) {
        legalMoves.push(toIndex);
      }
    }

    return legalMoves;
  }

  getValidMoves(row, col) {
    return this.getLegalMoves(row, col);
  }

  isMoveLegal(fromRow, fromCol, toIndex) {
    const toRow = Math.floor((toIndex - 1) / 8);
    const toCol = (toIndex - 1) % 8;

    const movingPiece = this.grid[fromRow][fromCol];
    const targetPiece = this.grid[toRow][toCol];
    const originalEnPassant = this.enPassantTarget;

    const isPawnMove = movingPiece.type === PIECE_TYPE.PAWN;
    const direction = movingPiece.color === COLOR.WHITE ? -1 : 1;
    const targetSquareName = `${String.fromCharCode(97 + toCol)}${8 - toRow}`;
    const isEnPassant =
      isPawnMove &&
      !targetPiece &&
      Math.abs(toCol - fromCol) === 1 &&
      this.enPassantTarget === targetSquareName;

    let epCapturedPiece = null;
    let epCapturedRow = -1;

    if (isEnPassant) {
      epCapturedRow = toRow - direction;
      epCapturedPiece = this.grid[epCapturedRow][toCol];
      this.grid[epCapturedRow][toCol] = null;
    }

    this.grid[toRow][toCol] = movingPiece;
    this.grid[fromRow][fromCol] = null;

    const inCheck = this.isInCheck(movingPiece.color);

    this.grid[fromRow][fromCol] = movingPiece;
    this.grid[toRow][toCol] = targetPiece;
    if (isEnPassant) {
      this.grid[epCapturedRow][toCol] = epCapturedPiece;
    }
    this.enPassantTarget = originalEnPassant;

    return !inCheck;
  }

  hasLegalMoves(color = this.activeColor) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.grid[r][c];
        if (piece && piece.color === color) {
          const originalActive = this.activeColor;
          this.activeColor = color;
          const moves = this.getLegalMoves(r, c);
          this.activeColor = originalActive;

          if (moves.length > 0) return true;
        }
      }
    }
    return false;
  }

  isCheckmate(color = this.activeColor) {
    return this.isInCheck(color) && !this.hasLegalMoves(color);
  }

  isStalemate(color = this.activeColor) {
    return !this.isInCheck(color) && !this.hasLegalMoves(color);
  }

  movePiece(fromIndex, toIndex, promotionType = PIECE_TYPE.QUEEN) {
    const fromRow = Math.floor((fromIndex - 1) / 8);
    const fromCol = (fromIndex - 1) % 8;
    const toRow = Math.floor((toIndex - 1) / 8);
    const toCol = (toIndex - 1) % 8;

    const movingPiece = this.grid[fromRow][fromCol];
    if (!movingPiece || movingPiece.color !== this.activeColor) return false;

    const legalMoves = this.getLegalMoves(fromRow, fromCol);
    if (!legalMoves.includes(toIndex)) return false;

    const targetPiece = this.grid[toRow][toCol];
    const isPawnMove = movingPiece.type === PIECE_TYPE.PAWN;
    const direction = movingPiece.color === COLOR.WHITE ? -1 : 1;
    const targetSquareName = `${String.fromCharCode(97 + toCol)}${8 - toRow}`;
    const isEnPassant =
      isPawnMove &&
      !targetPiece &&
      Math.abs(toCol - fromCol) === 1 &&
      this.enPassantTarget === targetSquareName;
    const isCastling = movingPiece.type === PIECE_TYPE.KING && Math.abs(toCol - fromCol) === 2;
    const isCapture = targetPiece !== null || isEnPassant;

    if (isEnPassant) {
      this.grid[toRow - direction][toCol] = null;
    }

    if (isCastling) {
      const rookFromCol = toCol > fromCol ? 7 : 0;
      const rookToCol = toCol > fromCol ? 5 : 3;
      this.grid[toRow][rookToCol] = this.grid[toRow][rookFromCol];
      this.grid[toRow][rookFromCol] = null;
    }

    if (isPawnMove && (toRow === 0 || toRow === 7)) {
      const validPromotions = [
        PIECE_TYPE.QUEEN,
        PIECE_TYPE.ROOK,
        PIECE_TYPE.BISHOP,
        PIECE_TYPE.KNIGHT,
      ];
      if (!validPromotions.includes(promotionType)) {
        throw new Error('Invalid promotion type');
      }
      this.grid[toRow][toCol] = new Piece(movingPiece.color, promotionType);
    } else {
      this.grid[toRow][toCol] = movingPiece;
    }

    this.grid[fromRow][fromCol] = null;

    this.updateCastlingRights(movingPiece, fromRow, fromCol, targetPiece, toRow, toCol);
    this.enPassantTarget = null;
    if (isPawnMove && Math.abs(toRow - fromRow) === 2) {
      this.enPassantTarget = `${String.fromCharCode(97 + fromCol)}${8 - (fromRow + direction)}`;
    }
    this.halfMoveClock = isPawnMove || isCapture ? 0 : this.halfMoveClock + 1;

    const nextColor = this.oppositeColor(this.activeColor);

    let sanSuffix = '';
    if (this.isCheckmate(nextColor)) {
      sanSuffix = '#';
    } else if (this.isInCheck(nextColor)) {
      sanSuffix = '+';
    }

    if (isCastling) {
      this.recordMove(`${toCol > fromCol ? 'O-O' : 'O-O-O'}${sanSuffix}`);
    } else {
      const promotionSuffix =
        isPawnMove && (toRow === 0 || toRow === 7) ? `=${promotionType[0].toUpperCase()}` : '';
      const piecePrefix = isPawnMove
        ? isCapture
          ? String.fromCharCode(97 + fromCol)
          : ''
        : movingPiece.type.toUpperCase();
      const captureSymbol = isCapture ? 'x' : '';
      const destSquare = `${String.fromCharCode(97 + toCol)}${8 - toRow}`;
      this.recordMove(`${piecePrefix}${captureSymbol}${destSquare}${promotionSuffix}${sanSuffix}`);
    }

    if (this.activeColor === COLOR.BLACK) {
      this.fullMoveNumber += 1;
    }

    this.activeColor = nextColor;
    return true;
  }

  isInBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  toIndex(row, col) {
    return row * 8 + col + 1;
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
        const capSquareName = `${String.fromCharCode(97 + capCol)}${8 - capRow}`;
        if (target && target.color !== piece.color) {
          validMoves.push(this.toIndex(capRow, capCol));
        } else if (!target && this.enPassantTarget === capSquareName) {
          validMoves.push(this.toIndex(capRow, capCol));
        }
      }
    }
  }

  getCastlingMoves(row, col, piece, validMoves) {
    const homeRow = piece.color === COLOR.WHITE ? 7 : 0;
    if (row !== homeRow || col !== 4 || this.isSquareAttacked(row, col, this.oppositeColor(piece.color))) return;

    const rights =
      piece.color === COLOR.WHITE
        ? ['whiteKingside', 'whiteQueenside']
        : ['blackKingside', 'blackQueenside'];
    const enemyColor = this.oppositeColor(piece.color);

    if (
      this.castlingRights[rights[0]] &&
      !this.grid[row][5] &&
      !this.grid[row][6] &&
      this.grid[row][7]?.type === PIECE_TYPE.ROOK &&
      this.grid[row][7]?.color === piece.color &&
      !this.isSquareAttacked(row, 5, enemyColor) &&
      !this.isSquareAttacked(row, 6, enemyColor)
    ) {
      validMoves.push(this.toIndex(row, 6));
    }
    if (
      this.castlingRights[rights[1]] &&
      !this.grid[row][1] &&
      !this.grid[row][2] &&
      !this.grid[row][3] &&
      this.grid[row][0]?.type === PIECE_TYPE.ROOK &&
      this.grid[row][0]?.color === piece.color &&
      !this.isSquareAttacked(row, 3, enemyColor) &&
      !this.isSquareAttacked(row, 2, enemyColor)
    ) {
      validMoves.push(this.toIndex(row, 2));
    }
  }

  oppositeColor(color) {
    return color === COLOR.WHITE ? COLOR.BLACK : COLOR.WHITE;
  }

  isSquareAttacked(row, col, attackerColor) {
    const pawnRow = row + (attackerColor === COLOR.WHITE ? 1 : -1);
    for (const pawnCol of [col - 1, col + 1]) {
      if (
        this.isInBounds(pawnRow, pawnCol) &&
        this.grid[pawnRow][pawnCol]?.color === attackerColor &&
        this.grid[pawnRow][pawnCol]?.type === PIECE_TYPE.PAWN
      )
        return true;
    }

    for (const [dRow, dCol] of DIRECTIONS.KNIGHT) {
      const r = row + dRow;
      const c = col + dCol;
      if (
        this.isInBounds(r, c) &&
        this.grid[r][c]?.color === attackerColor &&
        this.grid[r][c]?.type === PIECE_TYPE.KNIGHT
      )
        return true;
    }

    for (const [dRow, dCol, types] of [
      [-1, 0, [PIECE_TYPE.ROOK, PIECE_TYPE.QUEEN]],
      [1, 0, [PIECE_TYPE.ROOK, PIECE_TYPE.QUEEN]],
      [0, -1, [PIECE_TYPE.ROOK, PIECE_TYPE.QUEEN]],
      [0, 1, [PIECE_TYPE.ROOK, PIECE_TYPE.QUEEN]],
      [-1, -1, [PIECE_TYPE.BISHOP, PIECE_TYPE.QUEEN]],
      [-1, 1, [PIECE_TYPE.BISHOP, PIECE_TYPE.QUEEN]],
      [1, -1, [PIECE_TYPE.BISHOP, PIECE_TYPE.QUEEN]],
      [1, 1, [PIECE_TYPE.BISHOP, PIECE_TYPE.QUEEN]],
    ]) {
      let r = row + dRow;
      let c = col + dCol;
      while (this.isInBounds(r, c)) {
        const piece = this.grid[r][c];
        if (piece) {
          if (piece.color === attackerColor && types.includes(piece.type)) return true;
          break;
        }
        r += dRow;
        c += dCol;
      }
    }

    for (const [dRow, dCol] of [...DIRECTIONS.ORTHOGONAL, ...DIRECTIONS.DIAGONAL]) {
      const piece = this.grid[row + dRow]?.[col + dCol];
      if (piece?.color === attackerColor && piece.type === PIECE_TYPE.KING) return true;
    }
    return false;
  }

  updateCastlingRights(movingPiece, fromRow, fromCol, capturedPiece, toRow, toCol) {
    if (movingPiece.type === PIECE_TYPE.KING) {
      if (movingPiece.color === COLOR.WHITE) {
        this.castlingRights.whiteKingside = false;
        this.castlingRights.whiteQueenside = false;
      } else {
        this.castlingRights.blackKingside = false;
        this.castlingRights.blackQueenside = false;
      }
    }
    if (movingPiece.type === PIECE_TYPE.ROOK) this.removeRookRight(movingPiece.color, fromRow, fromCol);
    if (capturedPiece?.type === PIECE_TYPE.ROOK) this.removeRookRight(capturedPiece.color, toRow, toCol);
  }

  removeRookRight(color, row, col) {
    if (color === COLOR.WHITE && row === 7 && col === 0) this.castlingRights.whiteQueenside = false;
    if (color === COLOR.WHITE && row === 7 && col === 7) this.castlingRights.whiteKingside = false;
    if (color === COLOR.BLACK && row === 0 && col === 0) this.castlingRights.blackQueenside = false;
    if (color === COLOR.BLACK && row === 0 && col === 7) this.castlingRights.blackKingside = false;
  }
}
// src/chess_core/fen.js
import { Piece, COLOR, PIECE_TYPE } from './piece.js';

const CHAR_TO_TYPE = {
  p: PIECE_TYPE.PAWN,
  n: PIECE_TYPE.KNIGHT,
  b: PIECE_TYPE.BISHOP,
  r: PIECE_TYPE.ROOK,
  q: PIECE_TYPE.QUEEN,
  k: PIECE_TYPE.KING,
};

const TYPE_TO_CHAR = Object.fromEntries(
  Object.entries(CHAR_TO_TYPE).map(([char, type]) => [type, char])
);

export class FENHandler {
  static parse(fenString) {
    const parts = fenString.trim().split(/\s+/);
    if (parts.length < 1) throw new Error('Invalid FEN string');

    const [
      boardPart,
      turnPart = 'w',
      castlingPart = 'KQkq',
      enPassantPart = '-',
      halfMovePart = '0',
      fullMovePart = '1',
    ] = parts;

    // 1. Matriz de 8x8 inicializada vacía
    const grid = Array(8)
      .fill(null)
      .map(() => Array(8).fill(null));

    const rows = boardPart.split('/');
    if (rows.length !== 8) throw new Error('FEN board structure must have 8 ranks');

    for (let row = 0; row < 8; row++) {
      let col = 0;
      for (const char of rows[row]) {
        if (!isNaN(char)) {
          col += parseInt(char, 10);
        } else {
          const isWhite = char === char.toUpperCase();
          const color = isWhite ? COLOR.WHITE : COLOR.BLACK;
          const type = CHAR_TO_TYPE[char.toLowerCase()];
          if (!type) throw new Error(`Unknown FEN piece character: ${char}`);

          grid[row][col] = new Piece(color, type);
          col++;
        }
      }
    }

    return {
      grid,
      activeColor: turnPart === 'w' ? COLOR.WHITE : COLOR.BLACK,
      castlingRights: {
        whiteKingside: castlingPart.includes('K'),
        whiteQueenside: castlingPart.includes('Q'),
        blackKingside: castlingPart.includes('k'),
        blackQueenside: castlingPart.includes('q'),
      },
      enPassantTarget: enPassantPart === '-' ? null : enPassantPart,
      halfMoveClock: parseInt(halfMovePart, 10) || 0,
      fullMoveNumber: parseInt(fullMovePart, 10) || 1,
    };
  }

  static generate(boardState) {
    const {
      grid,
      activeColor,
      castlingRights,
      enPassantTarget,
      halfMoveClock,
      fullMoveNumber,
    } = boardState;

    // 1. Generar la disposición del tablero
    const fenRows = [];
    for (let row = 0; row < 8; row++) {
      let rowStr = '';
      let emptyCount = 0;

      for (let col = 0; col < 8; col++) {
        const piece = grid[row][col];
        if (!piece) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            rowStr += emptyCount;
            emptyCount = 0;
          }
          const char = TYPE_TO_CHAR[piece.type];
          rowStr += piece.color === COLOR.WHITE ? char.toUpperCase() : char;
        }
      }

      if (emptyCount > 0) rowStr += emptyCount;
      fenRows.push(rowStr);
    }

    const boardPart = fenRows.join('/');

    // 2. Turno activo
    const turnPart = activeColor === COLOR.WHITE ? 'w' : 'b';

    // 3. Derechos de enroque
    let castlingPart = '';
    if (castlingRights.whiteKingside) castlingPart += 'K';
    if (castlingRights.whiteQueenside) castlingPart += 'Q';
    if (castlingRights.blackKingside) castlingPart += 'k';
    if (castlingRights.blackQueenside) castlingPart += 'q';
    if (!castlingPart) castlingPart = '-';

    // 4. Peón al paso
    const enPassantPart = enPassantTarget || '-';

    // 5. Contadores de jugadas
    return `${boardPart} ${turnPart} ${castlingPart} ${enPassantPart} ${halfMoveClock} ${fullMoveNumber}`;
  }
}
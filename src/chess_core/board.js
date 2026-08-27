// chess_core/board.js
import { Piece, COLOR, PIECE_TYPE } from './piece.js';
import { FENHandler } from './fen.js';

export const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export class Board {
  constructor(fen = DEFAULT_FEN) {
    this.pgnHistory = [];
    this.loadFEN(fen);
  }

  // Sub-task 3: Load FEN
  loadFEN(fenString) {
    const parsed = FENHandler.parse(fenString);
    this.grid = parsed.grid;
    this.activeColor = parsed.activeColor;
    this.castlingRights = parsed.castlingRights;
    this.enPassantTarget = parsed.enPassantTarget;
    this.halfMoveClock = parsed.halfMoveClock;
    this.fullMoveNumber = parsed.fullMoveNumber;
  }

  // Sub-task 4: Export FEN
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

  // Sub-task 5: PGN Tracker
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
}
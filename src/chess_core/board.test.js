// src/chess_core/board.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Board, DEFAULT_FEN } from './board.js';
import { COLOR, PIECE_TYPE } from './piece.js';

describe('Chess Board State & FEN/PGN Logic', () => {
  it('should initialize the default board state correctly from FEN', () => {
    const board = new Board();
    assert.equal(board.toFEN(), DEFAULT_FEN);

    const a1Rook = board.grid[7][0];
    assert.equal(a1Rook.type, PIECE_TYPE.ROOK);
    assert.equal(a1Rook.color, COLOR.WHITE);
  });

  it('should parse custom FEN strings without corruption', () => {
    const e4e5Fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e3 0 2';
    const board = new Board(e4e5Fen);

    assert.equal(board.activeColor, COLOR.WHITE);
    assert.equal(board.enPassantTarget, 'e3');
    assert.equal(board.grid[4][4].type, PIECE_TYPE.PAWN);
    assert.equal(board.grid[3][4].type, PIECE_TYPE.PAWN);
    assert.equal(board.toFEN(), e4e5Fen);
  });

  it('should accurately append and export PGN history', () => {
    const board = new Board();
    board.recordMove('e4');
    board.activeColor = COLOR.BLACK;
    board.recordMove('e5');
    board.fullMoveNumber = 2;
    board.activeColor = COLOR.WHITE;
    board.recordMove('Nf3');

    const pgn = board.exportPGN();
    assert.ok(pgn.includes('1. e4 e5 2. Nf3'));
  });
});
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

  it('should only return moves for the active color', () => {
    const board = new Board(); // Active color is WHITE
    // Black pawn at b7 (index 10)
    const blackPawnMoves = board.getValidMovesByIndex(10);
    assert.equal(blackPawnMoves.length, 0); // Cannot move black pieces on white's turn
  });

  it('should calculate valid initial pawn moves (1 and 2 steps forward)', () => {
    const board = new Board();
    // White pawn at e2 (row 6, col 4 -> index 53)
    const e2PawnMoves = board.getValidMovesByIndex(53);
    assert.deepEqual(e2PawnMoves.sort((a, b) => a - b), [37, 45]); // e4 (index 37) and e3 (index 45)
  });

  it('should calculate valid knight moves from starting position', () => {
    const board = new Board();
    // White Knight at b1 (row 7, col 1 -> index 58)
    const knightMoves = board.getValidMovesByIndex(58);
    assert.deepEqual(knightMoves.sort((a, b) => a - b), [41, 43]); // a3 (index 41) and c3 (index 43)
  });

  it('should allow sliding pieces to raycast and stop at obstacles', () => {
    // Custom FEN: White Rook at d4 (index 36), enemy black pawn at d7 (index 12), friendly pawn at b4 (index 34)
    const fen = '8/3p4/8/8/1P1R4/8/8/8 w - - 0 1';
    const board = new Board(fen);
    
    const rookMoves = board.getValidMoves(4, 3); // d4 (index 36)
    
    assert.ok(rookMoves.includes(12)); // Includes capture on d7
    assert.ok(!rookMoves.includes(34)); // Blocked by friendly pawn on b4
  });
});

describe('Board.movePiece Execution & State Updates', () => {
  it('should update grid state correctly when moving a piece', () => {
    const board = new Board();
    
    // Move White pawn from e2 (index 53) to e4 (index 37)
    const success = board.movePiece(53, 37);
    
    assert.equal(success, true);
    assert.equal(board.getPieceByIndex(53), null); // Source square is now empty
    
    const movedPiece = board.getPieceByIndex(37); // Destination square contains pawn
    assert.ok(movedPiece);
    assert.equal(movedPiece.type, PIECE_TYPE.PAWN);
    assert.equal(movedPiece.color, COLOR.WHITE);
  });

  it('should toggle activeColor and update fullMoveNumber when Black moves', () => {
    const board = new Board();
    
    // White turn: e2 to e4 (53 to 37)
    board.movePiece(53, 37);
    assert.equal(board.activeColor, COLOR.BLACK);
    assert.equal(board.fullMoveNumber, 1);

    // Black turn: e7 to e5 (13 to 29)
    board.movePiece(13, 29);
    assert.equal(board.activeColor, COLOR.WHITE);
    assert.equal(board.fullMoveNumber, 2); // Incremented after Black completes turn
  });

  it('should automatically record moves and captures in PGN history', () => {
    const board = new Board();
    
    // 1. e4 (e2 index 53 to e4 index 37)
    board.movePiece(53, 37);
    
    // 1... d5 (d7 index 12 to d5 index 28)
    board.movePiece(12, 28);
    
    // 2. exd5 (e4 index 37 captures d5 index 28)
    board.movePiece(37, 28);

    const pgn = board.exportPGN();
    assert.ok(pgn.includes('1. e4 d5 2. exd5'));
  });

  it('should return false when trying to move from an empty square', () => {
    const board = new Board();
    // Index 36 (d4) is empty at starting position
    const success = board.movePiece(36, 28);
    assert.equal(success, false);
  });
});

describe('Chess edge-case rules', () => {
  it('should generate and execute kingside castling', () => {
    const board = new Board('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1');

    assert.ok(board.getValidMovesByIndex(61).includes(63));
    assert.equal(board.movePiece(61, 63), true);
    assert.equal(board.getPieceByIndex(63).type, PIECE_TYPE.KING);
    assert.equal(board.getPieceByIndex(62).type, PIECE_TYPE.ROOK);
    assert.equal(board.castlingRights.whiteKingside, false);
    assert.equal(board.castlingRights.whiteQueenside, false);
  });

  it('should reject castling through an attacked square', () => {
    const board = new Board('4kr2/8/8/8/8/8/8/4K2R w K - 0 1');

    assert.ok(!board.getValidMovesByIndex(61).includes(63));
  });

  it('should generate and execute en passant', () => {
    const board = new Board('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');

    assert.ok(board.getValidMovesByIndex(29).includes(20));
    assert.equal(board.movePiece(29, 20), true);
    assert.equal(board.getPieceByIndex(20).type, PIECE_TYPE.PAWN);
    assert.equal(board.getPieceByIndex(28), null);
    assert.equal(board.enPassantTarget, null);
  });

  it('should set the en-passant target after a two-square pawn move', () => {
    const board = new Board();

    board.movePiece(53, 37);

    assert.equal(board.enPassantTarget, 'e3');
  });

  it('should promote a pawn to the requested piece', () => {
    const board = new Board('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');

    assert.equal(board.movePiece(9, 1, PIECE_TYPE.KNIGHT), true);
    assert.equal(board.getPieceByIndex(1).type, PIECE_TYPE.KNIGHT);
  });
});
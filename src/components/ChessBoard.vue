<!-- src/components/ChessBoard.vue -->
<template>
  <div class="chessboard-container">
    <!-- Active Turn Status Bar -->
    <div 
      class="status-bar" 
      :class="[
        board.activeColor === COLOR.WHITE ? 'white' : 'black',
        { 'check-status': isCheck, 'mate-status': isGameOver }
      ]"
    >
      <span v-if="isCheckmate">
        CHECKMATE! {{ winningPlayerName }} Wins!
      </span>
      <span v-else-if="isStalemate">
        STALEMATE! Game ends in a draw.
      </span>
      <span v-else-if="isCheck">
        Turn: <strong>{{ activePlayerName }}</strong>
        <span class="check-warning"> (CHECK)</span>
      </span>
      <span v-else>
        Turn: <strong>{{ activePlayerName }}</strong>
      </span>
    </div>

    <div class="chessboard">
      <div 
        v-for="index in 64" 
        :key="index" 
        class="square"
        :class="[
          isDark(index) ? 'dark' : 'light',
          {
            'selected': selectedSquare === index,
            'highlight': possibleMoves.includes(index),
            'in-check': index === checkedKingIndex
          }
        ]"
        @click="handleSquareClick(index)"
      >
        <!-- Move indicator dot for empty target squares -->
        <span 
          v-if="possibleMoves.includes(index) && !getPiece(index)" 
          class="move-dot"
        ></span>

        <!-- Chess piece icon -->
        <span
          v-if="getPiece(index)"
          class="piece"
          :class="getPiece(index).color === COLOR.WHITE ? 'white-piece' : 'black-piece'"
        >
          {{ getPiece(index).symbol }}
        </span>

        <!-- Rank labels (1-8) -->
        <span v-if="getCol(index) === 0" class="label rank-label">
          {{ getRankLabel(index) }}
        </span>

        <!-- File labels (A-H) -->
        <span v-if="getRow(index) === 7" class="label file-label">
          {{ getFileLabel(index) }}
        </span>
      </div>

      <!-- Pawn Promotion Selection Menu -->
      <div v-if="promotionMove" class="promotion-menu">
        <button
          v-for="option in promotionOptions"
          :key="option.type"
          type="button"
          class="promotion-option"
          @click="completePromotion(option.type)"
        >
          {{ option.label }}
        </button>
      </div>

      <!-- Game Over Modal Overlay -->
      <div v-if="isGameOver" class="game-over-overlay">
        <div class="game-over-modal">
          <h2 v-if="isCheckmate">Checkmate!</h2>
          <h2 v-else>Stalemate</h2>
          <p v-if="isCheckmate">{{ winningPlayerName }} wins the game.</p>
          <p v-else>No legal moves remaining. The game is a draw.</p>
          <button type="button" class="restart-btn" @click="restartGame">Play Again</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { shallowRef, ref, computed, triggerRef } from 'vue';
import { Board } from '../chess_core/board.js';
import { COLOR, PIECE_TYPE } from '../chess_core/piece.js';

const board = shallowRef(new Board());
const selectedSquare = ref(null);
const possibleMoves = ref([]);
const promotionMove = ref(null);

const promotionOptions = [
  { type: PIECE_TYPE.QUEEN, label: 'Queen' },
  { type: PIECE_TYPE.ROOK, label: 'Rook' },
  { type: PIECE_TYPE.BISHOP, label: 'Bishop' },
  { type: PIECE_TYPE.KNIGHT, label: 'Knight' },
];

const getPiece = (index) => board.value.getPieceByIndex(index);
const getRow = (index) => Math.floor((index - 1) / 8);
const getCol = (index) => (index - 1) % 8;
const isDark = (index) => (getRow(index) + getCol(index)) % 2 === 1;
const getRankLabel = (index) => 8 - getRow(index);
const getFileLabel = (index) => String.fromCharCode(97 + getCol(index));

const checkedKingIndex = computed(() => board.value.getCheckedKingIndex());

// Game State Indicators
const activePlayerName = computed(() => board.value.activeColor === COLOR.WHITE ? 'White' : 'Black');
const winningPlayerName = computed(() => board.value.activeColor === COLOR.WHITE ? 'Black' : 'White');
const isCheck = computed(() => board.value.isInCheck());
const isCheckmate = computed(() => board.value.isCheckmate());
const isStalemate = computed(() => board.value.isStalemate());
const isGameOver = computed(() => isCheckmate.value || isStalemate.value);

const isPromotionMove = (fromIndex, toIndex) => {
  const piece = getPiece(fromIndex);
  const destinationRow = getRow(toIndex);
  return piece?.type === PIECE_TYPE.PAWN && (destinationRow === 0 || destinationRow === 7);
};

const completePromotion = (promotionType) => {
  if (!promotionMove.value) return;

  board.value.movePiece(
    promotionMove.value.from,
    promotionMove.value.to,
    promotionType
  );

  promotionMove.value = null;
  selectedSquare.value = null;
  possibleMoves.value = [];
  
  // Force Vue shallowRef to trigger re-render of turn status
  triggerRef(board);
};

/**
 * TURN MANAGEMENT CLICK HANDLER
 */
const handleSquareClick = (index) => {
  // Prevent move clicks when game is over or promotion menu is open
  if (isGameOver.value || promotionMove.value) return;

  const clickedPiece = getPiece(index);

  // 1. Move piece if clicking an available move square
  if (selectedSquare.value !== null && possibleMoves.value.includes(index)) {
    if (isPromotionMove(selectedSquare.value, index)) {
      promotionMove.value = { from: selectedSquare.value, to: index };
      return;
    }

    const moved = board.value.movePiece(selectedSquare.value, index);
    if (moved) {
      selectedSquare.value = null;
      possibleMoves.value = [];
      // Force Vue shallowRef to trigger re-render of turn status
      triggerRef(board);
    }
    return;
  }

  // 2. Deselect if clicking the same selected piece again
  if (selectedSquare.value === index) {
    selectedSquare.value = null;
    possibleMoves.value = [];
    return;
  }

  // 3. TURN ENFORCEMENT: Only select if piece belongs to the active turn player
  if (clickedPiece && clickedPiece.color === board.value.activeColor) {
    selectedSquare.value = index;
    possibleMoves.value = board.value.getValidMovesByIndex(index);
    return;
  }

  // 4. Reset selection when clicking empty/invalid squares
  selectedSquare.value = null;
  possibleMoves.value = [];
};

const restartGame = () => {
  board.value = new Board();
  selectedSquare.value = null;
  possibleMoves.value = [];
  promotionMove.value = null;
  triggerRef(board);
};
</script>

<style scoped>
.chessboard-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  font-family: sans-serif;
}

.status-bar {
  font-size: 16px;
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #ccc;
  background: #f4f4f4;
  width: 448px;
  text-align: center;
  transition: all 0.2s ease;
}

.status-bar.white {
  background: #ffffff;
  color: #222;
}

.status-bar.black {
  background: #222222;
  color: #fff;
  border-color: #444;
}

.status-bar.check-status {
  border-color: #e53935;
}

.status-bar.mate-status {
  background: #111;
  color: #fff;
  border-color: #000;
}

.check-warning {
  color: #e53935;
  font-weight: bold;
}

.chessboard {
  position: relative;
  display: grid;
  grid-template-columns: repeat(8, 60px);
  grid-template-rows: repeat(8, 60px);
  width: 480px;
  border: 4px solid #333;
  user-select: none;
}

.promotion-menu {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  gap: 6px;
  padding: 8px;
  background: #fff;
  border: 2px solid #333;
  transform: translate(-50%, -50%);
  z-index: 10;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
}

.promotion-option {
  padding: 8px 12px;
  border: 1px solid #999;
  background: #f0d9b5;
  font-weight: bold;
  cursor: pointer;
}

.game-over-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 15;
}

.game-over-modal {
  background: #fff;
  padding: 20px 30px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

.game-over-modal h2 {
  margin: 0 0 8px 0;
  color: #111;
}

.game-over-modal p {
  margin: 0 0 16px 0;
  color: #555;
}

.restart-btn {
  padding: 8px 16px;
  background: #2e7d32;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}

.restart-btn:hover {
  background: #1b5e20;
}

.square {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.light {
  background-color: #f0d9b5;
  color: #b58863;
}

.dark {
  background-color: #b58863;
  color: #f0d9b5;
}

.square.selected {
  background-color: #baca44 !important;
}

.square.highlight {
  cursor: pointer;
}

.square.highlight:has(.piece) {
  background-color: rgba(225, 0, 0, 0.55) !important;
}

.square.in-check {
  background-color: #ff5252 !important;
}

.move-dot {
  width: 18px;
  height: 18px;
  background-color: rgba(0, 0, 0, 0.25);
  border-radius: 50%;
  position: absolute;
  pointer-events: none;
}

.piece {
  font-size: 38px;
  line-height: 1;
  cursor: pointer;
  z-index: 1;
}

.white-piece {
  color: #fff;
  text-shadow: 0 0 2px #111;
}

.black-piece {
  color: #111;
}

.label {
  position: absolute;
  font-size: 11px;
  font-weight: bold;
  pointer-events: none;
}

.rank-label {
  top: 3px;
  left: 4px;
}

.file-label {
  bottom: 2px;
  right: 4px;
}
</style>
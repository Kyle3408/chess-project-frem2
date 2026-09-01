<!-- src/components/Chessboard.vue -->
<template>
  <div class="chessboard-container">
    <div class="chessboard">
      <div 
        v-for="index in 64" 
        :key="index" 
        class="square"
        :class="[
          isDark(index) ? 'dark' : 'light',
          {
            'selected': selectedSquare === index,
            'highlight': possibleMoves.includes(index)
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

        <!-- Rank labels (1-8): Shown on the left column (files A) -->
        <span v-if="getCol(index) === 0" class="label rank-label">
          {{ getRankLabel(index) }}
        </span>

        <!-- File labels (A-H): Shown on the bottom row (ranks 1) -->
        <span v-if="getRow(index) === 7" class="label file-label">
          {{ getFileLabel(index) }}
        </span>
      </div>

      <!-- Promotion Choice Modal Overlay -->
      <div v-if="pendingPromotion" class="promotion-overlay">
        <div class="promotion-modal">
          <h3>Promote Pawn</h3>
          <div class="promotion-options">
            <button 
              v-for="option in promotionOptions" 
              :key="option.type"
              class="promotion-btn"
              @click="confirmPromotion(option.type)"
            >
              {{ option.symbol }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { shallowRef, ref, computed } from 'vue';
import { Board } from '../chess_core/board.js';
import { COLOR, PIECE_TYPE } from '../chess_core/piece.js';

// Shallow ref keeps Board state clean
const board = shallowRef(new Board());

// Selection and movement state
const selectedSquare = ref(null);
const possibleMoves = ref([]);

// Pending promotion state: { fromIndex, toIndex, color }
const pendingPromotion = ref(null);

// Promotion choices dynamically matching upper-case constants
const promotionOptions = computed(() => {
  if (!pendingPromotion.value) return [];
  const isWhite = pendingPromotion.value.color === COLOR.WHITE;
  return [
    { type: PIECE_TYPE.QUEEN, symbol: isWhite ? '♕' : '♛' },
    { type: PIECE_TYPE.ROOK, symbol: isWhite ? '♖' : '♜' },
    { type: PIECE_TYPE.BISHOP, symbol: isWhite ? '♗' : '♝' },
    { type: PIECE_TYPE.KNIGHT, symbol: isWhite ? '♘' : '♞' },
  ];
});

// Core helper getters
const getPiece = (index) => board.value.getPieceByIndex(index);
const getRow = (index) => Math.floor((index - 1) / 8);
const getCol = (index) => (index - 1) % 8;
const isDark = (index) => (getRow(index) + getCol(index)) % 2 === 1;
const getRankLabel = (index) => 8 - getRow(index);
const getFileLabel = (index) => String.fromCharCode(97 + getCol(index));

/**
 * Handle square clicks for selection, move execution, and promotion trigger
 */
const handleSquareClick = (index) => {
  // Block clicks while promotion modal is open
  if (pendingPromotion.value) return;

  const clickedPiece = getPiece(index);

  // 1. If clicking a highlighted target square
  if (selectedSquare.value !== null && possibleMoves.value.includes(index)) {
    const movingPiece = getPiece(selectedSquare.value);
    const toRow = getRow(index);
    const isPawn = movingPiece && movingPiece.type === PIECE_TYPE.PAWN;
    const isPromotionRank = (movingPiece.color === COLOR.WHITE && toRow === 0) ||
                            (movingPiece.color === COLOR.BLACK && toRow === 7);

    // If pawn lands on promotion rank, pause and show selection modal
    if (isPawn && isPromotionRank) {
      pendingPromotion.value = {
        fromIndex: selectedSquare.value,
        toIndex: index,
        color: movingPiece.color,
      };
      return;
    }

    executeMove(selectedSquare.value, index);
    return;
  }

  // 2. Toggle selection off when clicking the selected square again
  if (selectedSquare.value === index) {
    clearSelection();
    return;
  }

  // 3. Select friendly piece if it's their turn
  if (clickedPiece && clickedPiece.color === board.value.activeColor) {
    selectedSquare.value = index;
    possibleMoves.value = board.value.getValidMovesByIndex(index);
    return;
  }

  clearSelection();
};

/**
 * Executes move on Board instance and updates shallowRef state
 */
const executeMove = (fromIndex, toIndex, promotionType = PIECE_TYPE.QUEEN) => {
  board.value.movePiece(fromIndex, toIndex, promotionType);
  clearSelection();
  board.value = board.value; // Re-trigger shallowRef reactivity
};

/**
 * Confirms promotion choice from modal button click
 */
const confirmPromotion = (pieceType) => {
  if (!pendingPromotion.value) return;
  const { fromIndex, toIndex } = pendingPromotion.value;
  pendingPromotion.value = null;
  executeMove(fromIndex, toIndex, pieceType);
};

const clearSelection = () => {
  selectedSquare.value = null;
  possibleMoves.value = [];
};
</script>

<style scoped>
.chessboard-container {
  position: relative;
  display: inline-block;
}

.chessboard {
  display: grid;
  grid-template-columns: repeat(8, 60px);
  grid-template-rows: repeat(8, 60px);
  width: 480px;
  border: 4px solid #333;
  user-select: none;
  position: relative;
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

/* Selected square highlight */
.square.selected {
  background-color: #baca44 !important;
}

/* Target square hover state */
.square.highlight {
  cursor: pointer;
}

/* Enemy piece capture highlight */
.square.highlight:has(.piece) {
  background-color: #e1000088 !important;
}

/* Empty destination move dot indicator */
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
  text-shadow: 0 0 1px #111;
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

/* --- Promotion Overlay Modal --- */
.promotion-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.promotion-modal {
  background: #fff;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  text-align: center;
}

.promotion-modal h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #333;
}

.promotion-options {
  display: flex;
  gap: 12px;
}

.promotion-btn {
  background: #f0d9b5;
  border: 2px solid #b58863;
  border-radius: 6px;
  font-size: 32px;
  width: 54px;
  height: 54px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease, background-color 0.1s ease;
}

.promotion-btn:hover {
  background-color: #baca44;
  transform: scale(1.08);
}
</style>
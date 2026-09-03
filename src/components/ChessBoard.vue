<!-- src/components/Chessboard.vue -->
<template>
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
  </div>
</template>

<script setup>
import { shallowRef, ref } from 'vue';
import { Board } from '../chess_core/board.js';
import { COLOR, PIECE_TYPE } from '../chess_core/piece.js';

// Use shallowRef to keep Board instance clean
const board = shallowRef(new Board());

// Sub-task 4: Reactive state for selected piece and valid target squares
const selectedSquare = ref(null);
const possibleMoves = ref([]);
const promotionMove = ref(null);
const promotionOptions = [
  { type: PIECE_TYPE.QUEEN, label: 'Queen' },
  { type: PIECE_TYPE.ROOK, label: 'Rook' },
  { type: PIECE_TYPE.BISHOP, label: 'Bishop' },
  { type: PIECE_TYPE.KNIGHT, label: 'Knight' },
];

// Core helper getters
const getPiece = (index) => board.value.getPieceByIndex(index);
const getRow = (index) => Math.floor((index - 1) / 8);
const getCol = (index) => (index - 1) % 8;
const isDark = (index) => (getRow(index) + getCol(index)) % 2 === 1;
const getRankLabel = (index) => 8 - getRow(index);
const getFileLabel = (index) => String.fromCharCode(97 + getCol(index));
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
    promotionType,
  );
  promotionMove.value = null;
  selectedSquare.value = null;
  possibleMoves.value = [];
  board.value = board.value;
};

/**
 * Sub-task 4: Selection and movement handler
 */
const handleSquareClick = (index) => {
  const clickedPiece = getPiece(index);

  // 1. If clicking a highlighted destination tile, execute move
  if (selectedSquare.value !== null && possibleMoves.value.includes(index)) {
    if (isPromotionMove(selectedSquare.value, index)) {
      promotionMove.value = { from: selectedSquare.value, to: index };
      return;
    }

    board.value.movePiece(selectedSquare.value, index);
    
    // Clear selection state
    selectedSquare.value = null;
    possibleMoves.value = [];
    
    // Re-assign board value to trigger shallowRef reactivity in Vue
    board.value = board.value;
    return;
  }

  // 2. If clicking the currently selected square: toggle selection off
  if (selectedSquare.value === index) {
    selectedSquare.value = null;
    possibleMoves.value = [];
    return;
  }

  // 3. If clicking a friendly piece matching the active turn, select (or reselect) it
  if (clickedPiece && clickedPiece.color === board.value.activeColor) {
    selectedSquare.value = index;
    possibleMoves.value = board.value.getValidMovesByIndex(index);
    return;
  }

  // 4. Clear selection on any other click
  selectedSquare.value = null;
  possibleMoves.value = [];
};
</script>

<style scoped>
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
  z-index: 2;
}

.promotion-option {
  padding: 8px 10px;
  border: 1px solid #999;
  background: #f0d9b5;
  cursor: pointer;
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

/* Highlight square of currently selected piece */
.square.selected {
  background-color: #baca44 !important;
}

/* Cursor pointer for valid target squares */
.square.highlight {
  cursor: pointer;
}

/* Capture highlight overlay on enemy piece target squares */
.square.highlight:has(.piece) {
  background-color: #e1000088 !important;
}

/* Visual dot indicator for empty destination squares */
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
</style>
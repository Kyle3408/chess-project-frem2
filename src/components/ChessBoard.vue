<template>
  <div class="chessboard">
    <div 
      v-for="index in 64" 
      :key="index" 
      class="square"
      :class="isDark(index) ? 'dark' : 'light'"
    >
      <!-- Chess piece icon -->
      <span v-if="getPiece(index)" class="piece">
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
  </div>
</template>

<script setup>
import { shallowRef } from 'vue';
import { Board } from '../chess_core/board.js';

// Use shallowRef to keep Board isntance clean
const board = shallowRef(new Board());

const getPiece = (index) => board.value.getPieceByIndex(index);
const getRow = (index) => Math.floor((index - 1) / 8);
const getCol = (index) => (index - 1) % 8;
const isDark = (index) => (getRow(index) + getCol(index)) % 2 === 1;
const getRankLabel = (index) => 8 - getRow(index);
const getFileLabel = (index) => String.fromCharCode(97 + getCol(index));
</script>

<style scoped>
.chessboard {
  display: grid;
  grid-template-columns: repeat(8, 60px);
  grid-template-rows: repeat(8, 60px);
  width: 480px;
  border: 4px solid #333;
  user-select: none;
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

.piece {
  font-size: 38px;
  line-height: 1;
  cursor: pointer;
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
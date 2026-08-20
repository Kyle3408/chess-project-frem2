<template>
  <div class="chessboard">
    <div 
      v-for="index in 64" 
      :key="index" 
      class="square"
      :class="isDark(index) ? 'dark' : 'light'"
    >
      <!-- Rank Label (1-8): Show only on the left column (files A) -->
      <span v-if="getCol(index) === 0" class="label rank-label">
        {{ getRankLabel(index) }}
      </span>

      <!-- File Label (A-H): Show only on the bottom row (ranks 1) -->
      <span v-if="getRow(index) === 7" class="label file-label">
        {{ getFileLabel(index) }}
      </span>
    </div>
  </div>
</template>

<script setup>
// Calculate zero-indexed row (0 to 7, top to bottom)
const getRow = (index) => Math.floor((index - 1) / 8);

// Calculate zero-indexed column (0 to 7, left to right)
const getCol = (index) => (index - 1) % 8;

// Determine square color based on row + column parity
const isDark = (index) => (getRow(index) + getCol(index)) % 2 === 1;

// Convert top-to-bottom row index to standard chess ranks (8 down to 1)
const getRankLabel = (index) => 8 - getRow(index);

// Convert left-to-right column index to standard chess files ('a' through 'h')
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
  position: relative; /* Essential so inner labels position relative to their square */
  display: flex;
  align-items: center;
  justify-content: center;
}

.light {
  background-color: #f0d9b5;
  color: #b58863; /* Label color matches dark tiles for contrast */
}

.dark {
  background-color: #b58863;
  color: #f0d9b5; /* Label color matches light tiles for contrast */
}

/* Base style for rank and file coordinates */
.label {
  position: absolute;
  font-size: 11px;
  font-weight: bold;
  pointer-events: none; /* Prevents labels from interfering with clicking/dragging */
}

/* Rank numbers (1-8): Top-left corner of the left-most squares */
.rank-label {
  top: 3px;
  left: 4px;
}

/* File letters (a-h): Bottom-right corner of the bottom-row squares */
.file-label {
  bottom: 2px;
  right: 4px;
}
</style>
<template>
  <div class="chessboard">
    <!-- Loop 64 times to generate tiles -->
    <div 
      v-for="index in 64" 
      :key="index" 
      class="square"
      :class="isDark(index) ? 'dark' : 'light'"
    >
      <!-- Tile index placeholder -->
      <span class="debug-label">{{ index }}</span>
    </div>
  </div>
</template>

<script setup>
// Math logic: determines if a tile should be dark or light
const isDark = (index) => {
  const row = Math.floor((index - 1) / 8);
  const col = (index - 1) % 8;
  return (row + col) % 2 === 1;
};
</script>

<style scoped>
/* CSS Grid to force 8 columns of equal size */
.chessboard {
  display: grid;
  grid-template-columns: repeat(8, 60px);
  grid-template-rows: repeat(8, 60px);
  width: 480px;
  border: 4px solid #333;
}

.square {
  display: flex;
  align-items: center;
  justify-content: center;
}

.light {
  background-color: #f0d9b5;
}

.dark {
  background-color: #b58863;
}

.debug-label {
  font-size: 10px;
  color: #333; 
  opacity: 0.5;
}
</style>
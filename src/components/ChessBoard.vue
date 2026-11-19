<!-- src/components/Chessboard.vue -->
<template>
  <div class="chessboard-container">
    <!-- User Session & Authentication Header Bar -->
    <div class="user-session-bar">
      <div v-if="currentUser" class="logged-in-badge">
        👤 Logged in as: <strong>{{ currentUsername }}</strong> (ID: {{ currentUser }})
        <button type="button" class="logout-btn" @click="logout">Logout</button>
      </div>
      <div v-else class="guest-actions">
        <span class="guest-text">Playing as Guest (Moves not saved)</span>
        <div class="auth-buttons">
          <button type="button" class="action-btn secondary" @click="openLoginModal">Login</button>
          <button type="button" class="action-btn" @click="showRegisterModal = true">Register</button>
        </div>
      </div>
    </div>

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

      <!-- Login Modal Overlay -->
      <div v-if="showLoginModal" class="game-over-overlay">
        <div class="game-over-modal auth-modal">
          <h2>Log In</h2>
          <p>Enter your credentials to access your account.</p>
          
          <form @submit.prevent="handleLogin" class="auth-form">
            <input type="email" v-model="loginForm.email" placeholder="Email" required />
            <input type="password" v-model="loginForm.password" placeholder="Password" required />
            
            <div class="forgot-link-row">
              <button type="button" class="text-link-btn" @click="openResetModal">
                Forgot password?
              </button>
            </div>

            <p v-if="loginError" class="error-msg">{{ loginError }}</p>
            <p v-if="loginSuccessMsg" class="success-msg">{{ loginSuccessMsg }}</p>

            <div class="modal-buttons">
              <button type="button" class="cancel-btn" @click="showLoginModal = false">Cancel</button>
              <button type="submit" class="submit-btn">Login</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Existing accounts set recovery questions after logging in -->
      <div v-if="showSecuritySetupModal" class="game-over-overlay">
        <div class="game-over-modal auth-modal">
          <h2>Set Up Password Recovery</h2>
          <p>Choose a question and answer so you can reset your password without email.</p>

          <form @submit.prevent="handleSaveSecurityQuestion" class="auth-form">
            <input
              type="password"
              v-model="securitySetupForm.currentPassword"
              placeholder="Current Password"
              required
            />
            <select v-model="securitySetupForm.securityQuestion" required>
              <option disabled value="">Choose a security question</option>
              <option
                v-for="question in securityQuestionOptions"
                :key="question.value"
                :value="question.value"
              >
                {{ question.label }}
              </option>
            </select>
            <input
              type="text"
              v-model="securitySetupForm.securityAnswer"
              placeholder="Your answer"
              autocomplete="off"
              required
            />

            <p v-if="securitySetupError" class="error-msg">{{ securitySetupError }}</p>

            <div class="modal-buttons">
              <button type="submit" class="submit-btn">Save Recovery Question</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Password Reset Modal Overlay -->
      <div v-if="showResetModal" class="game-over-overlay">
        <div class="game-over-modal auth-modal">
          <h2>Reset Password</h2>

          <!-- Step 1: Look up the account's security question -->
          <form v-if="resetStep === 1" @submit.prevent="handleRequestReset" class="auth-form">
            <p>Enter your registered email address to view your security question.</p>
            <input type="email" v-model="resetForm.email" placeholder="Registered Email" required />

            <p v-if="resetError" class="error-msg">{{ resetError }}</p>

            <div class="modal-buttons">
              <button type="button" class="cancel-btn" @click="backToLogin">Back to Login</button>
              <button type="submit" class="submit-btn">Show Question</button>
            </div>
          </form>

          <!-- Step 2: Answer the question and choose a new password -->
          <form v-else @submit.prevent="handleConfirmReset" class="auth-form">
            <p>Answer your security question and choose a new password.</p>
            <p class="security-question">{{ resetForm.securityQuestion }}</p>
            <input
              type="text"
              v-model="resetForm.securityAnswer"
              placeholder="Your answer"
              autocomplete="off"
              required
            />
            <input type="password" v-model="resetForm.newPassword" placeholder="New Password" required />
            <input type="password" v-model="resetForm.confirmPassword" placeholder="Confirm New Password" required />

            <p v-if="resetError" class="error-msg">{{ resetError }}</p>

            <div class="modal-buttons">
              <button type="button" class="cancel-btn" @click="resetStep = 1">Back</button>
              <button type="submit" class="submit-btn">Update Password</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Registration Modal Overlay -->
      <div v-if="showRegisterModal" class="game-over-overlay">
        <div class="game-over-modal auth-modal">
          <h2>Create an Account</h2>
          <p>Register to start saving your games and moves to the database.</p>
          
          <form @submit.prevent="handleRegister" class="auth-form">
            <input type="text" v-model="regForm.username" placeholder="Username" required />
            <input type="email" v-model="regForm.email" placeholder="Email" required />
            <input type="password" v-model="regForm.password" placeholder="Password" required />
            <select v-model="regForm.securityQuestion" required>
              <option disabled value="">Choose a security question</option>
              <option
                v-for="question in securityQuestionOptions"
                :key="question.value"
                :value="question.value"
              >
                {{ question.label }}
              </option>
            </select>
            <input
              type="text"
              v-model="regForm.securityAnswer"
              placeholder="Security answer (used for password recovery)"
              autocomplete="off"
              required
            />
            
            <p v-if="regError" class="error-msg">{{ regError }}</p>

            <div class="modal-buttons">
              <button type="button" class="cancel-btn" @click="showRegisterModal = false">Cancel</button>
              <button type="submit" class="submit-btn">Register & Login</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { shallowRef, ref, computed, onMounted, triggerRef } from 'vue';
import { Board } from '../chess_core/board.js';
import { COLOR, PIECE_TYPE } from '../chess_core/piece.js';

const board = shallowRef(new Board());
const selectedSquare = ref(null);
const possibleMoves = ref([]);
const promotionMove = ref(null);

// User Session State
const currentUser = ref(null); // null = guest mode
const currentUsername = ref('');
const currentGameId = ref(null);

// Login Form State
const showLoginModal = ref(false);
const loginForm = ref({ email: '', password: '' });
const loginError = ref('');
const loginSuccessMsg = ref('');

// Password Reset Form State
const showResetModal = ref(false);
const resetStep = ref(1);
const resetForm = ref({ email: '', securityQuestion: '', securityAnswer: '', newPassword: '', confirmPassword: '' });
const resetError = ref('');
const showSecuritySetupModal = ref(false);
const securitySetupForm = ref({ email: '', currentPassword: '', securityQuestion: '', securityAnswer: '' });
const securitySetupError = ref('');

// Registration Form State
const showRegisterModal = ref(false);
const regForm = ref({ username: '', email: '', password: '', securityQuestion: '', securityAnswer: '' });
const regError = ref('');

const securityQuestionOptions = [
  { value: 'first_pet', label: 'What was the name of your first pet?' },
  { value: 'first_school', label: 'What was the name of your first school?' },
  { value: 'birth_city', label: 'In what city were you born?' },
  { value: 'childhood_friend', label: 'What was the first name of a childhood friend?' }
];

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

// --- MODAL NAVIGATION HELPERS ---
const openLoginModal = () => {
  loginError.value = '';
  loginSuccessMsg.value = '';
  showLoginModal.value = true;
};

const openResetModal = () => {
  showLoginModal.value = false;
  resetStep.value = 1;
  resetError.value = '';
  resetForm.value = {
    email: loginForm.value.email || '',
    securityQuestion: '',
    securityAnswer: '',
    newPassword: '',
    confirmPassword: ''
  };
  showResetModal.value = true;
};

const backToLogin = () => {
  showResetModal.value = false;
  showLoginModal.value = true;
};

// --- AUTHENTICATION HANDLERS ---
const handleLogin = async () => {
  loginError.value = '';
  loginSuccessMsg.value = '';
  try {
    const response = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm.value)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to login');
    }

    currentUser.value = data.id;
    currentUsername.value = data.username;
    showLoginModal.value = false;
    if (!data.hasSecurityQuestion) {
      securitySetupForm.value = {
        email: loginForm.value.email,
        currentPassword: '',
        securityQuestion: '',
        securityAnswer: ''
      };
      securitySetupError.value = '';
      showSecuritySetupModal.value = true;
    }
    loginForm.value = { email: '', password: '' };

    initializeGameInDB();
  } catch (err) {
    loginError.value = err.message;
  }
};

const handleRequestReset = async () => {
  resetError.value = '';
  try {
    const response = await fetch('http://localhost:5000/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resetForm.value.email })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to look up security question');
    }

    resetForm.value.securityQuestion = data.securityQuestion;
    resetStep.value = 2;
  } catch (err) {
    resetError.value = err.message;
  }
};

const handleSaveSecurityQuestion = async () => {
  securitySetupError.value = '';
  try {
    const response = await fetch('http://localhost:5000/api/security-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(securitySetupForm.value)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to save security question');
    }

    showSecuritySetupModal.value = false;
    securitySetupForm.value = {
      email: '',
      currentPassword: '',
      securityQuestion: '',
      securityAnswer: ''
    };
  } catch (err) {
    securitySetupError.value = err.message;
  }
};

const handleConfirmReset = async () => {
  resetError.value = '';

  if (resetForm.value.newPassword !== resetForm.value.confirmPassword) {
    resetError.value = 'Passwords do not match.';
    return;
  }

  try {
    const response = await fetch('http://localhost:5000/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: resetForm.value.email,
        securityAnswer: resetForm.value.securityAnswer,
        newPassword: resetForm.value.newPassword
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to reset password');
    }

    // Return to login modal with pre-filled email and confirmation message
    showResetModal.value = false;
    loginForm.value.email = resetForm.value.email;
    loginForm.value.password = '';
    loginError.value = '';
    loginSuccessMsg.value = 'Password reset! Please log in with your new password.';
    showLoginModal.value = true;
  } catch (err) {
    resetError.value = err.message;
  }
};

const handleRegister = async () => {
  regError.value = '';
  try {
    const response = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regForm.value)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to register');
    }

    currentUser.value = data.id;
    currentUsername.value = data.username;
    showRegisterModal.value = false;
    regForm.value = { username: '', email: '', password: '', securityQuestion: '', securityAnswer: '' };

    initializeGameInDB();
  } catch (err) {
    regError.value = err.message;
  }
};

const logout = () => {
  currentUser.value = null;
  currentUsername.value = '';
  currentGameId.value = null;
  board.value = new Board();
  triggerRef(board);
};

// --- DATABASE INTEGRATION ---
const initializeGameInDB = async () => {
  if (!currentUser.value) return;

  try {
    const response = await fetch('http://localhost:5000/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whitePlayerId: currentUser.value, blackPlayerId: null })
    });
    const gameData = await response.json();
    currentGameId.value = gameData.id;
    console.log("Game created in PostgreSQL with ID:", currentGameId.value);
  } catch (err) {
    console.error("Error connecting to backend to create game:", err);
  }
};

const saveMoveToDB = async (sanMoveText) => {
  if (!currentUser.value || !currentGameId.value) return;

  try {
    const currentFen = board.value.toFEN ? board.value.toFEN() : '';
    await fetch('http://localhost:5000/api/moves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: currentGameId.value,
        playerId: currentUser.value,
        moveNumber: board.value.fullMoveNumber || 1,
        sanMove: sanMoveText || 'move',
        fenAfterMove: currentFen
      })
    });
    console.log("Move saved to database.");
  } catch (err) {
    console.error("Error saving move to database:", err);
  }
};

onMounted(() => {
  initializeGameInDB();
});

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

  saveMoveToDB('promotion');

  promotionMove.value = null;
  selectedSquare.value = null;
  possibleMoves.value = [];
  triggerRef(board);
};

/**
 * TURN MANAGEMENT CLICK HANDLER
 */
const handleSquareClick = (index) => {
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
      saveMoveToDB('move');
      selectedSquare.value = null;
      possibleMoves.value = [];
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
  initializeGameInDB();
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

.user-session-bar {
  width: 448px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f4f4f4;
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 14px;
}

.guest-text {
  color: #666;
}

.auth-buttons {
  display: flex;
  gap: 6px;
}

.action-btn, .submit-btn {
  padding: 6px 12px;
  background: #2e7d32;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}

.action-btn.secondary {
  background: #1976d2;
}

.action-btn:hover, .submit-btn:hover {
  background: #1b5e20;
}

.action-btn.secondary:hover {
  background: #115293;
}

.logout-btn {
  padding: 4px 8px;
  background: #d32f2f;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-left: 8px;
}

.logout-btn:hover {
  background: #c62828;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.auth-form input,
.auth-form select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.security-question {
  margin: 0;
  padding: 10px;
  background: #f4f4f4;
  border-radius: 4px;
  font-weight: bold;
}

.forgot-link-row {
  display: flex;
  justify-content: flex-end;
  margin-top: -4px;
}

.text-link-btn {
  background: none;
  border: none;
  color: #1976d2;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.text-link-btn:hover {
  color: #0d47a1;
}

.error-msg {
  color: #d32f2f;
  font-size: 13px;
  margin: 0;
}

.success-msg {
  color: #2e7d32;
  font-size: 13px;
  margin: 0;
  font-weight: bold;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.cancel-btn {
  padding: 6px 12px;
  background: #9e9e9e;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn:hover {
  background: #757575;
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

.auth-modal {
  width: 320px;
  text-align: left;
}

.game-over-modal h2 {
  margin: 0 0 8px 0;
  color: #111;
}

.game-over-modal p {
  margin: 0 0 16px 0;
  color: #555;
  font-size: 14px;
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
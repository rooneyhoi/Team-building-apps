// Game State
let gameState = {
  language: 'vi',
  cards: [],
  playerCards: [],
  neutralCards: [],
  assassinCard: null,
  revealedCards: new Set(),
  currentGuesses: 0,
  storedGuesses: 0,
  currentHint: null,
  hintHistory: [],
  usedHints: [],
  spymasterMode: false,
  totalTimeLeft: 1 * 60,
  totalTimerInterval: null,
  gameOver: false,
  gameStarted: false
};

// Initialize game
function initGame() {
  setupEventListeners();
  updateUILanguage();
  
  // Show initial empty board
  document.getElementById('hint-text').textContent = '---';
  document.getElementById('timer-total').textContent = '1:00';
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('language-select').addEventListener('change', changeLanguage);
  document.getElementById('btn-new-hint').addEventListener('click', generateNewHint);
  document.getElementById('btn-spymaster').addEventListener('click', toggleSpymasterMode);
  document.getElementById('btn-new-game').addEventListener('click', newGame);
  document.getElementById('btn-end-game').addEventListener('click', endGame);
  document.getElementById('btn-play-again').addEventListener('click', () => {
    document.getElementById('game-over-modal').classList.remove('show');
    endGame(); // Return to waiting screen instead of starting new game
  });
}

// Change language
function changeLanguage(e) {
  gameState.language = e.target.value;
  updateUILanguage();
}

// End game
function endGame() {
  // Stop timers
  clearInterval(gameState.totalTimerInterval);
  
  // Clear game state
  gameState.gameStarted = false;
  gameState.gameOver = false;
  gameState.cards = [];
  gameState.playerCards = [];
  gameState.revealedCards = new Set();
  gameState.currentGuesses = 0;
  gameState.currentHint = null;
  gameState.hintHistory = [];
  gameState.usedHints = [];
  gameState.totalTimeLeft = 1 * 60;
  
  // Enable language selector
  document.getElementById('language-select').disabled = false;
  
  // Clear localStorage
  localStorage.removeItem('codenames-game');
  
  // Reset UI
  document.getElementById('game-board').innerHTML = '';
  document.getElementById('hint-text').textContent = '---';
  document.getElementById('hint-history').textContent = '';
  document.getElementById('timer-total').textContent = '1:00';
  document.getElementById('cards-found').textContent = '0';
  document.getElementById('cards-total').textContent = '9';
  document.getElementById('guesses-left').textContent = '0';
}

// Update UI language
function updateUILanguage() {
  const t = gameData.translations[gameState.language];
  document.getElementById('game-title').textContent = t.gameTitle;
  document.getElementById('label-cards-found').textContent = t.cardsFoundLabel;
  document.getElementById('label-guesses-left').textContent = t.guessesLeft;
  document.getElementById('label-timer-total').textContent = t.timerTotal;
  document.getElementById('label-ai-hint').textContent = t.aiHint;
  document.getElementById('btn-new-hint').textContent = t.btnNewHint;
  document.getElementById('btn-spymaster').textContent = t.btnSpymaster;
  document.getElementById('btn-new-game').textContent = t.btnNewGame;
  document.getElementById('btn-end-game').textContent = t.btnEndGame;
  document.getElementById('btn-play-again').textContent = t.btnPlayAgain;
}

// New game
function newGame() {
  clearInterval(gameState.totalTimerInterval);
  
  // Clear localStorage
  localStorage.removeItem('codenames-game');
  
  gameState.revealedCards = new Set();
  gameState.currentGuesses = 0;
  gameState.storedGuesses = 0;
  gameState.currentHint = null;
  gameState.hintHistory = [];
  gameState.usedHints = [];
  gameState.spymasterMode = false;
  gameState.totalTimeLeft = 1 * 60;
  gameState.gameOver = false;
  
  // Enable language selector
  document.getElementById('language-select').disabled = false;
  
  // Generate cards
  const words = gameData.words[gameState.language];
  const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, 25);
  
  gameState.cards = shuffled.map((word, index) => ({
    word,
    type: index < 9 ? 'player' : index < 24 ? 'neutral' : 'assassin',
    revealed: false
  }));
  
  // Shuffle cards positions
  gameState.cards.sort(() => Math.random() - 0.5);
  
  gameState.playerCards = gameState.cards.filter(c => c.type === 'player');
  gameState.neutralCards = gameState.cards.filter(c => c.type === 'neutral');
  gameState.assassinCard = gameState.cards.find(c => c.type === 'assassin');
  
  updateUILanguage();
  renderBoard();
  updateStats();
  generateNewHint();
  
  // Mark game as started and start timers
  gameState.gameStarted = true;
  startTimers();
  
  saveGameState();
}

// Generate AI hint
function generateNewHint() {
  if (gameState.gameOver) return;
  
  const unrevealed = gameState.playerCards.filter(c => !gameState.revealedCards.has(c.word));
  if (unrevealed.length === 0) return;
  
  const categories = gameData.categories[gameState.language];
  let bestHint = null;
  let maxCount = 0;
  
  // Find best category that matches most unrevealed player cards and not used before
  for (const [category, words] of Object.entries(categories)) {
    if (gameState.usedHints.includes(category)) continue; // Skip used hints
    const matches = unrevealed.filter(c => words.includes(c.word));
    if (matches.length > maxCount) {
      maxCount = matches.length;
      bestHint = { hint: category, count: matches.length };
    }
  }
  
  // Fallback: random hint if no category matches
  if (!bestHint || maxCount === 0) {
    const randomCard = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const randomHint = randomCard.word.substring(0, 3) + "...";
    bestHint = { hint: randomHint, count: 1 };
  }
  
  gameState.currentHint = bestHint;
  gameState.currentGuesses = bestHint.count;
  gameState.hintHistory.push(`${bestHint.hint}: ${bestHint.count}`);
  gameState.usedHints.push(bestHint.hint);
  
  document.getElementById('hint-text').textContent = `${bestHint.hint}: ${bestHint.count}`;
  
  const t = gameData.translations[gameState.language];
  const historyText = gameState.hintHistory.slice(-3).join(' • ');
  document.getElementById('hint-history').textContent = `${t.hintHistory} ${historyText}`;
  
  updateStats();
  saveGameState();
}

// Toggle spymaster mode
function toggleSpymasterMode() {
  gameState.spymasterMode = !gameState.spymasterMode;
  renderBoard();
  saveGameState();
}

// Handle card click
function handleCardClick(index) {
  if (gameState.gameOver) return;
  if (gameState.currentGuesses <= 0) {
    const t = gameData.translations[gameState.language];
    alert(t.noGuessesAlert);
    return;
  }
  
  const card = gameState.cards[index];
  if (card.revealed) return;
  
  card.revealed = true;
  gameState.revealedCards.add(card.word);
  gameState.currentGuesses--;
  
  // Check win/lose
  if (card.type === 'assassin') {
    gameOver('lose-assassin');
  } else if (card.type === 'player') {
    const playerRevealed = gameState.playerCards.filter(c => gameState.revealedCards.has(c.word)).length;
    if (playerRevealed === 9) {
      gameOver('win');
    }
    // If no guesses left after finding player card, auto end turn
    if (gameState.currentGuesses <= 0) {
      setTimeout(() => {
        if (!gameState.gameOver) {
          generateNewHint();
        }
      }, 500);
    }
  } else {
    // Wrong guess - just decrease guess count, don't end turn
    // Player will continue until guesses run out
    // If no guesses left, auto-generate new hint
    if (gameState.currentGuesses <= 0) {
      setTimeout(() => {
        if (!gameState.gameOver) {
          generateNewHint();
        }
      }, 500);
    }
  }
  
  renderBoard();
  updateStats();
  saveGameState();
}

// Start timers
function startTimers() {
  // Clear existing timers
  clearInterval(gameState.totalTimerInterval);
  
  // Disable language selector during game
  document.getElementById('language-select').disabled = true;
  
  // Total timer
  gameState.totalTimerInterval = setInterval(() => {
    if (gameState.gameOver) return;
    
    gameState.totalTimeLeft--;
    if (gameState.totalTimeLeft <= 0) {
      gameOver('time-up');
    }
    updateTimerDisplay();
    saveGameState();
  }, 1000);
}

// Update timer display
function updateTimerDisplay() {
  const totalMin = Math.floor(gameState.totalTimeLeft / 60);
  const totalSec = gameState.totalTimeLeft % 60;
  
  const totalEl = document.getElementById('timer-total');
  
  totalEl.textContent = `${totalMin}:${totalSec.toString().padStart(2, '0')}`;
  
  // Warning when time is low
  if (gameState.totalTimeLeft < 60) {
    totalEl.classList.add('warning');
  } else {
    totalEl.classList.remove('warning');
  }
}

// Render board
function renderBoard() {
  const board = document.getElementById('game-board');
  board.innerHTML = '';
  
  gameState.cards.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.textContent = card.word;
    
    if (card.revealed) {
      cardEl.classList.add('revealed', card.type);
    }
    
    if (gameState.spymasterMode && !card.revealed) {
      cardEl.classList.add('spymaster-mode', card.type);
    }
    
    cardEl.addEventListener('click', () => handleCardClick(index));
    board.appendChild(cardEl);
  });
}

// Update stats
function updateStats() {
  const playerRevealed = gameState.playerCards.filter(c => gameState.revealedCards.has(c.word)).length;
  document.getElementById('cards-found').textContent = playerRevealed;
  document.getElementById('cards-total').textContent = '9';
  document.getElementById('guesses-left').textContent = gameState.currentGuesses;
}

// Game over
function gameOver(reason) {
  gameState.gameOver = true;
  clearInterval(gameState.totalTimerInterval);
  clearInterval(gameState.turnTimerInterval);
  
  // Re-enable language selector
  document.getElementById('language-select').disabled = false;
  
  const t = gameData.translations[gameState.language];
  const modal = document.getElementById('game-over-modal');
  const title = document.getElementById('modal-title');
  const message = document.getElementById('modal-message');
  
  if (reason === 'win') {
    title.textContent = t.youWin;
    message.textContent = t.winMessage;
  } else if (reason === 'lose-assassin') {
    title.textContent = t.youLose;
    message.textContent = t.loseAssassin;
  } else if (reason === 'time-up') {
    const playerRevealed = gameState.playerCards.filter(c => gameState.revealedCards.has(c.word)).length;
    title.textContent = t.timeUp;
    message.textContent = `${t.cardsFound.replace('{}', playerRevealed)}`;
  }
  
  modal.classList.add('show');
  
  // Reveal all cards
  gameState.cards.forEach(card => card.revealed = true);
  renderBoard();
  saveGameState();
}

// Save game state to localStorage
function saveGameState() {
  try {
    const stateToSave = {
      ...gameState,
      revealedCards: Array.from(gameState.revealedCards)
    };
    localStorage.setItem('codenames-game', JSON.stringify(stateToSave));
  } catch (e) {
    console.error('Failed to save game state:', e);
  }
}

// Load game state from localStorage
function loadGameState() {
  try {
    const saved = localStorage.getItem('codenames-game');
    if (saved) {
      const loaded = JSON.parse(saved);
      
      // Only load if game was in progress
      if (!loaded.gameOver && loaded.cards && loaded.cards.length > 0) {
        gameState = {
          ...loaded,
          revealedCards: new Set(loaded.revealedCards || []),
          totalTimerInterval: null,
          turnTimerInterval: null
        };
        
        // Set language select
        document.getElementById('language-select').value = gameState.language;
        
        return true;
      }
    }
  } catch (e) {
    console.error('Failed to load game state:', e);
  }
  return false;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initGame);
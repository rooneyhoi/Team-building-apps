## **File 4: script.js**

```javascript
// Game State
let gameState = {
  language: 'vi',
  cards: [],
  redCards: [],
  blueCards: [],
  neutralCards: [],
  assassinCard: null,
  revealedCards: new Set(),
  currentGuesses: 0,
  storedGuesses: 0,
  currentHint: null,
  hintHistory: [],
  spymasterMode: false,
  totalTimeLeft: 20 * 60,
  turnTimeLeft: 2 * 60,
  totalTimerInterval: null,
  turnTimerInterval: null,
  gameOver: false
};

// Initialize game
function initGame() {
  const loaded = loadGameState();
  setupEventListeners();
  
  if (loaded && !gameState.gameOver) {
    // Continue existing game
    renderBoard();
    updateStats();
    updateTimerDisplay();
    updateUILanguage();
    startTimers();
  } else {
    // Start new game
    newGame();
  }
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById('language-select').addEventListener('change', changeLanguage);
  document.getElementById('btn-new-hint').addEventListener('click', generateNewHint);
  document.getElementById('btn-end-turn').addEventListener('click', endTurn);
  document.getElementById('btn-spymaster').addEventListener('click', toggleSpymasterMode);
  document.getElementById('btn-new-game').addEventListener('click', newGame);
  document.getElementById('btn-play-again').addEventListener('click', () => {
    document.getElementById('game-over-modal').classList.remove('show');
    newGame();
  });
}

// Change language
function changeLanguage(e) {
  gameState.language = e.target.value;
  updateUILanguage();
  newGame();
}

// Update UI language
function updateUILanguage() {
  const t = gameData.translations[gameState.language];
  document.getElementById('game-title').textContent = t.gameTitle;
  document.getElementById('label-red-found').textContent = t.redFound;
  document.getElementById('label-guesses-left').textContent = t.guessesLeft;
  document.getElementById('label-timer-total').textContent = t.timerTotal;
  document.getElementById('label-timer-turn').textContent = t.timerTurn;
  document.getElementById('label-ai-hint').textContent = t.aiHint;
  document.getElementById('btn-new-hint').textContent = t.btnNewHint;
  document.getElementById('btn-end-turn').textContent = t.btnEndTurn;
  document.getElementById('btn-spymaster').textContent = t.btnSpymaster;
  document.getElementById('btn-new-game').textContent = t.btnNewGame;
  document.getElementById('btn-play-again').textContent = t.btnPlayAgain;
}

// New game
function newGame() {
  clearInterval(gameState.totalTimerInterval);
  clearInterval(gameState.turnTimerInterval);
  
  gameState.revealedCards = new Set();
  gameState.currentGuesses = 0;
  gameState.storedGuesses = 0;
  gameState.currentHint = null;
  gameState.hintHistory = [];
  gameState.spymasterMode = false;
  gameState.totalTimeLeft = 20 * 60;
  gameState.turnTimeLeft = 2 * 60;
  gameState.gameOver = false;
  
  // Generate cards
  const words = gameData.words[gameState.language];
  const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, 25);
  
  gameState.cards = shuffled.map((word, index) => ({
    word,
    type: index < 8 ? 'red' : index < 15 ? 'blue' : index < 24 ? 'neutral' : 'assassin',
    revealed: false
  }));
  
  // Shuffle cards positions
  gameState.cards.sort(() => Math.random() - 0.5);
  
  gameState.redCards = gameState.cards.filter(c => c.type === 'red');
  gameState.blueCards = gameState.cards.filter(c => c.type === 'blue');
  gameState.neutralCards = gameState.cards.filter(c => c.type === 'neutral');
  gameState.assassinCard = gameState.cards.find(c => c.type === 'assassin');
  
  updateUILanguage();
  renderBoard();
  updateStats();
  generateNewHint();
  startTimers();
  saveGameState();
}

// Generate AI hint
function generateNewHint() {
  if (gameState.gameOver) return;
  
  const unrevealed = gameState.redCards.filter(c => !gameState.revealedCards.has(c.word));
  if (unrevealed.length === 0) return;
  
  const categories = gameData.categories[gameState.language];
  let bestHint = null;
  let maxCount = 0;
  
  // Find best category that matches most unrevealed red cards
  for (const [category, words] of Object.entries(categories)) {
    const matches = unrevealed.filter(c => words.includes(c.word));
    if (matches.length > maxCount) {
      maxCount = matches.length;
      bestHint = { hint: category, count: matches.length };
    }
  }
  
  // Fallback: random hint if no category matches
  if (!bestHint || maxCount === 0) {
    const randomCard = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    bestHint = { hint: randomCard.word.substring(0, 3) + "...", count: 1 };
  }
  
  gameState.currentHint = bestHint;
  gameState.currentGuesses = bestHint.count + gameState.storedGuesses;
  gameState.storedGuesses = 0;
  gameState.hintHistory.push(`${bestHint.hint}: ${bestHint.count}`);
  
  // Reset turn timer
  gameState.turnTimeLeft = 2 * 60;
  
  document.getElementById('hint-text').textContent = `${bestHint.hint}: ${bestHint.count}`;
  
  const t = gameData.translations[gameState.language];
  const historyText = gameState.hintHistory.slice(-3).join(' • ');
  document.getElementById('hint-history').textContent = `${t.hintHistory} ${historyText}`;
  
  updateStats();
  saveGameState();
}

// End turn
function endTurn() {
  if (gameState.gameOver) return;
  
  // Store unused guesses
  gameState.storedGuesses += gameState.currentGuesses;
  gameState.currentGuesses = 0;
  
  // Reset turn timer
  gameState.turnTimeLeft = 2 * 60;
  
  // Generate new hint
  generateNewHint();
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
    alert(gameState.language === 'vi' ? 'Hết lượt đoán! Nhấn "Gợi ý mới" hoặc "Kết thúc lượt".' : 
          gameState.language === 'en' ? 'No guesses left! Click "New Hint" or "End Turn".' :
          gameState.language === 'fr' ? 'Plus de tentatives! Cliquez sur "Nouvel Indice" ou "Fin du Tour".' :
          'Keine Versuche mehr! Klicken Sie auf "Neuer Hinweis" oder "Runde Beenden".');
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
  } else if (card.type === 'red') {
    const redRevealed = gameState.redCards.filter(c => gameState.revealedCards.has(c.word)).length;
    if (redRevealed === 8) {
      gameOver('win');
    }
  } else {
    // Wrong guess - end turn automatically but keep guesses for next turn
    gameState.storedGuesses += gameState.currentGuesses;
    gameState.currentGuesses = 0;
    
    // Small delay before generating new hint
    setTimeout(() => {
      if (!gameState.gameOver) {
        generateNewHint();
      }
    }, 500);
  }
  
  renderBoard();
  updateStats();
  saveGameState();
}

// Start timers
function startTimers() {
  // Clear existing timers
  clearInterval(gameState.totalTimerInterval);
  clearInterval(gameState.turnTimerInterval);
  
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
  
  // Turn timer
  gameState.turnTimerInterval = setInterval(() => {
    if (gameState.gameOver) return;
    
    gameState.turnTimeLeft--;
    if (gameState.turnTimeLeft <= 0) {
      // Time's up for this turn - store unused guesses
      gameState.storedGuesses += gameState.currentGuesses;
      gameState.currentGuesses = 0;
      generateNewHint();
    }
    updateTimerDisplay();
  }, 1000);
}

// Update timer display
function updateTimerDisplay() {
  const totalMin = Math.floor(gameState.totalTimeLeft / 60);
  const totalSec = gameState.totalTimeLeft % 60;
  const turnMin = Math.floor(gameState.turnTimeLeft / 60);
  const turnSec = gameState.turnTimeLeft % 60;
  
  const totalEl = document.getElementById('timer-total');
  const turnEl = document.getElementById('timer-turn');
  
  totalEl.textContent = `${totalMin}:${totalSec.toString().padStart(2, '0')}`;
  turnEl.textContent = `${turnMin}:${turnSec.toString().padStart(2, '0')}`;
  
  // Warning when time is low
  if (gameState.totalTimeLeft < 60) {
    totalEl.classList.add('warning');
  } else {
    totalEl.classList.remove('warning');
  }
  
  if (gameState.turnTimeLeft < 30) {
    turnEl.classList.add('warning');
  } else {
    turnEl.classList.remove('warning');
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
  const redRevealed = gameState.redCards.filter(c => gameState.revealedCards.has(c.word)).length;
  document.getElementById('red-found').textContent = redRevealed;
  document.getElementById('red-total').textContent = '8';
  document.getElementById('guesses-left').textContent = gameState.currentGuesses;
}

// Game over
function gameOver(reason) {
  gameState.gameOver = true;
  clearInterval(gameState.totalTimerInterval);
  clearInterval(gameState.turnTimerInterval);
  
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
    const blueRevealed = gameState.blueCards.filter(c => gameState.revealedCards.has(c.word)).length;
    const redRevealed = gameState.redCards.filter(c => gameState.revealedCards.has(c.word)).length;
    
    if (redRevealed > blueRevealed) {
      title.textContent = t.youWin;
      message.textContent = `${t.timeUp.split('!')[0]}! ${t.winMessage}`;
    } else {
      title.textContent = t.timeUp;
      message.textContent = `${t.loseTime} ${blueRevealed} ${t.cardsFound}`;
    }
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
```

-----

## 🎉 **HOÀN THÀNH!**

Bạn đã có đầy đủ 4 files:

1. ✅ **index.html** - Cấu trúc HTML
1. ✅ **styles.css** - Styling đẹp
1. ✅ **data.js** - Dữ liệu từ và categories
1. ✅ **script.js** - Game logic hoàn chỉnh

### **Cách chạy:**

1. Tạo folder mới: `codenames-game`
1. Copy 4 files vào folder đó
1. Double click `index.html`
1. Chơi ngay! 🎮

### **Hoặc host lên:**

- **GitHub Pages**: Push lên repo, enable Pages
- **Netlify**: Drag & drop folder vào Netlify
- **Vercel**: Deploy folder

Bạn test thử và cho tôi biết có cần điều chỉnh gì không nhé! 🚀​​​​​​​​​​​​​​​​

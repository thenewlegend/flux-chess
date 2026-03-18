const game = new Chess();
let board;

let moveCount = 0;
let gameActive = true;

/* -------------------- UI & THEMING -------------------- */

// Setup Tutorial Modal
function openTutorial() {
  document.getElementById('tutorialModal').classList.remove('hidden');
}

function closeTutorial() {
  document.getElementById('tutorialModal').classList.add('hidden');
}

// Setup Theme Toggling
let currentTheme = localStorage.getItem('flux-theme') || 'dark';
document.documentElement.setAttribute('data-theme', currentTheme);

function initThemeUI() {
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.innerText = currentTheme === 'dark' ? 'light_mode' : 'dark_mode';
  }

  const logoSrc = currentTheme === 'dark' ? 'img/flux-chess-white.png' : 'img/flux-chess-dark.png';
  const appLogo = document.getElementById('app-logo');
  const splashLogo = document.getElementById('splash-logo');

  if (appLogo) appLogo.src = logoSrc;
  if (splashLogo) splashLogo.src = logoSrc;
}

function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  localStorage.setItem('flux-theme', currentTheme);

  initThemeUI();
  updateParticleColor();
}

/* -------------------- PARTICLES -------------------- */
let pCanvas, pCtx, particlesArray = [];
let ptColor = 'rgba(235, 208, 113, 0.15)';

function initParticles() {
  pCanvas = document.getElementById('particles-canvas');
  if (!pCanvas) return;
  pCtx = pCanvas.getContext('2d');
  resizeParticles();

  for (let i = 0; i < 40; i++) {
    particlesArray.push({
      x: Math.random() * pCanvas.width,
      y: Math.random() * pCanvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 1.5 + 0.5
    });
  }

  updateParticleColor();
  requestAnimationFrame(animateParticles);
}

function updateParticleColor() {
  const style = getComputedStyle(document.body);
  ptColor = style.getPropertyValue('--particle-color').trim() || 'rgba(100,100,100,0.2)';
}

function resizeParticles() {
  if (!pCanvas) return;
  pCanvas.width = window.innerWidth;
  pCanvas.height = window.innerHeight;
}

function animateParticles() {
  if (!pCtx) return;
  pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
  pCtx.fillStyle = ptColor;
  pCtx.beginPath();

  particlesArray.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0) p.x = pCanvas.width;
    if (p.x > pCanvas.width) p.x = 0;
    if (p.y < 0) p.y = pCanvas.height;
    if (p.y > pCanvas.height) p.y = 0;

    pCtx.moveTo(p.x, p.y);
    pCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
  });

  pCtx.fill();
  requestAnimationFrame(animateParticles);
}

/* -------------------- SPLASH & RESIZE -------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initThemeUI();
  initParticles();

  const splash = document.getElementById('splash');
  if (splash) {
    function dismissSplash() {
      splash.classList.add('exit');

      setTimeout(() => {
        splash.classList.add('hidden');
        document.body.style.overflow = 'auto';
        splash.remove();
        if (board) {
          board.resize();
          highlightPortals();
        }
      }, 600);
    }
    splash.addEventListener('click', dismissSplash);
    document.addEventListener('keydown', dismissSplash, { once: true });
  }

  window.addEventListener('resize', () => {
    resizeParticles();
    if (board) {
      board.resize();
      highlightPortals();
    }
  });
});

/* -------------------- AUDIO -------------------- */
const moveSound = document.getElementById('moveSound');
const captureSound = document.getElementById('captureSound');
const endSound = document.getElementById('endSound');

function playMoveSound(isCapture) {
  const sound = isCapture ? captureSound : moveSound;
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }
}

function playEndSound() {
  if (endSound) {
    endSound.currentTime = 0;
    endSound.play().catch(() => {});
  }
}

/* -------------------- CLICK-TO-MOVE & HIGHLIGHTS -------------------- */

let selectedSquare = null;

function clearBoardEffects() {
  $('.square-55d63').removeClass('highlight-move highlight-capture highlight-danger selected-square');
}

function processMove(source, target) {
  if (!gameActive) return false;

  const move = game.move({
    from: source,
    to: target,
    promotion: 'q'
  });

  if (move === null) return false;

  if (game.in_checkmate() || game.in_draw() || move.captured === 'k') {
    playEndSound();
  } else {
    playMoveSound(!!move.captured);
  }

  if (move.captured === 'k') {
    endGame("King captured. Game over.");
    return true;
  }

  moveCount++;
  movesUntilSwap--;

  if (movesUntilSwap <= 0) {
    applyPortalSwap();
    swapInterval = getRandomInterval();
    movesUntilSwap = swapInterval;
  }

  updateStatus();
  updatePortalInfo();
  return true;
}

$('#board').on('mousedown touchstart', '.square-55d63', function (e) {
  if (!gameActive) return;

  const square = $(this).attr('data-square');
  const turn = game.turn();
  const pieceColor = game.get(square) ? game.get(square).color : null;

  if (selectedSquare === square) {
    selectedSquare = null;
    clearBoardEffects();
    return;
  }

  if (selectedSquare) {
    const moved = processMove(selectedSquare, square);
    if (moved) {
      board.position(game.fen());
      highlightPortals();
      selectedSquare = null;
      clearBoardEffects();
      return;
    }
  }

  if (pieceColor === turn) {
    selectedSquare = square;
    clearBoardEffects();
    $(this).addClass('selected-square');

    const moves = game.moves({ square: square, verbose: true });
    moves.forEach(m => {
      const el = $(`.square-55d63[data-square="${m.to}"]`);
      if (m.captured) {
        if (m.captured === 'k') el.addClass('highlight-danger');
        else el.addClass('highlight-capture');
      } else {
        el.addClass('highlight-move');
      }
    });
  } else {
    selectedSquare = null;
    clearBoardEffects();
  }
});

/* -------------------- POPUP -------------------- */

let popupShown = false;
let restartTimer = null;

function showRestartPopup() {
  const popup = document.getElementById("restartPopup");
  popup.classList.remove("hidden");

  restartTimer = setTimeout(() => {
    restartGame();
    closePopup();
  }, 60000 * 5);
}

function closePopup() {
  document.getElementById("restartPopup").classList.add("hidden");
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
}

function confirmRestart() {
  closePopup();
  restartGame();
}

/* -------------------- END GAME -------------------- */

function endGame(message) {
  if (!gameActive) return;
  gameActive = false;
  setStatus(message);
  if (!popupShown) {
    popupShown = true;
    setTimeout(showRestartPopup, 400);
  }
}

/* -------------------- PORTALS -------------------- */

let portalPairs = [];
let swapInterval = getRandomInterval();
let movesUntilSwap = swapInterval;

const COLORS = ["#22c55e", "#3b82f6", "#c4270f", "#00ffff", "#a855f7", "#960180"];

function getRandomInterval() {
  return Math.floor(Math.random() * 4) + 2;
}

function generatePortals() {
  portalPairs = [];
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['3', '4'];

  function mirrorSquare(square) {
    const file = square[0];
    const rank = parseInt(square[1]);
    return file + (9 - rank);
  }

  let chosen = [];
  while (chosen.length < 3) {
    let sq = files[Math.floor(Math.random() * 8)] + ranks[Math.floor(Math.random() * 2)];
    if (!chosen.includes(sq)) chosen.push(sq);
  }

  chosen.forEach((sq, i) => {
    portalPairs.push({ a: sq, b: mirrorSquare(sq), color: COLORS[i] });
  });

  highlightPortals();
  updatePortalInfo();
}

function clearPortalStyles() {
  document.querySelectorAll('.square-55d63').forEach(el => {
    el.classList.remove('portal');
    el.style.removeProperty('--portal-color');
  });
}

function highlightPortals() {
  clearPortalStyles();
  portalPairs.forEach(pair => {
    [pair.a, pair.b].forEach(square => {
      const el = document.querySelector(`[data-square="${square}"]`);
      if (el) {
        el.classList.add('portal');
        el.style.setProperty('--portal-color', pair.color);
      }
    });
  });
}

/* -------------------- SWAP -------------------- */

function applyPortalSwap() {
  let fen = game.fen();
  let parts = fen.split(' ');
  let boardPart = parts[0].split('/');

  function expandRow(row) {
    return row.replace(/\d/g, d => '1'.repeat(d)).split('');
  }

  function compressRow(row) {
    return row.join('').replace(/1+/g, m => m.length);
  }

  let grid = boardPart.map(expandRow);

  function squareToCoords(square) {
    const file = square.charCodeAt(0) - 97;
    const rank = 8 - parseInt(square[1]);
    return [rank, file];
  }

  portalPairs.forEach(pair => {
    const [r1, c1] = squareToCoords(pair.a);
    const [r2, c2] = squareToCoords(pair.b);
    let temp = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = temp;
  });

  let newBoard = grid.map(compressRow).join('/');
  let newFen = [newBoard, ...parts.slice(1)].join(' ');
  game.load(newFen);
  validateAfterPortal();
}

/* -------------------- VALIDATION -------------------- */

function kingExists(color) {
  return game.board().some(row => row.some(p => p && p.type === 'k' && p.color === color));
}

function validateAfterPortal() {
  const whiteKing = kingExists('w');
  const blackKing = kingExists('b');
  if (!whiteKing || !blackKing) {
    const winner = whiteKing ? "White" : "Black";
    endGame(`${winner} wins (king lost via portal)`);
  }
}

/* -------------------- STATUS -------------------- */
function setStatus(text) { document.getElementById("status").innerText = text; }

function updateStatus() {
  if (!gameActive) return;
  let moveColor = game.turn() === 'w' ? 'White' : 'Black';
  if (game.in_checkmate()) {
    const winner = moveColor === 'White' ? 'Black' : 'White';
    endGame(`Checkmate! ${winner} wins.`);
  } else if (game.in_draw()) {
    endGame("Draw!");
  } else if (game.in_check()) {
    setStatus(`${moveColor} is in check.`);
  } else {
    setStatus(`${moveColor} to move.`);
  }
}

function updatePortalInfo() {
  document.getElementById("portalInfo").innerText = `Swap in ${movesUntilSwap} move(s)`;
}

/* -------------------- CONTROLS -------------------- */
function restartGame() {
  game.reset();
  board.start();
  moveCount = 0;
  gameActive = true;
  popupShown = false;
  swapInterval = getRandomInterval();
  movesUntilSwap = swapInterval;
  generatePortals();
  updateStatus();
}

function resign() {
  if (!gameActive) return;
  const loser = game.turn() === 'w' ? 'White' : 'Black';
  const winner = loser === 'White' ? 'Black' : 'White';
  endGame(`${loser} resigned. ${winner} wins.`);
}

/* -------------------- BOARD -------------------- */

board = Chessboard('board', {
  draggable: true,
  position: 'start',
  pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',

  onDragStart: function(source, piece, position, orientation) {
    if (!gameActive) return false;
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
      return false;
    }
    clearBoardEffects();
    selectedSquare = source;
    const moves = game.moves({ square: source, verbose: true });
    moves.forEach(m => {
      const el = $(`.square-55d63[data-square="${m.to}"]`);
      if (m.captured) {
        if (m.captured === 'k') el.addClass('highlight-danger');
        else el.addClass('highlight-capture');
      } else {
        el.addClass('highlight-move');
      }
    });
  },

  onDrop: function (source, target) {
    clearBoardEffects();
    selectedSquare = null;
    if (!gameActive) return 'snapback';
    const moved = processMove(source, target);
    if (!moved) return 'snapback';
  },

  onSnapEnd: function () {
    board.position(game.fen());
    highlightPortals();
  }
});

/* -------------------- INIT -------------------- */
setTimeout(() => {
  generatePortals();
  updateStatus();
  updatePortalInfo();
}, 100);

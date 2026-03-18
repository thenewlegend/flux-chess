const game = new Chess();
let board;

let moveCount = 0;
let gameActive = true;

// Supabase Configuration
const SUPABASE_URL = 'https://ddrlfuyxrpqaiobbgtfv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcmxmdXl4cnBxYWlvYmJndGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MjkzNjcsImV4cCI6MjA4OTQwNTM2N30.KvInhOKqeLqitW0fOkcm0Z_em5_H3kb_4V4EtmceAik';
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let currentRoom = null;
let roomChannel = null;
let myRole = 'local'; // 'local', 'host', 'guest', 'spectator'

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

  const logoSrc = currentTheme === 'dark' ? 'img/flux-chess-dark.png' : 'img/flux-chess-white.png';
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
    // We removed the click-to-dismiss. It's now handled by startLocalGame().
    // Use the explicit lobby buttons instead.
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
    sound.play().catch(() => { });
  }
}

function playEndSound() {
  if (endSound) {
    endSound.currentTime = 0;
    endSound.play().catch(() => { });
  }
}

/* -------------------- CLICK-TO-MOVE & HIGHLIGHTS -------------------- */

let selectedSquare = null;

/* -------------------- MULTIPLAYER LOBBY -------------------- */
function dismissLobby() {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.classList.add('exit');
    setTimeout(() => {
      splash.classList.add('hidden');
      document.body.style.overflow = 'auto';
      splash.remove(); // completely remove splash from DOM
      if (board) { board.resize(); highlightPortals(); }
    }, 600);
  }
}

function startLocalGame() {
  myRole = 'local';
  dismissLobby();
}

function showOnlineLobby() {
  document.getElementById('splash-main').classList.add('hidden');
  document.getElementById('splash-online').classList.remove('hidden');
}

function backToMain() {
  document.getElementById('splash-online').classList.add('hidden');
  document.getElementById('splash-main').classList.remove('hidden');
}

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function createRoom() {
  if (!supabaseClient) return alert("Supabase JS not loaded.");
  // Force anonymous login to get an identity for Realtime presence
  await supabaseClient.auth.signInAnonymously();

  currentRoom = generateRoomCode();
  $('#createdRoomCode').text(currentRoom).removeClass('hidden');
  $('#waitingMessage').removeClass('hidden');
  initRoomChannel(currentRoom, true);
}

async function joinRoomAsGuest() {
  if (!supabaseClient) return alert("Supabase JS not loaded.");
  const code = $('#joinRoomCode').val().toUpperCase();
  $('#joinError').addClass('hidden');
  if (!code) return $('#joinError').text('Enter a code.').removeClass('hidden');

  $('#joinBtn').text('Joining...');
  // Force anonymous login to get an identity for Realtime presence
  await supabaseClient.auth.signInAnonymously();
  currentRoom = code;
  initRoomChannel(currentRoom, false);
}

function initRoomChannel(roomCode, isHost) {
  myRole = isHost ? 'host' : 'guest';
  updateOnlineStatus();

  roomChannel = supabaseClient.channel(`room_${roomCode}`, {
    config: { presence: { key: myRole } }
  });
  
  roomChannel.on('presence', { event: 'sync' }, () => {
    const state = roomChannel.presenceState();
    const users = Object.keys(state);
    
    // If I am guest but there's already a guest, become spectator
    if (!isHost && myRole === 'guest') {
      let guestsCount = 0;
      users.forEach(k => { if (state[k][0].role === 'guest') guestsCount++; });
      if (guestsCount > 1) {
        myRole = 'spectator';
        updateOnlineStatus();
      }
    }

    if (isHost && users.length >= 2) {
      $('#waitingMessage').text('Players joined! Starting...');
      setTimeout(dismissLobby, 1000);
      broadcastState();
    } else if (!isHost && myRole !== 'local') {
      setTimeout(dismissLobby, 500);
      // Wait a bit for subscription to stabilize then request state
      setTimeout(() => {
        roomChannel.send({ type: 'broadcast', event: 'request_sync', payload: {} });
      }, 1500);
    }
  });

  roomChannel.on('broadcast', { event: 'move' }, (payload) => {
    applyRemoteMove(payload.payload.source, payload.payload.target);
    // If guest moved, host follow up with state to confirm swap logic
    if (isHost) setTimeout(broadcastState, 150);
  });

  roomChannel.on('broadcast', { event: 'request_sync' }, () => {
    if (isHost) broadcastState();
  });

  roomChannel.on('broadcast', { event: 'sync_state' }, (p) => {
    const data = p.payload;
    console.log("Receiving sync_state", data);
    game.load(data.fen);
    moveCount = data.moveCount;
    movesUntilSwap = data.movesUntilSwap;
    portalPairs = data.portalPairs;
    board.position(game.fen());
    highlightPortals();
    updateStatus();
    updatePortalInfo();
  });

  roomChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await roomChannel.track({ role: myRole, joined_at: new Date().toISOString() });
    }
  });
}

function broadcastState() {
  if (!roomChannel || myRole !== 'host') return;
  roomChannel.send({
    type: 'broadcast',
    event: 'sync_state',
    payload: { 
      fen: game.fen(), 
      moveCount, 
      movesUntilSwap, 
      portalPairs 
    }
  });
}

function updateOnlineStatus() {
  if (myRole === 'local') return;
  $('#onlineStatus').text(`Room: ${currentRoom} | Role: ${myRole.toUpperCase()}`).removeClass('hidden');
}

function applyRemoteMove(source, target) {
  const move = processMove(source, target);
  if (move) {
    board.position(game.fen());
    highlightPortals();
    selectedSquare = null;
    clearBoardEffects();
  }
}

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
// Global click handler to catch clicks on empty squares and enemy pieces
$('#board').on('click', '.square-55d63', function () {
  if (!gameActive) return;

  const square = $(this).attr('data-square');
  const turn = game.turn();
  const pieceColor = game.get(square) ? game.get(square).color : null;

  if (selectedSquare) {
    // If clicking the same square, keep selection alive (handled by onDragStart/onDrop)
    if (selectedSquare === square) return;

    // Check if clicking a valid destination
    const moves = game.moves({ square: selectedSquare, verbose: true });
    const isMoveValid = moves.some(m => m.to === square);

    if (isMoveValid) {
      // Prevent local click move if spectator, or wrong turn in multiplayer
      if (myRole === 'spectator') return;
      if (myRole === 'host' && game.turn() === 'b') return;
      if (myRole === 'guest' && game.turn() === 'w') return;

      const moved = processMove(selectedSquare, square);
      if (moved) {
        if (roomChannel && myRole !== 'local') {
          roomChannel.send({ type: 'broadcast', event: 'move', payload: { source: selectedSquare, target: square } });
        }
        board.position(game.fen());
        highlightPortals();
        selectedSquare = null;
        clearBoardEffects();
      }
      return;
    }
  }

  // If we click somewhere that isn't our own piece and isn't a valid move, clear selection
  if (pieceColor !== turn) {
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

  onDragStart: function (source, piece, position, orientation) {
    if (!gameActive) return false;

    // Role checks
    if (myRole === 'spectator') return false;
    if (myRole === 'host' && game.turn() === 'b') return false;
    if (myRole === 'guest' && game.turn() === 'w') return false;

    // Prevent dragging enemy pieces
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
      return false; // Aborts drag, ALLOWING native click to fire!
    }

    // We are grabbing our own piece. Select it!
    clearBoardEffects();
    selectedSquare = source;

    // Visually highlight the grabbed square
    const squareEl = document.querySelector(`.square-55d63[data-square="${source}"]`);
    if (squareEl) squareEl.classList.add('selected-square');

    // Show highlights for destinations
    const moves = game.moves({ square: source, verbose: true });
    moves.forEach(m => {
      const el = document.querySelector(`.square-55d63[data-square="${m.to}"]`);
      if (el) {
        if (m.captured) {
          if (m.captured === 'k') el.classList.add('highlight-danger');
          else el.classList.add('highlight-capture');
        } else {
          el.classList.add('highlight-move');
        }
      }
    });
  },

  onDrop: function (source, target) {
    if (!gameActive) return 'snapback';

    if (source === target) {
      // It was just a click on our piece, preserve the selection highlights!
      return 'snapback';
    }

    // It was a real physical drag to a new square
    const moved = processMove(source, target);

    if (moved && roomChannel && myRole !== 'local') {
      roomChannel.send({ type: 'broadcast', event: 'move', payload: { source, target } });
      // If host, broadcast full state immediately after move
      if (myRole === 'host') setTimeout(broadcastState, 100);
    }

    // The move is processed, remove selection visually
    clearBoardEffects();
    selectedSquare = null;

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

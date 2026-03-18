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
let hostColor = 'w';  // which color the HOST plays; swaps each round
let isRestoring = false;

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

/* -------------------- HAPTICS -------------------- */
function vibrate(pattern) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

function vibrateMove() { vibrate(10); }
function vibrateCapture() { vibrate([25, 20, 25]); }
function vibrateCheck() { vibrate([40, 50, 40]); }
function vibrateSwap() { vibrate([60, 40, 80]); }

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
  isRestoring = false;
  dismissLobby();
}

function showOnlineLobby() {
  document.getElementById('main-menu-options').classList.add('hidden');
  document.getElementById('online-options').classList.remove('hidden');
}

function backToMain() {
  document.getElementById('online-options').classList.add('hidden');
  document.getElementById('main-menu-options').classList.remove('hidden');
}

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function createRoom() {
  if (!supabaseClient) return alert("Supabase JS not loaded.");

  // Try anonymous login but don't let it block room creation
  try {
    await supabaseClient.auth.signInAnonymously();
  } catch (e) {
    console.warn("Auth skipped/failed:", e);
  }

  currentRoom = generateRoomCode();
  $('#createdRoomCode').text(currentRoom);
  $('#copy-code-container').removeClass('hidden');
  $('#waitingMessage').removeClass('hidden');
  isRestoring = false;
  initRoomChannel(currentRoom, true);
}

function copyRoomCode() {
  const code = $('#createdRoomCode').text();
  if (code) {
    navigator.clipboard.writeText(code).then(() => {
      const btn = $('button[onclick="copyRoomCode()"]');
      const icon = btn.find('.material-symbols-rounded');
      icon.text('check');
      btn.css('background', 'var(--md-sys-color-primary)');
      btn.css('color', 'var(--md-sys-color-on-primary)');

      setTimeout(() => {
        icon.text('content_copy');
        btn.css('background', '');
        btn.css('color', '');
      }, 2000);
    });
  }
}

async function joinRoomAsGuest() {
  if (!supabaseClient) return alert("Supabase JS not loaded.");
  const code = $('#joinRoomCode').val().toUpperCase();
  $('#joinError').addClass('hidden');
  if (!code) return $('#joinError').text('Enter a code.').removeClass('hidden');

  $('#joinBtn').text('Joining...');

  try {
    await supabaseClient.auth.signInAnonymously();
  } catch (e) {
    console.warn("Auth skipped/failed:", e);
  }

  currentRoom = code;
  isRestoring = false;
  initRoomChannel(currentRoom, false);
}

function initRoomChannel(roomCode, isHost) {
  myRole = isHost ? 'host' : 'guest';
  saveSession();
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
      if (!isRestoring) broadcastState();
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

  roomChannel.on('broadcast', { event: 'request_sync' }, (p) => {
    const requesterRole = p.payload ? p.payload.role : null;

    // Host always responds to sync requests
    if (myRole === 'host') {
      broadcastState();
    }
    // Guest responds only if the host is the one requesting (e.g. host reloaded)
    else if (myRole === 'guest' && requesterRole === 'host') {
      broadcastState();
    }
  });

  roomChannel.on('broadcast', { event: 'sync_state' }, (p) => {
    const data = p.payload;
    console.log("Receiving sync_state", data);
    game.load(data.fen);
    moveCount = data.moveCount;
    movesUntilSwap = data.movesUntilSwap;
    portalPairs = data.portalPairs;
    if (data.hostColor !== undefined) hostColor = data.hostColor;
    board.position(game.fen());

    // Ensure portals highlight, sometimes board.position needs a tiny tick to finish DOM
    setTimeout(highlightPortals, 50);

    // Orient board so local player always sees their color at the bottom
    orientBoardForRole();
    updatePlayerBadges();

    if (data.gameActive === false) {
      gameActive = false;
      setStatus(data.statusText || "Game Over");
      // Guest should NOT see the restart popup
      if (!popupShown && (myRole === 'host' || myRole === 'local')) {
        popupShown = true;
        setTimeout(showRestartPopup, 400);
      }
    } else {
      gameActive = true;
      updateStatus(true); // pass true to suppress vibration during sync
    }
    updatePortalInfo();
    isRestoring = false;
    // No longer saving full state here, as we want a fresh start on restore
  });

  roomChannel.on('broadcast', { event: 'resign' }, (p) => {
    endGame(p.payload.message);
  });

  roomChannel.on('broadcast', { event: 'restart' }, () => {
    // Guest receives hostColor with the following sync_state; just reset local state
    game.reset();
    moveCount = 0;
    gameActive = true;
    popupShown = false;
    swapInterval = getRandomInterval();
    movesUntilSwap = swapInterval;
    saveSession();
  });

  roomChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await roomChannel.track({ role: myRole, joined_at: new Date().toISOString() });

      // If we are restoring a session, ask for the current state as soon as we connect
      if (isRestoring) {
        roomChannel.send({ type: 'broadcast', event: 'request_sync', payload: { role: myRole } });
      }
    }
  });
}

function broadcastState() {
  if (!roomChannel) return;
  roomChannel.send({
    type: 'broadcast',
    event: 'sync_state',
    payload: {
      fen: game.fen(),
      moveCount,
      movesUntilSwap,
      portalPairs,
      hostColor,
      gameActive,
      statusText: document.getElementById("status").innerText
    }
  });
}

function updateOnlineStatus() {
  if (myRole === 'local') {
    $('#restartBtn').removeClass('hidden');
    $('.player-badge').addClass('hidden');
    updateResignButtonState();
    return;
  }

  $('#onlineStatus').text(`Room: ${currentRoom}`).removeClass('hidden');

  if (myRole === 'host') {
    $('#restartBtn').removeClass('hidden');
  } else {
    $('#restartBtn').addClass('hidden');
  }

  $('.player-badge').removeClass('hidden');
  updatePlayerBadges();
  updateResignButtonState();
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
    if (move.captured) vibrateCapture();
    else vibrateMove();
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
      const myColor = getMyColor();
      if (myColor && game.turn() !== myColor) return;

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
  const isGuest = myRole === 'guest' || myRole === 'spectator';

  // Adjust popup content based on role
  if (isGuest) {
    popup.querySelector('p').textContent = 'Game Over. Waiting for host to restart...';
    $('#confirmRestartBtn').addClass('hidden');
    $('#restartPopupNo').addClass('hidden');
    $('#restartPopupClose').addClass('hidden');
  } else {
    popup.querySelector('p').textContent = 'Restart now?';
    $('#confirmRestartBtn').removeClass('hidden');
    $('#restartPopupNo').removeClass('hidden');
    $('#restartPopupClose').addClass('hidden'); // Close only via session end/restart

    // Auto restart after 5 mins
    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = setTimeout(() => {
      confirmRestart();
    }, 60000 * 5);
  }

  popup.classList.remove("hidden");
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

  // If host ends game, broadcast it immediately so guest stops
  if (myRole === 'host') {
    broadcastState();
  }

  if (!popupShown && (myRole === 'host' || myRole === 'local')) {
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

  // Calculate charge percentage (0-100)
  // Logic: 0 moves made = 0%, 1 move left = ~75-80%, swap ready = 100%
  const charge = Math.max(0, Math.min(100, ((swapInterval - movesUntilSwap) / swapInterval) * 100));
  const isReady = movesUntilSwap <= 1;

  portalPairs.forEach(pair => {
    [pair.a, pair.b].forEach(square => {
      const el = document.querySelector(`[data-square="${square}"]`);
      if (el) {
        el.classList.add('portal');
        el.style.setProperty('--portal-color', pair.color);
        el.style.setProperty('--portal-charge', charge.toFixed(1));
        el.classList.toggle('ready', isReady);
      }
    });
  });
}

/* -------------------- SWAP -------------------- */

function applyPortalSwap() {
  vibrateSwap();
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

function updateStatus(suppressVibration = false) {
  if (!gameActive) return;
  let moveColor = game.turn() === 'w' ? 'White' : 'Black';
  const statusCard = document.querySelector('.status-card');

  if (game.in_checkmate()) {
    const winner = moveColor === 'White' ? 'Black' : 'White';
    if (statusCard) statusCard.classList.remove('my-turn');
    endGame(`Checkmate! ${winner} wins.`);
  } else if (game.in_draw()) {
    if (statusCard) statusCard.classList.remove('my-turn');
    endGame("Draw!");
  } else if (game.in_check()) {
    if (!suppressVibration) vibrateCheck();
    setStatus(`${moveColor} is in check.`);
    updateResignButtonState();
    if (myRole !== 'local') {
      const isMyTurn = game.turn() === getMyColor();
      if (statusCard) statusCard.classList.toggle('my-turn', isMyTurn);
      if (isMyTurn) showToast('You are in check!');
    }
  } else {
    setStatus(`${moveColor} to move.`);
    updateResignButtonState();
    if (myRole !== 'local') {
      const isMyTurn = game.turn() === getMyColor();
      if (statusCard) statusCard.classList.toggle('my-turn', isMyTurn);
      if (isMyTurn) showToast('Your turn');
    }
  }
}

function updatePortalInfo() {
  document.getElementById("portalInfo").innerText = `Swap in ${movesUntilSwap}`;
}

// Returns this player's color ('w', 'b', or null for local/spectator)
function getMyColor() {
  if (myRole === 'host') return hostColor;
  if (myRole === 'guest') return hostColor === 'w' ? 'b' : 'w';
  return null;
}

// Update resign button dim state based on whose turn it is
function updateResignButtonState() {
  const resignBtn = document.querySelector('button[onclick="resign()"]');
  if (!resignBtn) return;
  if (myRole === 'local') {
    resignBtn.disabled = false;
    resignBtn.style.opacity = '1';
    resignBtn.title = 'Resign';
    return;
  }
  const isMyTurn = game.turn() === getMyColor();
  resignBtn.disabled = !isMyTurn;
  resignBtn.style.opacity = isMyTurn ? '1' : '0.4';
  resignBtn.title = isMyTurn ? 'Resign' : 'Wait for your turn to resign';
}

/* -------------------- PLAYER BADGES -------------------- */
function updatePlayerBadges() {
  if (myRole === 'local') {
    $('.player-badge').addClass('hidden');
    return;
  }

  const isHostWhite = (hostColor === 'w');
  const orientation = board.orientation(); // 'white' or 'black'
  const bottomIsWhite = (orientation === 'white');

  // Bottom badge = whoever is at the bottom of the board
  const bottomIsHost = (bottomIsWhite === isHostWhite);
  const bottomLabel = bottomIsHost ? 'HOST' : 'GUEST';
  const bottomPiece = bottomIsWhite ? '\u2654' : '\u265a';
  const bottomIsMe = (myRole === 'host') ? bottomIsHost : !bottomIsHost;

  // Top badge = the other player
  const topLabel = bottomIsHost ? 'GUEST' : 'HOST';
  const topPiece = bottomIsWhite ? '\u265a' : '\u2654';
  const topIsMe = !bottomIsMe;

  $('#badge-bottom-label').text(bottomLabel);
  $('#badge-bottom-piece').text(bottomPiece)
    .css('color', bottomIsWhite ? '#f0d9b5' : '#2d2d2d');
  bottomIsMe ? $('#badge-bottom-you').removeClass('hidden') : $('#badge-bottom-you').addClass('hidden');
  $('#badge-bottom').removeClass('hidden');

  $('#badge-top-label').text(topLabel);
  $('#badge-top-piece').text(topPiece)
    .css('color', bottomIsWhite ? '#2d2d2d' : '#f0d9b5');
  topIsMe ? $('#badge-top-you').removeClass('hidden') : $('#badge-top-you').addClass('hidden');
  $('#badge-top').removeClass('hidden');
}

/* -------------------- FLIP BOARD -------------------- */
function flipBoard() {
  board.flip();
  highlightPortals();
  if (myRole !== 'local') updatePlayerBadges();
}

// Brief toast notification (bottom of screen)
let toastTimeout;
function showToast(message) {
  let toast = document.getElementById('flux-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'flux-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), 2500);
}

/* -------------------- CONTROLS -------------------- */
function restartGame() {
  if (myRole === 'guest' || myRole === 'spectator') return;
  game.reset();
  moveCount = 0;
  gameActive = true;
  popupShown = false;
  swapInterval = getRandomInterval();
  movesUntilSwap = swapInterval;

  // Alternate colors each round
  if (myRole === 'host') {
    hostColor = (hostColor === 'w') ? 'b' : 'w';
  }

  // Orient board so our color is at the bottom
  orientBoardForRole();
  board.position('start');
  generatePortals();
  updateStatus();
  if (myRole !== 'local') updatePlayerBadges();

  if (myRole === 'host' && roomChannel) {
    roomChannel.send({ type: 'broadcast', event: 'restart', payload: {} });
    // Small delay ensures guest finishes their local reset before receiving the host's full state
    setTimeout(() => {
      broadcastState();
      saveSession();
    }, 100);
  }
}

/* -------------------- BOARD ORIENTATION -------------------- */
function orientBoardForRole() {
  if (myRole === 'local') return;
  const myColor = getMyColor();
  if (!myColor) return;
  const desired = myColor === 'w' ? 'white' : 'black';
  if (board.orientation() !== desired) board.flip();
}

function resign() {
  if (!gameActive) return;

  // Turn restriction: only resign on your own colour's turn
  const myColor = getMyColor();
  if (myColor && game.turn() !== myColor) return;

  const loser = game.turn() === 'w' ? 'White' : 'Black';
  const winner = loser === 'White' ? 'Black' : 'White';
  const msg = `${loser} resigned. ${winner} wins.`;

  if (roomChannel && myRole !== 'local') {
    roomChannel.send({ type: 'broadcast', event: 'resign', payload: { message: msg } });
  }

  endGame(msg);
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
    const myColor = getMyColor();
    if (myColor && game.turn() !== myColor) return false;

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

/* -------------------- SESSION RESTORE -------------------- */
function saveSession() {
  if (currentRoom && myRole !== 'local') {
    localStorage.setItem('flux-room', currentRoom);
    localStorage.setItem('flux-role', myRole);
    localStorage.setItem('flux-hostColor', hostColor);
  }
}

function clearSession() {
  localStorage.removeItem('flux-room');
  localStorage.removeItem('flux-role');
  $('#restore-session-section').addClass('hidden');
}

function checkRestoreSession() {
  const storedRoom = localStorage.getItem('flux-room');
  const storedRole = localStorage.getItem('flux-role');

  if (storedRoom && storedRoom !== 'null' && storedRoom !== 'undefined' &&
    storedRole && storedRole !== 'null' && storedRole !== 'undefined') {
    $('#restore-text').text(`You were previously in room: ${storedRoom}`);
    $('#restore-session-section').removeClass('hidden');
  } else {
    $('#restore-session-section').addClass('hidden');
  }
}

function restoreSession() {
  const storedRoom = localStorage.getItem('flux-room');
  const storedRole = localStorage.getItem('flux-role');
  if (storedRoom && storedRole) {
    currentRoom = storedRoom;
    myRole = storedRole;
    isRestoring = true;

    // Safety timeout: if no one responds to sync request, stop waiting
    setTimeout(() => { isRestoring = false; }, 3000);

    // Reset to a fresh game state locally, will be overwritten by sync_state if successful
    game.reset();
    moveCount = 0;
    gameActive = true;
    popupShown = false;
    portalPairs = [];
    movesUntilSwap = getRandomInterval();

    const storedHostColor = localStorage.getItem('flux-hostColor');
    if (storedHostColor) hostColor = storedHostColor;

    // Update board to start position immediately
    board.position('start');
    highlightPortals();
    updatePortalInfo();
    updateStatus(true);
    orientBoardForRole();
    updateOnlineStatus();

    // Joining the channel will trigger the sync request via the SUBSCRIBED callback
    initRoomChannel(currentRoom, myRole === 'host');

    setTimeout(dismissLobby, 100);
  }
}

function forgetSession() {
  localStorage.removeItem('flux-room');
  localStorage.removeItem('flux-role');
  $('#restore-session-section').addClass('hidden');
  console.log("Session forgotten.");
}

/* -------------------- INIT -------------------- */
setTimeout(() => {
  generatePortals();
  updateStatus();
  updatePortalInfo();
  checkRestoreSession();
}, 100);

const game = new Chess();
let board;

let moveCount = 0;
let gameActive = true;

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

const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#0c0051",
  "#00ffff",
  "#a855f7",
  "#960180"
];

function getRandomInterval() {
  return Math.floor(Math.random() * 4) + 2;
}

function generatePortals() {
  portalPairs = [];

  const files = ['a','b','c','d','e','f','g','h'];
  const ranks = ['3','4'];

  function mirrorSquare(square) {
    const file = square[0];
    const rank = parseInt(square[1]);
    return file + (9 - rank);
  }

  let chosen = [];

  while (chosen.length < 3) {
    let sq = files[Math.floor(Math.random()*8)] +
             ranks[Math.floor(Math.random()*2)];
    if (!chosen.includes(sq)) chosen.push(sq);
  }

  chosen.forEach((sq, i) => {
    portalPairs.push({
      a: sq,
      b: mirrorSquare(sq),
      color: COLORS[i]
    });
  });

  highlightPortals();
  updatePortalInfo();
}

/* -------------------- VISUAL -------------------- */

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
  return game.board().some(row =>
    row.some(p => p && p.type === 'k' && p.color === color)
  );
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

function setStatus(text) {
  document.getElementById("status").innerText = text;
}

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
  document.getElementById("portalInfo").innerText =
    `Swap in ${movesUntilSwap} move(s)`;
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

  onDrop: function (source, target) {
    if (!gameActive) return 'snapback';

    const move = game.move({
      from: source,
      to: target,
      promotion: 'q'
    });

    if (move === null) return 'snapback';

    if (move.captured === 'k') {
      endGame("King captured. Game over.");
      return;
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
const game = new Chess();
let board;

let moveCount = 0;
const portalInterval = 5;

let portalA = null;
let portalB = null;

let gameActive = true;

/* -------------------- RANDOM PORTALS -------------------- */

function getRandomSquare() {
  const files = ['a','b','c','d','e','f','g','h'];
  const ranks = ['1','2','3','4','5','6','7','8'];

  return files[Math.floor(Math.random()*8)] +
         ranks[Math.floor(Math.random()*8)];
}

function generatePortals() {
  portalA = getRandomSquare();

  do {
    portalB = getRandomSquare();
  } while (portalA === portalB);

  highlightPortals();

  console.log("Portals:", portalA, portalB);
}

/* -------------------- PORTAL VISUAL -------------------- */

function highlightPortals() {
  document.querySelectorAll('.square-55d63').forEach(el => {
    el.style.background = '';
  });

  [portalA, portalB].forEach(square => {
    const el = document.querySelector(`[data-square="${square}"]`);
    if (el) el.style.background = 'rgba(0,255,255,0.4)';
  });
}

/* -------------------- SAFE PORTAL SWAP (FEN) -------------------- */

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

  const [r1, c1] = squareToCoords(portalA);
  const [r2, c2] = squareToCoords(portalB);

  // Swap pieces safely
  let temp = grid[r1][c1];
  grid[r1][c1] = grid[r2][c2];
  grid[r2][c2] = temp;

  let newBoard = grid.map(compressRow).join('/');
  let newFen = [newBoard, ...parts.slice(1)].join(' ');

  game.load(newFen);

  validateAfterPortal();
}

/* -------------------- POST-PORTAL VALIDATION -------------------- */

function kingExists(color) {
  const boardState = game.board();

  for (let row of boardState) {
    for (let piece of row) {
      if (piece && piece.type === 'k' && piece.color === color) {
        return true;
      }
    }
  }
  return false;
}

function validateAfterPortal() {
  const whiteKing = kingExists('w');
  const blackKing = kingExists('b');

  if (!whiteKing) {
    alert("White king lost. Black wins.");
    gameActive = false;
    return;
  }

  if (!blackKing) {
    alert("Black king lost. White wins.");
    gameActive = false;
    return;
  }

  if (game.in_checkmate()) {
    const winner = game.turn() === 'w' ? 'Black' : 'White';
    alert("Checkmate via portal. " + winner + " wins.");
    gameActive = false;
  }
}

/* -------------------- STATUS -------------------- */

function updateStatus() {
  if (!gameActive) return;

  let status = "";
  const moveColor = game.turn() === 'w' ? 'White' : 'Black';

  if (game.in_checkmate()) {
    status = "Checkmate! " + (moveColor === 'White' ? 'Black' : 'White') + " wins.";
    gameActive = false;
  } else if (game.in_draw()) {
    status = "Draw!";
    gameActive = false;
  } else if (game.in_check()) {
    status = moveColor + " is in check.";
  } else {
    status = moveColor + " to move.";
  }

  document.getElementById("status").innerText = status;
}

/* -------------------- CONTROLS -------------------- */

function restartGame() {
  game.reset();
  board.start();

  moveCount = 0;
  gameActive = true;

  generatePortals();
  updateStatus();
}

function resign() {
  if (!gameActive) return;

  const loser = game.turn() === 'w' ? 'White' : 'Black';
  const winner = loser === 'White' ? 'Black' : 'White';

  alert(loser + " resigned. " + winner + " wins.");

  gameActive = false;
}

/* -------------------- BOARD SETUP -------------------- */

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

    // Prevent king capture (safety)
    if (move.captured === 'k') {
      alert("King captured. Game over.");
      gameActive = false;
      return;
    }

    moveCount++;

    if (moveCount % portalInterval === 0) {
      applyPortalSwap();
    }

    updateStatus();
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
}, 100);
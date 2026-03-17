const game = new Chess();
let board;

let moveCount = 0;
const portalInterval = 5;

let portalA = null;
let portalB = null;

let gameActive = true;

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

function validateAfterPortal() {
  const whiteKing = kingExists('w');
  const blackKing = kingExists('b');

  // If a king is gone → game over immediately
  if (!whiteKing) {
    alert("White king captured. Black wins.");
    gameActive = false;
    return;
  }

  if (!blackKing) {
    alert("Black king captured. White wins.");
    gameActive = false;
    return;
  }

  // If current player is in check → that's fine
  // BUT if opponent is in check immediately after swap:

  if (game.in_checkmate()) {
    const winner = game.turn() === 'w' ? 'Black' : 'White';
    alert("Checkmate by portal! " + winner + " wins.");
    gameActive = false;
  }
}

function highlightPortals() {
  document.querySelectorAll('.square-55d63').forEach(el => {
    el.style.background = '';
  });

  [portalA, portalB].forEach(square => {
    const el = document.querySelector(`[data-square="${square}"]`);
    if (el) el.style.background = 'rgba(0,255,255,0.4)';
  });
}

function applyPortalSwap() {
  const pieceA = game.get(portalA);
  const pieceB = game.get(portalB);

  // Clone pieces (IMPORTANT)
  const newA = pieceA ? { type: pieceA.type, color: pieceA.color } : null;
  const newB = pieceB ? { type: pieceB.type, color: pieceB.color } : null;

  // Remove originals
  if (pieceA) game.remove(portalA);
  if (pieceB) game.remove(portalB);

  // Place clones
  if (newA) game.put(newA, portalB);
  if (newB) game.put(newB, portalA);

  validateAfterPortal(); // if you're using it
}

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

setTimeout(() => {
  generatePortals();
  updateStatus();
}, 3000);
const game = new Chess();
let board;

let moveCount = 0;
let gameActive = true;

/* -------------------- PORTAL CONFIG -------------------- */

let portalPairs = [];

let swapInterval = getRandomInterval();
let movesUntilSwap = swapInterval;

const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ec4899",
  "#a855f7",
  "#ef4444"
];

function getRandomInterval() {
  return Math.floor(Math.random() * 4) + 4; // 4–7
}

/* -------------------- SQUARE HELPERS -------------------- */

function getRandomSquareFromHalf(half) {
  const files = ['a','b','c','d','e','f','g','h'];

  let ranks;
  if (half === "white") ranks = ['1','2','3','4'];
  else ranks = ['5','6','7','8'];

  return files[Math.floor(Math.random()*8)] +
         ranks[Math.floor(Math.random()*4)];
}

/* -------------------- PORTAL GENERATION -------------------- */

function generatePortals() {
  portalPairs = [];

  const patterns = [
    "files",        // vertical file symmetry
    "diagonal",     // diagonal symmetry
    "box",          // clustered center
    "knight",       // L-shape offsets
    "edges"         // near edges
  ];

  const pattern = patterns[Math.floor(Math.random() * patterns.length)];

  const files = ['a','b','c','d','e','f','g','h'];

  function mirrorSquare(square) {
    const file = square[0];
    const rank = parseInt(square[1]);
    return file + (9 - rank); // vertical mirror
  }

  function pickUniqueWhiteSquares(generator) {
    const squares = new Set();

    while (squares.size < 4) {
      squares.add(generator());
    }

    return Array.from(squares);
  }

  let whiteSquares = [];

  switch (pattern) {

    case "files":
      whiteSquares = pickUniqueWhiteSquares(() => {
        const file = files[Math.floor(Math.random() * 8)];
        const rank = ['2','3','4'][Math.floor(Math.random()*3)];
        return file + rank;
      });
      break;

    case "diagonal":
      const diag = ['a2','b3','c4','d3','e4','f3','g2','h3'];
      whiteSquares = diag.sort(() => 0.5 - Math.random()).slice(0,4);
      break;

    case "box":
      const box = ['c2','d2','c3','d3','e2','f2','e3','f3'];
      whiteSquares = box.sort(() => 0.5 - Math.random()).slice(0,4);
      break;

    case "knight":
      const knightBase = ['b2','g2','c3','f3','d2','e2'];
      whiteSquares = knightBase.sort(() => 0.5 - Math.random()).slice(0,4);
      break;

    case "edges":
      const edges = ['a2','h2','a3','h3','b2','g2'];
      whiteSquares = edges.sort(() => 0.5 - Math.random()).slice(0,4);
      break;
  }

  whiteSquares.forEach((sq, i) => {
    const mirrored = mirrorSquare(sq);

    portalPairs.push({
      a: sq,
      b: mirrored,
      color: COLORS[i % COLORS.length]
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

  if (!whiteKing || !blackKing) {
    const winner = whiteKing ? "White" : "Black";
    setStatus(`${winner} wins (king lost via portal)`);
    gameActive = false;
    return;
  }

  if (game.in_checkmate()) {
    const winner = game.turn() === 'w' ? 'Black' : 'White';
    setStatus(`Checkmate via portal. ${winner} wins.`);
    gameActive = false;
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
    setStatus(`Checkmate! ${moveColor === 'White' ? 'Black' : 'White'} wins.`);
    gameActive = false;
  } else if (game.in_draw()) {
    setStatus("Draw!");
    gameActive = false;
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

  swapInterval = getRandomInterval();
  movesUntilSwap = swapInterval;

  generatePortals(); // ONLY here → fixed per round
  updateStatus();
}

function resign() {
  if (!gameActive) return;

  const loser = game.turn() === 'w' ? 'White' : 'Black';
  const winner = loser === 'White' ? 'Black' : 'White';

  setStatus(`${loser} resigned. ${winner} wins.`);
  gameActive = false;
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
      setStatus("King captured. Game over.");
      gameActive = false;
      return;
    }

    moveCount++;
    movesUntilSwap--;

    if (movesUntilSwap <= 0) {
      applyPortalSwap();

      swapInterval = getRandomInterval();
      movesUntilSwap = swapInterval;

      // IMPORTANT: portals DO NOT regenerate
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
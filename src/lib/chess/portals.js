/**
 * Portal system for FLUX Chess.
 * Portals are pairs of squares that swap pieces periodically.
 */

const PORTAL_COLORS = ['#14ac4cff', '#175ccbff', '#ce1b00ff', '#009a9aff', '#7c12e0ff', '#8e0179ff'];
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const PORTAL_RANKS = ['3', '4'];

/**
 * Generate a random swap interval (2-5 moves).
 * Uses crypto for better randomness.
 */
export function getRandomInterval() {
	if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
		const arr = new Uint8Array(1);
		crypto.getRandomValues(arr);
		return (arr[0] % 4) + 2;
	}
	return Math.floor(Math.random() * 4) + 2;
}

/**
 * Mirror a square vertically (e.g. e3 → e6).
 * @param {string} square
 * @returns {string}
 */
function mirrorSquare(square) {
	const file = square[0];
	const rank = parseInt(square[1]);
	return file + (9 - rank);
}

/**
 * Generate 3 portal pairs.
 * @returns {Array<{a: string, b: string, color: string}>}
 */
export function generatePortalPairs() {
	const chosen = [];

	while (chosen.length < 3) {
		let fileIdx, rankIdx;
		if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
			const arr = new Uint8Array(2);
			crypto.getRandomValues(arr);
			fileIdx = arr[0] % 8;
			rankIdx = arr[1] % 2;
		} else {
			fileIdx = Math.floor(Math.random() * 8);
			rankIdx = Math.floor(Math.random() * 2);
		}
		const sq = FILES[fileIdx] + PORTAL_RANKS[rankIdx];
		if (!chosen.includes(sq)) chosen.push(sq);
	}

	return chosen.map((sq, i) => ({
		a: sq,
		b: mirrorSquare(sq),
		color: PORTAL_COLORS[i]
	}));
}

/**
 * Apply portal swaps to a FEN string.
 * @param {string} fen - Current FEN
 * @param {Array<{a: string, b: string}>} portalPairs
 * @returns {string} New FEN after swaps
 */
export function applyPortalSwap(fen, portalPairs) {
	const parts = fen.split(' ');
	const boardRows = parts[0].split('/');

	// Expand each row: '2p1k3' → ['1','1','p','1','k','1','1','1']
	function expandRow(row) {
		return row.replace(/\d/g, d => '1'.repeat(Number(d))).split('');
	}

	function compressRow(cells) {
		return cells.join('').replace(/1+/g, m => String(m.length));
	}

	function squareToCoords(square) {
		const file = square.charCodeAt(0) - 97;
		const rank = 8 - parseInt(square[1]);
		return [rank, file];
	}

	const grid = boardRows.map(expandRow);

	for (const pair of portalPairs) {
		const [r1, c1] = squareToCoords(pair.a);
		const [r2, c2] = squareToCoords(pair.b);
		const temp = grid[r1][c1];
		grid[r1][c1] = grid[r2][c2];
		grid[r2][c2] = temp;
	}

	const newBoard = grid.map(compressRow).join('/');
	return [newBoard, ...parts.slice(1)].join(' ');
}

/**
 * Calculate portal charge percentage.
 * @param {number} swapInterval - Total moves between swaps
 * @param {number} movesUntilSwap - Moves remaining until next swap
 * @returns {number} 0-100
 */
export function getPortalCharge(swapInterval, movesUntilSwap) {
	return Math.max(0, Math.min(100, ((swapInterval - movesUntilSwap) / swapInterval) * 100));
}

import { Chess } from 'chess.js';

/**
 * Validate a move is legal for the given FEN position.
 * @param {string} fen - Current board FEN
 * @param {string} from - Source square (e.g. 'e2')
 * @param {string} to - Target square (e.g. 'e4')
 * @param {string} [promotion] - Promotion piece ('q','r','b','n')
 * @returns {{ valid: boolean, fen?: string, move?: object, error?: string }}
 */
export function validateMove(fen, from, to, promotion = 'q') {
	const chess = new Chess(fen);
	try {
		const move = chess.move({ from, to, promotion });
		return { valid: true, fen: chess.fen(), move };
	} catch {
		// Check if it's a valid king capture (not legal in standard chess)
		if (_canAttack(fen, from, to)) {
			const piece = chess.get(from);
			const target = chess.get(to);
			if (target && target.type === 'k') {
				// Manually update FEN: move piece, remove king
				const fenParts = fen.split(' ');
				const boardRows = fenParts[0].split('/');
				const expand = (r) => r.replace(/\d/g, n => '1'.repeat(parseInt(n))).split('');
				const compress = (cells) => cells.join('').replace(/1+/g, m => m.length);
				const rows = boardRows.map(expand);
				
				const f1 = from.charCodeAt(0) - 97, r1 = 8 - parseInt(from[1]);
				const f2 = to.charCodeAt(0) - 97, r2 = 8 - parseInt(to[1]);
				
				rows[r2][f2] = piece.type; // Move piece
				rows[r1][f1] = '1'; // Empty source
				
				fenParts[0] = rows.map(compress).join('/');
				// Flip turn
				fenParts[1] = fenParts[1] === 'w' ? 'b' : 'w';
				
				return { 
					valid: true, 
					fen: fenParts.join(' '), 
					move: { from, to, captured: 'k', color: piece.color } 
				};
			}
		}
		return { valid: false, error: 'Illegal move' };
	}
}

/** Simple check if square A can attack square B (ignoring check) */
function _canAttack(fen, from, to) {
	try {
		const temp = new Chess(fen);
		const piece = temp.get(from);
		if (!piece) return false;
		
		const fenParts = temp.fen().split(' ');
		const boardRows = fenParts[0].split('/');
		const toFile = to.charCodeAt(0) - 97;
		const toRank = 8 - parseInt(to[1]);
		
		const expand = (r) => r.replace(/\d/g, n => '1'.repeat(parseInt(n))).split('');
		const compress = (cells) => cells.join('').replace(/1+/g, m => m.length);
		
		const rows = boardRows.map(expand);
		rows[toRank][toFile] = piece.color === 'w' ? 'p' : 'P'; // Opponent pawn
		fenParts[0] = rows.map(compress).join('/');
		
		const attackTest = new Chess(fenParts.join(' '));
		const moves = attackTest.moves({ square: from, verbose: true });
		return moves.some(m => m.to === to);
	} catch {
		return false;
	}
}

/**
 * Validate that a FEN string produces a valid chess.js position.
 * Returns false if missing kings or malformed.
 */
export function validateFen(fen) {
	try {
		const c = new Chess(fen);
		return true;
	} catch {
		return false;
	}
}

export function isPlayerTurn(fen, playerColor) {
	try {
		const chess = new Chess(fen);
		return chess.turn() === playerColor;
	} catch {
		// Fallback for missing king FENs
		const parts = fen.split(' ');
		return parts[1] === playerColor;
	}
}

export function kingExists(fen, color) {
	// Don't use new Chess() if king might be missing as it might throw
	const parts = fen.split(' ');
	const board = parts[0];
	const kingChar = color === 'w' ? 'K' : 'k';
	return board.includes(kingChar);
}

export function getGameStatus(fen) {
	try {
		const chess = new Chess(fen);
		return {
			isCheckmate: chess.isCheckmate(),
			isDraw: chess.isDraw(),
			isCheck: chess.isCheck(),
			isGameOver: chess.isGameOver(),
			turn: chess.turn()
		};
	} catch {
		// Manual fallback if king is missing
		return {
			isCheckmate: false,
			isDraw: false,
			isCheck: false,
			isGameOver: true,
			turn: fen.split(' ')[1] || 'w'
		};
	}
}

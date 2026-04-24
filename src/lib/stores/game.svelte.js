/**
 * Game state store using Svelte 5 runes.
 * Wraps chess.js and portal logic.
 */
import { Chess } from 'chess.js';
import { generatePortalPairs, getRandomInterval, applyPortalSwap, getPortalCharge } from '$lib/chess/portals.js';
import { playMoveSound, playEndSound } from '$lib/chess/sounds.js';
import { vibrateMove, vibrateCapture, vibrateCheck, vibrateSwap } from '$lib/utils/haptics.js';

class GameState {
	chess = $state(new Chess());
	moveCount = $state(0);
	gameActive = $state(true);
	portalPairs = $state([]);
	swapInterval = $state(getRandomInterval());
	movesUntilSwap = $state(this.swapInterval);
	statusText = $state('Ready to play.');
	popupShown = $state(false);
	selectedSquare = $state(null);
	/** @type {Array<{square: string, type: 'move'|'capture'|'danger'}>} */
	highlights = $state([]);

	get fen() { return this.chess.fen(); }
	get turn() { return this.chess.turn(); }
	get turnColor() { return this.turn === 'w' ? 'White' : 'Black'; }
	get isCheck() { return this.chess.isCheck(); }
	get isCheckmate() { return this.chess.isCheckmate(); }
	get isDraw() { return this.chess.isDraw(); }
	get isGameOver() { return !this.gameActive || this.chess.isGameOver(); }

	get portalCharge() {
		return getPortalCharge(this.swapInterval, this.movesUntilSwap);
	}

	get portalReady() {
		return this.movesUntilSwap <= 1;
	}

	/** Get piece at a square */
	getPiece(square) {
		try {
			return this.chess.get(square);
		} catch {
			return null;
		}
	}

	/** Get legal moves for a square, including king captures */
	getLegalMoves(square) {
		if (!this.gameActive) return [];
		try {
			const moves = this.chess.moves({ square, verbose: true });
			
			// In portal chess, we allow taking the king if it's reachable
			const piece = this.chess.get(square);
			if (!piece) return moves;

			const opponentColor = piece.color === 'w' ? 'b' : 'w';
			const board = this.chess.board();
			for (let r = 0; r < 8; r++) {
				for (let c = 0; c < 8; c++) {
					const target = board[r][c];
					if (target && target.type === 'k' && target.color === opponentColor) {
						const targetSq = String.fromCharCode(97 + c) + (8 - r);
						if (this._canAttack(square, targetSq)) {
							moves.push({ from: square, to: targetSq, captured: 'k', color: piece.color });
						}
					}
				}
			}
			return moves;
		} catch (e) {
			return [];
		}
	}

	/** Simple check if square A can attack square B (ignoring check) */
	_canAttack(from, to) {
		try {
			const temp = new Chess(this.fen);
			const piece = temp.get(from);
			if (!piece) return false;
			
			const fenParts = temp.fen().split(' ');
			const boardRows = fenParts[0].split('/');
			const toFile = to.charCodeAt(0) - 97;
			const toRank = 8 - parseInt(to[1]);
			
			const expand = (r) => r.replace(/\d/g, n => '1'.repeat(parseInt(n))).split('');
			const compress = (cells) => cells.join('').replace(/1+/g, m => m.length);
			
			const rows = boardRows.map(expand);
			rows[toRank][toFile] = piece.color === 'w' ? 'p' : 'P';
			fenParts[0] = rows.map(compress).join('/');
			
			const attackTest = new Chess(fenParts.join(' '));
			const moves = attackTest.moves({ square: from, verbose: true });
			return moves.some(m => m.to === to);
		} catch {
			return false;
		}
	}

	/** Select a square and compute highlights */
	selectSquare(square) {
		const piece = this.getPiece(square);
		if (!piece || piece.color !== this.turn) {
			this.clearSelection();
			return;
		}
		this.selectedSquare = square;
		this.highlights = this.getLegalMoves(square).map(m => ({
			square: m.to,
			type: m.captured === 'k' ? 'danger' : m.captured ? 'capture' : 'move'
		}));
	}

	clearSelection() {
		this.selectedSquare = null;
		this.highlights = [];
	}

	/**
	 * Attempt a move. Returns the move object or null.
	 */
	makeMove(from, to, promotion = 'q') {
		if (!this.gameActive) return null;
		let move;
		try {
			move = this.chess.move({ from, to, promotion });
		} catch {
			if (this._canAttack(from, to)) {
				const target = this.getPiece(to);
				if (target && target.type === 'k') {
					move = { from, to, captured: 'k', color: this.turn };
					const temp = new Chess(this.fen);
					const piece = temp.get(from);
					const fenParts = temp.fen().split(' ');
					const boardRows = fenParts[0].split('/');
					const expand = (r) => r.replace(/\d/g, n => '1'.repeat(parseInt(n))).split('');
					const compress = (cells) => cells.join('').replace(/1+/g, m => m.length);
					const rows = boardRows.map(expand);
					const f1 = from.charCodeAt(0) - 97, r1 = 8 - parseInt(from[1]);
					const f2 = to.charCodeAt(0) - 97, r2 = 8 - parseInt(to[1]);
					rows[r2][f2] = piece.type;
					rows[r1][f1] = '1';
					fenParts[0] = rows.map(compress).join('/');
					fenParts[1] = fenParts[1] === 'w' ? 'b' : 'w';
					this.chess.load(fenParts.join(' '));
				}
			}
		}

		if (!move) return null;

		// Trigger Svelte 5 reactivity for the chess instance
		this.chess = this.chess;

		if (this.isCheckmate || this.isDraw || move.captured === 'k') {
			playEndSound();
		} else {
			playMoveSound(!!move.captured);
			if (move.captured) vibrateCapture();
			else vibrateMove();
		}

		if (move.captured === 'k') {
			this.endGame('King captured. Game over.');
			return move;
		}

		this.moveCount++;
		this.movesUntilSwap--;
		if (this.movesUntilSwap <= 0) {
			this._applySwap();
		}

		this._updateStatus();
		this.clearSelection();
		return move;
	}

	_applySwap() {
		vibrateSwap();
		const newFen = applyPortalSwap(this.fen, this.portalPairs);
		this.chess.load(newFen);
		this.chess = this.chess;
		this.swapInterval = getRandomInterval();
		this.movesUntilSwap = this.swapInterval;

		const board = this.chess.board().flat();
		const whiteKing = board.some(p => p && p.type === 'k' && p.color === 'w');
		const blackKing = board.some(p => p && p.type === 'k' && p.color === 'b');
		if (!whiteKing || !blackKing) {
			const winner = whiteKing ? 'White' : 'Black';
			this.endGame(`${winner} wins (king lost via portal)`);
		}
	}

	_updateStatus() {
		if (!this.gameActive) return;
		const color = this.turnColor;

		if (this.isCheckmate) {
			const winner = this.turn === 'w' ? 'Black' : 'White';
			this.endGame(`Checkmate! ${winner} wins.`);
		} else if (this.isDraw) {
			this.endGame('Draw!');
		} else if (this.isCheck) {
			vibrateCheck();
			this.statusText = `${color} is in check.`;
		} else {
			this.statusText = `${color} to move.`;
		}
	}

	endGame(message) {
		if (!this.gameActive) return;
		this.gameActive = false;
		this.statusText = message;
		playEndSound();
	}

	reset() {
		this.chess = new Chess();
		this.moveCount = 0;
		this.gameActive = true;
		this.popupShown = false;
		this.swapInterval = getRandomInterval();
		this.movesUntilSwap = this.swapInterval;
		this.portalPairs = generatePortalPairs();
		this.statusText = 'White to move.';
		this.clearSelection();
	}

	initPortals() {
		this.portalPairs = generatePortalPairs();
	}

	loadState(data) {
		if (data.fen) {
			this.chess.load(data.fen);
			this.chess = this.chess;
		}
		if (data.moveCount !== undefined) this.moveCount = data.moveCount;
		if (data.movesUntilSwap !== undefined) this.movesUntilSwap = data.movesUntilSwap;
		if (data.swapInterval !== undefined) this.swapInterval = data.swapInterval;
		if (data.portalPairs) this.portalPairs = data.portalPairs;
		if (data.gameActive !== undefined) this.gameActive = data.gameActive;
		if (data.statusText) this.statusText = data.statusText;
		this.clearSelection();
	}

	serialize() {
		return {
			fen: this.fen,
			moveCount: this.moveCount,
			movesUntilSwap: this.movesUntilSwap,
			swapInterval: this.swapInterval,
			portalPairs: this.portalPairs,
			gameActive: this.gameActive,
			statusText: this.statusText
		};
	}
}

export const gameState = new GameState();

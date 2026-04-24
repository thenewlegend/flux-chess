/**
 * Game state store using Svelte 5 runes.
 * Wraps chess.js and portal logic.
 */
import { Chess } from 'chess.js';
import { generatePortalPairs, getRandomInterval, applyPortalSwap, getPortalCharge } from '$lib/chess/portals.js';
import { playMoveSound, playEndSound, playCheckSound } from '$lib/chess/sounds.js';
import { vibrateMove, vibrateCapture, vibrateCheck, vibrateSwap } from '$lib/utils/haptics.js';

class GameState {
	#chess = new Chess();
	// Primary reactive state
	fen = $state(this.#chess.fen());
	moveCount = $state(0);
	gameActive = $state(true);
	portalPairs = $state([]);
	swapInterval = $state(getRandomInterval());
	movesUntilSwap = $state(this.swapInterval);
	statusText = $state('White to move.');
	popupShown = $state(false);
	selectedSquare = $state(null);
	autoFlip = $state(false);
	/** @type {{from: string, to: string}|null} */
	lastMove = $state(null);
	/** @type {Array<{square: string, type: 'move'|'capture'|'danger'}>} */
	highlights = $state([]);

	#safeLoad(fen) {
		try {
			if (!fen) return false;
			this.#chess.load(fen);
			return true;
		} catch (e) {
			return false;
		}
	}

	// Getters that depend on this.fen for reactivity
	get turn() { 
		const f = this.fen;
		this.#safeLoad(f);
		return this.#chess.turn(); 
	}
	get turnColor() { return this.turn === 'w' ? 'White' : 'Black'; }
	get isCheck() { 
		if (!this.gameActive) return false;
		return this.#safeLoad(this.fen) ? this.#chess.isCheck() : false; 
	}
	get isCheckmate() { 
		if (!this.gameActive) return false;
		return this.#safeLoad(this.fen) ? this.#chess.isCheckmate() : false; 
	}
	get isDraw() { 
		if (!this.gameActive) return false;
		return this.#safeLoad(this.fen) ? this.#chess.isDraw() : false; 
	}
	get isGameOver() { 
		if (!this.gameActive) return true;
		return this.#safeLoad(this.fen) ? this.#chess.isGameOver() : true; 
	}

	get portalCharge() {
		return getPortalCharge(this.swapInterval, this.movesUntilSwap);
	}

	get portalReady() {
		return this.movesUntilSwap <= 1;
	}

	/** Get piece at a square */
	getPiece(square) {
		const f = this.fen;
		if (this.#safeLoad(f)) {
			return this.#chess.get(square);
		}
		// If load failed (missing king), manually parse FEN for pieces
		return this._manualGetPiece(square);
	}

	_manualGetPiece(square) {
		const parts = this.fen.split(' ');
		const rows = parts[0].split('/');
		const fileIdx = square.charCodeAt(0) - 97;
		const rankIdx = 8 - parseInt(square[1]);
		const row = rows[rankIdx].replace(/\d/g, n => '1'.repeat(parseInt(n)));
		const char = row[fileIdx];
		if (char === '1') return null;
		return {
			type: char.toLowerCase(),
			color: char === char.toUpperCase() ? 'w' : 'b'
		};
	}

	/** Get legal moves for a square, including king captures */
	getLegalMoves(square) {
		if (!this.gameActive) return [];
		const f = this.fen;
		const valid = this.#safeLoad(f);
		const moves = valid ? this.#chess.moves({ square, verbose: true }) : [];
		
		try {
			const piece = this.getPiece(square);
			if (!piece) return moves;

			const opponentColor = piece.color === 'w' ? 'b' : 'w';
			const boardFen = this.fen.split(' ')[0];
			const kingChar = opponentColor === 'k' ? 'k' : (opponentColor === 'w' ? 'K' : 'k');
			
			if (boardFen.includes(kingChar)) {
				// Find king position
				const rows = boardFen.split('/');
				for (let r = 0; r < 8; r++) {
					const row = rows[r].replace(/\d/g, n => '1'.repeat(parseInt(n)));
					for (let c = 0; c < 8; c++) {
						if (row[c] === kingChar) {
							const targetSq = String.fromCharCode(97 + c) + (8 - r);
							if (this._canAttack(square, targetSq)) {
								// Only add if not already there
								if (!moves.some(m => m.to === targetSq)) {
									moves.push({ from: square, to: targetSq, captured: 'k', color: piece.color });
								}
							}
						}
					}
				}
			}
		} catch (e) {}
		return moves;
	}

	/** Simple check if square A can attack square B (ignoring check) */
	_canAttack(from, to) {
		try {
			const temp = new Chess();
			// Setup a safe board for attack testing
			const fenParts = this.fen.split(' ');
			const boardRows = fenParts[0].split('/');
			const toFile = to.charCodeAt(0) - 97;
			const toRank = 8 - parseInt(to[1]);
			const expand = (r) => r.replace(/\d/g, n => '1'.repeat(parseInt(n))).split('');
			const compress = (cells) => cells.join('').replace(/1+/g, m => m.length);
			const rows = boardRows.map(expand);
			
			const piece = this.getPiece(from);
			if (!piece) return false;

			// Replace target with opponent pawn to make it "capturable" for standard chess.js
			rows[toRank][toFile] = piece.color === 'w' ? 'p' : 'P';
			
			// Ensure both kings exist in the test board to avoid load() throwing
			let whiteKingFound = false, blackKingFound = false;
			for(let r=0; r<8; r++) {
				for(let c=0; c<8; c++) {
					if (rows[r][c] === 'K') whiteKingFound = true;
					if (rows[r][c] === 'k') blackKingFound = true;
				}
			}
			if (!whiteKingFound) rows[0][0] = rows[0][0] === '1' ? 'K' : rows[0][0];
			if (!blackKingFound) rows[7][7] = rows[7][7] === '1' ? 'k' : rows[7][7];

			fenParts[0] = rows.map(compress).join('/');
			
			const attackTest = new Chess();
			attackTest.load(fenParts.join(' '));
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
		this.#safeLoad(this.fen);
		let move;
		try {
			move = this.#chess.move({ from, to, promotion });
			this.fen = this.#chess.fen();
		} catch {
			if (this._canAttack(from, to)) {
				const target = this.getPiece(to);
				if (target && target.type === 'k') {
					move = { from, to, captured: 'k', color: this.turn };
					const temp = new Chess();
					temp.load(this.fen);
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
					this.fen = fenParts.join(' ');
				}
			}
		}

		if (!move) return null;
		this.lastMove = { from, to };

		if (this.isCheckmate || this.isDraw || move.captured === 'k') {
			playEndSound();
		} else if (!this.isCheck) {
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
		this.fen = newFen; 
		this.swapInterval = getRandomInterval();
		this.movesUntilSwap = this.swapInterval;

		const whiteKing = this.fen.split(' ')[0].includes('K');
		const blackKing = this.fen.split(' ')[0].includes('k');
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
			let reason = 'Draw!';
			if (this.#chess.isStalemate()) reason = 'Draw by Stalemate';
			else if (this.#chess.isThreefoldRepetition()) reason = 'Draw by Repetition';
			else if (this.#chess.isInsufficientMaterial()) reason = 'Draw by Insufficient Material';
			else if (this.#chess.isDraw()) reason = 'Draw (50-move rule or other)';
			this.endGame(reason);
		} else if (this.isCheck) {
			vibrateCheck();
			playCheckSound();
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
		this.#chess = new Chess();
		this.fen = this.#chess.fen();
		this.moveCount = 0;
		this.gameActive = true;
		this.popupShown = false;
		this.swapInterval = getRandomInterval();
		this.movesUntilSwap = this.swapInterval;
		this.portalPairs = generatePortalPairs();
		this.statusText = 'White to move.';
		this.lastMove = null;
		this.clearSelection();
	}

	initPortals() {
		this.portalPairs = generatePortalPairs();
	}

	loadState(data) {
		if (data.fen) {
			this.fen = data.fen;
		}
		if (data.moveCount !== undefined) this.moveCount = data.moveCount;
		if (data.movesUntilSwap !== undefined) this.movesUntilSwap = data.movesUntilSwap;
		if (data.swapInterval !== undefined) this.swapInterval = data.swapInterval;
		if (data.portalPairs) this.portalPairs = data.portalPairs;
		if (data.lastMove !== undefined) this.lastMove = data.lastMove;
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
			lastMove: this.lastMove,
			gameActive: this.gameActive,
			statusText: this.statusText
		};
	}
}

export const gameState = new GameState();

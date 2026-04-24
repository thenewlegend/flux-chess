<script>
	import { gameState } from '$lib/stores/game.svelte.js';
	import { roomState } from '$lib/stores/room.svelte.js';

	const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
	const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];
	const PIECE_MAP = {
		wk: '/pieces/wK.png', wq: '/pieces/wQ.png', wr: '/pieces/wR.png',
		wb: '/pieces/wB.png', wn: '/pieces/wN.png', wp: '/pieces/wP.png',
		bk: '/pieces/bK.png', bq: '/pieces/bQ.png', br: '/pieces/bR.png',
		bb: '/pieces/bB.png', bn: '/pieces/bN.png', bp: '/pieces/bP.png'
	};
	const PIECE_CDN = 'https://chessboardjs.com/img/chesspieces/wikipedia';

	let dragFrom = $state(null);

	const displayRanks = $derived(roomState.orientation === 'white' ? RANKS : [...RANKS].reverse());
	const displayFiles = $derived(roomState.orientation === 'white' ? FILES : [...FILES].reverse());

	function getPieceImage(piece) {
		if (!piece) return null;
		const key = piece.color + piece.type;
		// Try local first, fallback to CDN
		return PIECE_MAP[key] || `${PIECE_CDN}/${piece.color === 'w' ? 'w' : 'b'}${piece.type.toUpperCase()}.png`;
	}

	function isLightSquare(file, rank) {
		return (FILES.indexOf(file) + rank) % 2 === 1;
	}

	function getPortalInfo(square) {
		return gameState.portalPairs.find(p => p.a === square || p.b === square);
	}

	function isHighlighted(square) {
		return gameState.highlights.find(h => h.square === square);
	}

	function handleSquareClick(square) {
		if (!gameState.gameActive) return;

		const piece = gameState.getPiece(square);

		// If we have a selected piece and click a highlighted destination
		if (gameState.selectedSquare) {
			const highlight = isHighlighted(square);
			if (highlight) {
				attemptMove(gameState.selectedSquare, square);
				return;
			}
			// Clicking same square — deselect
			if (gameState.selectedSquare === square) {
				gameState.clearSelection();
				return;
			}
		}

		// Select own piece
		if (piece && piece.color === gameState.turn) {
			// Check if allowed to interact
			if (roomState.isSpectator) return;
			if (roomState.isOnline && !roomState.isMyTurn) return;
			gameState.selectSquare(square);
		} else {
			gameState.clearSelection();
		}
	}

	function attemptMove(from, to) {
		if (roomState.isSpectator) return;
		if (roomState.isOnline && !roomState.isMyTurn) return;

		if (roomState.isOnline) {
			// Optimistic local move
			const move = gameState.makeMove(from, to);
			if (move) {
				// Send to server for validation
				roomState.sendMove(from, to).then(ok => {
					if (!ok) {
						// Server rejected — the realtime update will fix state
						console.warn('Move rejected by server');
					}
				});
			}
		} else {
			gameState.makeMove(from, to);
		}
	}

	function handleDragStart(e, square) {
		if (!gameState.gameActive) { e.preventDefault(); return; }
		if (roomState.isSpectator) { e.preventDefault(); return; }
		if (roomState.isOnline && !roomState.isMyTurn) { e.preventDefault(); return; }

		const piece = gameState.getPiece(square);
		if (!piece || piece.color !== gameState.turn) { e.preventDefault(); return; }

		dragFrom = square;
		gameState.selectSquare(square);

		// Set drag image
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			const img = e.target;
			e.dataTransfer.setDragImage(img, img.width / 2, img.height / 2);
		}
	}

	function handleDragOver(e) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
	}

	function handleDrop(e, square) {
		e.preventDefault();
		if (dragFrom && dragFrom !== square) {
			attemptMove(dragFrom, square);
		}
		dragFrom = null;
	}

	function handleDragEnd() {
		dragFrom = null;
	}
</script>

<div class="board-container">
	<div class="chess-board">
		{#each displayRanks as rank}
			{#each displayFiles as file}
				{@const square = `${file}${rank}`}
				{@const piece = gameState.getPiece(square)}
				{@const light = isLightSquare(file, rank)}
				{@const portal = getPortalInfo(square)}
				{@const highlight = isHighlighted(square)}
				{@const selected = gameState.selectedSquare === square}
				<div
					class="square"
					class:light
					class:dark={!light}
					class:selected
					class:highlight-move={highlight?.type === 'move'}
					class:highlight-capture={highlight?.type === 'capture'}
					class:highlight-danger={highlight?.type === 'danger'}
					class:portal={!!portal}
					data-square={square}
					style={portal ? `--portal-color: ${portal.color}; --portal-charge: ${gameState.portalCharge.toFixed(1)};` : ''}
					class:ready={portal && gameState.portalReady}
					onclick={() => handleSquareClick(square)}
					ondragover={handleDragOver}
					ondrop={(e) => handleDrop(e, square)}
					role="button"
					tabindex="0"
				>
					{#if piece}
						<img
							src={getPieceImage(piece)}
							alt="{piece.color === 'w' ? 'White' : 'Black'} {piece.type}"
							class="piece-img"
							draggable="true"
							ondragstart={(e) => handleDragStart(e, square)}
							ondragend={handleDragEnd}
						/>
					{/if}
				</div>
			{/each}
		{/each}
	</div>
</div>

<style>
	.board-container {
		width: min(90vw, 500px);
		aspect-ratio: 1/1;
		flex-shrink: 0;
	}

	.chess-board {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		grid-template-rows: repeat(8, 1fr);
		width: 100%;
		height: 100%;
		border-radius: 4px;
		overflow: hidden;
		box-shadow: var(--md-elevation-3);
	}

	.square {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		overflow: hidden;
	}

	.square.light { background-color: #f0d9b5; }
	.square.dark { background-color: #b58863; }

	.piece-img {
		width: 85%;
		height: 85%;
		object-fit: contain;
		pointer-events: auto;
		z-index: 10;
		transition: transform 0.1s ease;
	}

	.piece-img:active {
		transform: scale(1.1);
	}

	/* Selection */
	.square.selected {
		background-color: rgba(235, 208, 113, 0.5) !important;
		box-shadow: inset 0 0 10px rgba(235, 208, 113, 0.6);
	}

	/* Move dot */
	.square.highlight-move::after {
		content: "";
		position: absolute;
		top: 50%; left: 50%;
		transform: translate(-50%, -50%);
		width: 24%;
		height: 24%;
		background-color: rgba(34, 197, 94, 0.45);
		border-radius: 50%;
		pointer-events: none;
		z-index: 20;
	}

	/* Capture ring */
	.square.highlight-capture::after {
		content: "";
		position: absolute;
		inset: 0;
		border: 5px solid rgba(220, 38, 38, 0.45);
		background-color: rgba(220, 38, 38, 0.05);
		pointer-events: none;
		z-index: 20;
	}

	/* King-capture glow */
	.square.highlight-danger::after {
		content: "";
		position: absolute;
		inset: 0;
		background-color: rgba(220, 38, 38, 0.5);
		box-shadow: inset 0 0 20px rgba(220, 38, 38, 0.9);
		animation: pulseDanger 1s infinite;
		pointer-events: none;
		z-index: 20;
	}

	/* Portal styles */
	.square.portal::after {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: 2px;
		pointer-events: none;
		border: 3px solid var(--portal-color);
		animation: borderSweep 15s cubic-bezier(0.4, 0, 0.2, 1) infinite;
		z-index: 15;
	}

	.square.portal::before {
		content: "";
		position: absolute;
		inset: 0;
		background-color: var(--portal-color);
		opacity: 0.35;
		transform: scaleY(calc(var(--portal-charge, 0) / 100));
		transform-origin: bottom;
		transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
		pointer-events: none;
		z-index: 5;
	}

	.square.portal.ready::before {
		animation: portalFillPulse 1.5s ease-in-out infinite;
		opacity: 0.4;
	}

	/* When both portal and highlight, portal ::after is overridden by highlight — use border instead */
	.square.portal.highlight-move::after,
	.square.portal.highlight-capture::after,
	.square.portal.highlight-danger::after {
		border: 3px solid var(--portal-color);
	}
</style>

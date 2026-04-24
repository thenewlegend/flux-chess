<script>
	import { gameState } from '$lib/stores/game.svelte.js';
	import { roomState } from '$lib/stores/room.svelte.js';

	function handleRestart() {
		if (roomState.isOnline) {
			roomState.restart();
		} else {
			gameState.reset();
		}
	}

	function handleResign() {
		if (!gameState.gameActive) return;
		if (roomState.isOnline && !roomState.isMyTurn) return;
		if (roomState.isSpectator) return;

		if (roomState.isOnline) {
			roomState.resign();
		} else {
			const loser = gameState.turn === 'w' ? 'White' : 'Black';
			const winner = loser === 'White' ? 'Black' : 'White';
			gameState.endGame(`${loser} resigned. ${winner} wins.`);
		}
	}

	function handleFlip() {
		roomState.flipBoard();
	}

	const canRestart = $derived(roomState.role === 'local' || roomState.isHost);
	const canResign = $derived(
		gameState.gameActive &&
		!roomState.isSpectator &&
		(roomState.role === 'local' || roomState.isMyTurn)
	);
</script>

<div class="card controls-card">
	{#if canRestart}
		<button class="btn filled" onclick={handleRestart}>
			<span class="material-symbols-rounded">refresh</span> Restart
		</button>
	{/if}
	<button class="btn tonal" onclick={handleResign} disabled={!canResign}
		style:opacity={canResign ? '1' : '0.4'}
		title={canResign ? 'Resign' : 'Wait for your turn to resign'}
	>
		<span class="material-symbols-rounded">flag</span> Resign
	</button>
	<button class="btn tonal" onclick={handleFlip} title="Flip Board">
		<span class="material-symbols-rounded">flip</span> Flip
	</button>
</div>

<style>
	.controls-card {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 12px;
	}
</style>

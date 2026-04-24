<script>
	import { gameState } from '$lib/stores/game.svelte.js';
	import { roomState } from '$lib/stores/room.svelte.js';

	const isMyTurn = $derived(roomState.isOnline && roomState.isMyTurn && gameState.gameActive);
</script>

<div class="card status-card" class:my-turn={isMyTurn}>
	<div class="status-text">{gameState.statusText}</div>
	<div class="secondary-text">Swap in {gameState.movesUntilSwap}</div>
	{#if roomState.isOnline}
		<div class="online-badge">Room: {roomState.code}</div>
	{/if}
</div>

<style>
	.status-card .status-text {
		font-size: 1rem;
	}

	.online-badge {
		margin-top: 12px;
		font-size: 0.9rem;
		color: var(--md-sys-color-primary);
		font-weight: 500;
	}

	.status-card.my-turn {
		box-shadow: 0 0 0 2px var(--md-sys-color-primary), var(--md-elevation-1);
		transition: box-shadow 0.4s ease;
	}
</style>

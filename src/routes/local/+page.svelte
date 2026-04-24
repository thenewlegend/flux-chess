<script>
	import Board from '$lib/components/Board.svelte';
	import StatusCard from '$lib/components/StatusCard.svelte';
	import ControlsCard from '$lib/components/ControlsCard.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { gameState } from '$lib/stores/game.svelte.js';
	import { roomState } from '$lib/stores/room.svelte.js';
	import { onMount, onDestroy } from 'svelte';

	let restartPopup = $state(false);
	let restartTimer = $state(null);

	onMount(() => {
		roomState.role = 'local';
		roomState.orientation = 'white';
		gameState.reset();
		gameState.initPortals();
		gameState._updateStatus();
	});

	onDestroy(() => {
		if (restartTimer) clearTimeout(restartTimer);
	});

	// Watch for game ending
	$effect(() => {
		if (!gameState.gameActive && !gameState.popupShown) {
			gameState.popupShown = true;
			setTimeout(() => { restartPopup = true; }, 400);
		}
	});

	function handleRestart() {
		restartPopup = false;
		roomState.orientation = 'white';
		gameState.reset();
		if (restartTimer) clearTimeout(restartTimer);
	}

	function closePopup() {
		restartPopup = false;
		if (restartTimer) clearTimeout(restartTimer);
	}
</script>

<main class="app-main">
	<div class="left-panel">
		<StatusCard />
		<ControlsCard />
	</div>

	<div class="board-wrapper">
		<Board />
	</div>
</main>

<Modal open={restartPopup} title="Game Ended" onclose={closePopup}>
	<p class="endgame-status">{gameState.statusText}</p>
	<p>Restart now?</p>
	<div class="modal-actions">
		<button class="btn tonal" onclick={closePopup}>No</button>
		<button class="btn filled" onclick={handleRestart}>Yes</button>
	</div>
</Modal>

<style>
	.app-main {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 16px;
		gap: 20px;
		max-width: 1000px;
		margin: 0 auto;
		min-height: calc(100vh - 60px);
		box-sizing: border-box;
	}

	@media (min-width: 768px) {
		.app-main {
			flex-direction: row-reverse;
			align-items: flex-start;
			justify-content: center;
			padding: 32px 24px;
			gap: 24px;
		}
	}

	.left-panel {
		display: flex;
		flex-direction: column;
		gap: 16px;
		width: 100%;
		max-width: min(100%, 340px);
	}

	@media (min-width: 768px) {
		.left-panel {
			max-width: 280px;
		}
	}

	.board-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0;
		flex-shrink: 0;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 24px;
	}

	p {
		color: var(--md-sys-color-on-surface-variant);
		line-height: 1.5;
	}

	.endgame-status {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--md-sys-color-primary);
		margin-bottom: 8px;
	}
</style>

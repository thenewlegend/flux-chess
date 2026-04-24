<script>
	import Board from '$lib/components/Board.svelte';
	import StatusCard from '$lib/components/StatusCard.svelte';
	import ControlsCard from '$lib/components/ControlsCard.svelte';
	import PlayerBadge from '$lib/components/PlayerBadge.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import OnlineLobby from '$lib/components/Lobby/OnlineLobby.svelte';
	import RoleSelection from '$lib/components/Lobby/RoleSelection.svelte';
	import { gameState } from '$lib/stores/game.svelte.js';
	import { roomState } from '$lib/stores/room.svelte.js';
	import { theme } from '$lib/stores/theme.svelte.js';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';

	/** @type {'splash'|'game'} */
	let screen = $state('splash');
	/** @type {'online'|'roles'} */
	let lobbyView = $state('online');
	let joinedRoomCode = $state('');
	let joinedRoomData = $state(null);
	let restartPopup = $state(false);
	let restartTimer = $state(null);

	onMount(() => {
		gameState.initPortals();
		gameState._updateStatus();
	});

	onDestroy(() => {
		if (restartTimer) clearTimeout(restartTimer);
	});

	// Watch for game ending
	$effect(() => {
		if (!gameState.gameActive && !gameState.popupShown && screen === 'game') {
			if (roomState.isHost) {
				gameState.popupShown = true;
				setTimeout(() => { restartPopup = true; }, 400);
			} else {
				// Guest, show popup without options
				gameState.popupShown = true;
				setTimeout(() => { restartPopup = true; }, 400);
			}
		}
	});

	// Watch for room disconnection (termination)
	$effect(() => {
		if (screen === 'game' && !roomState.code) {
			screen = 'splash';
			lobbyView = 'online';
		}
	});

	function backToMain() {
		goto('/');
	}

	function onRoomCreated(code) {
		// Host waits — will transition when guest joins via realtime
	}

	function onRoomJoined(code, data) {
		joinedRoomCode = code;
		joinedRoomData = data;
		lobbyView = 'roles';
	}

	function backToOnline() {
		lobbyView = 'online';
	}

	function onRoleSelected() {
		screen = 'game';
	}

	function handleRestart() {
		restartPopup = false;
		if (roomState.isOnline) {
			roomState.restart();
		}
		if (restartTimer) clearTimeout(restartTimer);
	}

	function closePopup() {
		restartPopup = false;
		if (restartTimer) clearTimeout(restartTimer);
	}

	// Player badge derivations
	const isOnline = $derived(roomState.isOnline);
	const hostIsWhite = $derived(roomState.hostColor === 'w');
	const bottomIsWhite = $derived(roomState.orientation === 'white');
	const bottomIsHost = $derived(bottomIsWhite === hostIsWhite);

	const bottomBadge = $derived({
		label: isOnline ? (bottomIsHost ? 'HOST' : 'GUEST') : '',
		piece: bottomIsWhite ? '\u2654' : '\u265a',
		pieceColor: bottomIsWhite ? '#f0d9b5' : '#2d2d2d',
		isMe: isOnline && ((roomState.isHost && bottomIsHost) || (roomState.role === 'guest' && !bottomIsHost))
	});

	const topBadge = $derived({
		label: isOnline ? (bottomIsHost ? 'GUEST' : 'HOST') : '',
		piece: bottomIsWhite ? '\u265a' : '\u2654',
		pieceColor: bottomIsWhite ? '#2d2d2d' : '#f0d9b5',
		isMe: isOnline && ((roomState.isHost && !bottomIsHost) || (roomState.role === 'guest' && bottomIsHost))
	});


</script>

{#if screen === 'splash'}
	<!-- Splash / Lobby -->
	<div class="splash-screen">
		<div class="splash-inner unified-lobby">
			<img src={theme.logoSrc} alt="FLUX Chess Logo" class="splash-logo" />
			<div class="text-block">
				<h1>FLUX</h1>
			</div>

			{#if lobbyView === 'online'}
				<OnlineLobby
					onBack={backToMain}
					onRoomCreated={onRoomCreated}
					onRoomJoined={onRoomJoined}
					onRejoinComplete={() => { screen = 'game'; }}
				/>
			{:else if lobbyView === 'roles'}
				<RoleSelection
					roomCode={joinedRoomCode}
					roomData={joinedRoomData}
					onBack={backToOnline}
					onSelected={onRoleSelected}
				/>
			{/if}
		</div>
	</div>
{:else}
	<!-- Game Screen -->


	<main class="app-main">
		<div class="left-panel">
			<StatusCard />
			<ControlsCard />
		</div>

		<div class="board-wrapper">
			{#if isOnline}
				<PlayerBadge
					position="top"
					label={topBadge.label}
					pieceSymbol={topBadge.piece}
					pieceColor={topBadge.pieceColor}
					isMe={topBadge.isMe}
				/>
			{/if}

			<Board />

			{#if isOnline}
				<PlayerBadge
					position="bottom"
					label={bottomBadge.label}
					pieceSymbol={bottomBadge.piece}
					pieceColor={bottomBadge.pieceColor}
					isMe={bottomBadge.isMe}
				/>
			{/if}
		</div>
	</main>
{/if}

<!-- Restart Popup -->
<Modal open={restartPopup} title="Game Ended" onclose={closePopup}>
	<p class="endgame-status">{gameState.statusText}</p>
	{#if roomState.role === 'guest'}
		<p>Waiting for host to restart...</p>
	{:else}
		<p>Restart now?</p>
		<div class="modal-actions">
			<button class="btn tonal" onclick={closePopup}>No</button>
			<button class="btn filled" onclick={handleRestart}>Yes</button>
		</div>
	{/if}
</Modal>

<style>
	.splash-screen {
		position: fixed;
		inset: 0;
		background: var(--md-sys-color-background);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		transition: opacity 0.8s ease, background-color 0.3s;
	}

	.splash-inner {
		text-align: center;
		animation: introReveal 0.6s ease forwards;
		transform: scale(0.96);
	}

	.unified-lobby {
		background: var(--md-sys-color-surface);
		padding: 28px 20px;
		border-radius: 24px;
		box-shadow: var(--md-elevation-3);
		width: 90%;
		max-width: 400px;
		max-height: 90vh;
		overflow-y: auto;
		transition: all 0.4s cubic-bezier(0.2, 0, 0, 1);
		display: flex;
		flex-direction: column;
		align-items: center;
		scrollbar-width: none;
	}

	.unified-lobby::-webkit-scrollbar { display: none; }

	.splash-logo {
		width: min(45vw, 160px);
		max-width: 160px;
		height: auto;
		margin: 0 auto;
		display: block;
	}

	.text-block {
		margin-top: 24px;
	}

	.text-block h1 {
		margin: 0;
		letter-spacing: 2px;
		font-size: clamp(1.5rem, 4vw, 2.5rem);
	}

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

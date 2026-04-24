<script>
	import { roomState } from '$lib/stores/room.svelte.js';
	import { gameState } from '$lib/stores/game.svelte.js';

	let { roomCode, roomData, onBack, onSelected } = $props();

	const hostColor = $derived(roomData?.game_state?.hostColor || 'w');
	const hColorName = $derived(hostColor === 'w' ? 'White' : 'Black');
	const gColorName = $derived(hostColor === 'w' ? 'Black' : 'White');
	const hasHost = $derived(roomData?.hasHost);
	const hasGuest = $derived(roomData?.hasGuest);
	const currentUserRole = $derived(roomData?.currentUserRole);

	async function selectRole(role) {

		try {
			// Load game state
			if (roomData?.game_state) {
				gameState.loadState(roomData.game_state);
			}
			await roomState.enterWithRole(role);
			onSelected?.();
		} catch (e) {
			console.error('Failed to join:', e);
			roomState.showToast(e.message || 'Failed to join');
		}
	}
</script>

<div class="lobby-menu" style="animation: introReveal 0.4s ease forwards;">
	<div class="lobby-section">
		<h2 class="room-title">Room: {roomCode}</h2>
		<p class="secondary-text" style="margin-bottom: 24px;">Select your role to enter the match</p>

		<div class="role-grid">
			<button class="role-card host" onclick={() => selectRole('host')}
				disabled={hasHost && currentUserRole !== 'host'}>
				<span class="material-symbols-rounded">person</span>
				<div class="role-details">
					<span class="role-name">{currentUserRole === 'host' ? 'REJOIN AS HOST' : 'HOST'}</span>
					<span class="role-color">Plays as {hColorName}</span>
				</div>
			</button>

			<button class="role-card guest" onclick={() => selectRole('guest')}
				disabled={hasGuest && currentUserRole !== 'guest'}>
				<span class="material-symbols-rounded">person_add</span>
				<div class="role-details">
					<span class="role-name">{currentUserRole === 'guest' ? 'REJOIN AS GUEST' : 'GUEST'}</span>
					<span class="role-color">Plays as {gColorName}</span>
				</div>
			</button>

		</div>
	</div>

	<div style="margin-top: 32px; width: 100%;">
		<button class="btn text-btn back-btn" onclick={onBack}>
			<span class="material-symbols-rounded">arrow_back</span> Back to Lobby
		</button>
	</div>
</div>

<style>
	.room-title {
		margin: 0 0 4px;
	}

	.role-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 16px;
		width: 100%;
	}

	.role-card {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 16px;
		background: var(--md-sys-color-secondary-container);
		border: 1px solid var(--md-sys-color-outline);
		border-radius: 16px;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		text-align: left;
		color: var(--md-sys-color-on-secondary-container);
		font-family: inherit;
	}

	.role-card:hover:not(:disabled) {
		transform: translateY(-2px);
		background: var(--md-sys-color-surface-variant);
		border-color: var(--md-sys-color-primary);
		box-shadow: var(--md-elevation-3);
	}

	.role-card:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.role-card .material-symbols-rounded {
		font-size: 32px;
		color: var(--md-sys-color-primary);
	}

	.role-details {
		display: flex;
		flex-direction: column;
	}

	.role-name {
		font-weight: 700;
		font-size: 1rem;
		letter-spacing: 0.5px;
	}

	.role-color {
		font-size: 0.85rem;
		opacity: 0.7;
	}

	.role-card.host { border-left: 4px solid var(--md-sys-color-primary); }
	.role-card.guest { border-left: 4px solid var(--md-sys-color-on-secondary-container); }

	.back-btn { margin-top: 0; width: 100%; }
</style>

<script>
	import { roomState } from '$lib/stores/room.svelte.js';
	import { onMount } from 'svelte';

	let { onBack, onRoomCreated, onRoomJoined, onRejoinComplete } = $props();

	let joinCode = $state('');
	let joinError = $state('');
	let createdCode = $state('');
	let waiting = $state(false);
	let joining = $state(false);
	let copyIcon = $state('content_copy');

	let discoveredSession = $state(null);
	let verifyingSession = $state(false);

	onMount(async () => {
		const session = roomState.getStoredSession();
		if (session) {
			console.log('[Lobby] Found stored session:', session);
			verifyingSession = true;
			try {
				const data = await roomState.joinRoom(session.code);
				console.log('[Lobby] Room data keys:', Object.keys(data));
				console.log('[Lobby] currentUserRole from server:', data.currentUserRole);
				
				const canRejoin = (data.currentUserRole === session.role) || (session.role === 'spectator');
				
				if (canRejoin) {
					discoveredSession = { ...session, data };
				} else {
					console.warn('[Lobby] Role mismatch or room full. Stored:', session.role, 'Server:', data.currentUserRole);
					roomState.clearSession();
				}
			} catch (e) {
				console.error('[Lobby] Discovery error:', e);
				// Only clear if room is explicitly gone
				if (e.message?.includes('not found')) {
					roomState.clearSession();
				}
			} finally {
				verifyingSession = false;
			}
		}
	});

	async function handleRejoin() {
		if (!discoveredSession) return;
		try {
			// Pre-load game state before entering
			if (discoveredSession.data.game_state) {
				const { gameState } = await import('$lib/stores/game.svelte.js');
				gameState.loadState(discoveredSession.data.game_state);
			}
			await roomState.enterWithRole(discoveredSession.role);
			if (onRejoinComplete) {
				onRejoinComplete();
			} else {
				onRoomJoined?.(discoveredSession.code, discoveredSession.data);
			}
		} catch (e) {
			console.error('[Lobby] Rejoin failed:', e);
			joinError = 'Failed to rejoin session.';
			discoveredSession = null;
		}
	}

	function handleDismissSession() {
		roomState.clearSession();
		discoveredSession = null;
	}

	async function handleCreate() {
		try {
			const code = await roomState.createRoom();
			createdCode = code;
			waiting = true;
			onRoomCreated?.(code);
		} catch (e) {
			joinError = e.message || 'Failed to create room';
		}
	}

	async function handleJoin() {
		joinError = '';
		const code = joinCode.trim().toUpperCase();
		if (!code) { joinError = 'Enter a code.'; return; }
		if (!/^[A-Z0-9]{4,8}$/.test(code)) { joinError = 'Invalid code format.'; return; }

		joining = true;
		try {
			const data = await roomState.joinRoom(code);
			onRoomJoined?.(code, data);
		} catch (e) {
			joinError = e.message || 'Room not found.';
		} finally {
			joining = false;
		}
	}

	async function handleCopy() {
		if (!createdCode) return;
		try {
			await navigator.clipboard.writeText(createdCode);
			copyIcon = 'check';
			setTimeout(() => { copyIcon = 'content_copy'; }, 2000);
		} catch {
			// Fallback handled silently
		}
	}
</script>

<div class="lobby-menu" style="animation: introReveal 0.4s ease forwards;">
	{#if discoveredSession}
		<div class="rejoin-card">
			<div class="rejoin-info">
				<span class="material-symbols-rounded">history</span>
				<div class="rejoin-text">
					<span class="rejoin-title">Active Match Found</span>
					<span class="rejoin-subtitle">Room {discoveredSession.code} • {discoveredSession.role.toUpperCase()}</span>
				</div>
			</div>
			<div class="rejoin-actions">
				<button class="btn text-btn sm" onclick={handleDismissSession}>Dismiss</button>
				<button class="btn filled sm" onclick={handleRejoin}>Rejoin</button>
			</div>
		</div>
		<div class="lobby-divider rejoin-divider">OR</div>
	{/if}

	{#if verifyingSession}
		<div class="verifying-session">
			<div class="spinner"></div>
			<span>Checking for active sessions...</span>
		</div>
	{/if}

	<div class="lobby-section">
		<h3>Host a Game</h3>
		<button class="btn filled main-btn" onclick={handleCreate} disabled={waiting}>
			{waiting ? 'Waiting...' : 'Generate Room Code'}
		</button>

		{#if createdCode}
			<div class="copy-row">
				<div class="room-code-display">{createdCode}</div>
				<button class="icon-button copy-btn" onclick={handleCopy} title="Copy Code">
					<span class="material-symbols-rounded">{copyIcon}</span>
				</button>
			</div>
		{/if}

		{#if waiting}
			<p class="waiting-text">Waiting for guest to join...</p>
		{/if}
	</div>

	<div class="lobby-divider">OR</div>

	<div class="lobby-section">
		<h3>Join using room code</h3>
		<input
			type="text"
			class="lobby-input"
			placeholder="Enter Room Code"
			style="text-transform: uppercase; text-align: center;"
			bind:value={joinCode}
			onkeydown={(e) => e.key === 'Enter' && handleJoin()}
		/>
		<button class="btn tonal main-btn" onclick={handleJoin} disabled={joining}>
			{joining ? 'Joining...' : 'Join Game'}
		</button>
		{#if joinError}
			<p class="error-text">{joinError}</p>
		{/if}
	</div>

	<button class="btn text-btn back-btn" onclick={onBack}>← Back</button>
</div>

<style>
	.lobby-section {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.lobby-section h3 {
		margin: 0 0 4px 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--md-sys-color-on-surface-variant);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.lobby-divider {
		margin: 32px 0;
		text-align: center;
		color: var(--md-sys-color-on-surface-variant);
		font-size: 0.9rem;
		font-weight: bold;
		width: 100%;
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.lobby-divider::before,
	.lobby-divider::after {
		content: "";
		flex-grow: 1;
		height: 1px;
		background: var(--md-sys-color-outline);
	}

	.copy-row {
		margin-top: 16px;
		width: 100%;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.room-code-display {
		flex-grow: 1;
		font-size: 1.5rem;
		letter-spacing: 4px;
		font-weight: bold;
		padding: 12px;
		background: var(--md-sys-color-background);
		border-radius: 8px;
		color: var(--md-sys-color-primary);
		text-align: center;
	}

	.copy-btn {
		height: 48px;
		width: 48px;
		border-radius: 12px;
		background: var(--md-sys-color-secondary-container);
	}

	.waiting-text {
		animation: softPulse 2s infinite;
		color: var(--md-sys-color-on-surface-variant);
		font-size: 0.9rem;
	}

	.error-text {
		color: #ef4444;
		font-size: 0.85rem;
		margin-top: 8px;
	}

	.back-btn {
		margin-top: 32px;
		width: 100%;
	}

	.rejoin-card {
		background: var(--md-sys-color-primary-container);
		color: var(--md-sys-color-on-primary-container);
		padding: 16px;
		border-radius: 20px;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-bottom: 8px;
		border: 1px solid var(--md-sys-color-primary);
		box-shadow: var(--md-elevation-2);
	}

	.rejoin-info {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.rejoin-info .material-symbols-rounded {
		font-size: 32px;
		color: var(--md-sys-color-primary);
	}

	.rejoin-text {
		display: flex;
		flex-direction: column;
	}

	.rejoin-title {
		font-weight: 700;
		font-size: 1rem;
	}

	.rejoin-subtitle {
		font-size: 0.85rem;
		opacity: 0.8;
	}

	.rejoin-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}

	.btn.sm {
		padding: 6px 16px;
		font-size: 0.85rem;
		min-height: 36px;
	}

	.rejoin-divider {
		margin: 16px 0;
		opacity: 0.5;
	}

	.verifying-session {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		color: var(--md-sys-color-on-surface-variant);
		font-size: 0.9rem;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid var(--md-sys-color-primary);
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>

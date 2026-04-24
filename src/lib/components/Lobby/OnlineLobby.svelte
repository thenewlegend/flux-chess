<script>
	import { roomState } from '$lib/stores/room.svelte.js';

	let { onBack, onRoomCreated, onRoomJoined } = $props();

	let joinCode = $state('');
	let joinError = $state('');
	let createdCode = $state('');
	let waiting = $state(false);
	let joining = $state(false);
	let copyIcon = $state('content_copy');

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
</style>

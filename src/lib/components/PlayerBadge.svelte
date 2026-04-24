<script>
	let { position = 'top', label = '', pieceSymbol = '♚', isMe = false, pieceColor = '#2d2d2d' } = $props();
</script>

<div class="player-badge-container {position}">
	<div class="player-badge" class:bottom={position === 'bottom'}>
		<span class="badge-piece" style:color={pieceColor}>{pieceSymbol}</span>
		<span class="badge-label">{label}</span>
		{#if isMe}
			<span class="badge-you">YOU</span>
		{/if}
	</div>
</div>

<style>
	.player-badge-container {
		width: min(90vw, 500px);
		display: flex;
		justify-content: center;
	}

	.player-badge-container.top { margin-bottom: 8px; }
	.player-badge-container.bottom { margin-top: 8px; }

	.player-badge {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 6px 16px;
		background: var(--md-sys-color-surface);
		border-radius: 20px;
		border: 1px solid var(--md-sys-color-outline);
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--md-sys-color-on-surface-variant);
		min-width: 140px;
		box-shadow: var(--md-elevation-1);
		opacity: 0.85;
	}

	.player-badge.bottom {
		background: var(--md-sys-color-secondary-container);
		color: var(--md-sys-color-on-secondary-container);
		border-color: var(--md-sys-color-primary);
		opacity: 1;
	}

	.badge-piece {
		font-size: 1.4rem;
		line-height: 1;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
	}

	.badge-label {
		font-weight: 700;
		font-size: 0.78rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		flex: 1;
	}

	.badge-you {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
		padding: 2px 8px;
		border-radius: 12px;
		text-transform: uppercase;
	}
</style>

<script>
	import { theme } from '$lib/stores/theme.svelte.js';

	let { onTutorial } = $props();
</script>

<header class="app-header">
	<div class="header-title">
		<img src={theme.logoSrc} alt="FLUX Logo" class="app-logo" />
		<div class="header-text">
			<h2>FLUX</h2>
			<p>Chess</p>
		</div>
	</div>
	<div class="header-actions">
		<button class="icon-button" onclick={onTutorial} aria-label="Tutorial">
			<span class="material-symbols-rounded">help</span>
		</button>
		<button class="icon-button" onclick={() => theme.toggle()} aria-label="Toggle Theme">
			<span class="material-symbols-rounded">{theme.themeIcon}</span>
		</button>
	</div>
</header>

<style>
	.app-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 24px;
		background-color: var(--md-sys-color-surface);
		color: var(--md-sys-color-on-surface);
		box-shadow: var(--md-elevation-1);
		transition: background-color 0.3s ease, color 0.3s ease;
	}

	.header-title {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.app-logo {
		height: 40px;
		width: auto;
	}

	.header-text h2 {
		margin: 0;
		font-size: 1.5rem;
		letter-spacing: 0.1em;
		font-weight: 700;
	}

	.header-text p {
		margin: 0;
		font-size: 0.85rem;
		letter-spacing: 0.2em;
		color: var(--md-sys-color-on-surface-variant);
		text-transform: uppercase;
	}

	.header-actions {
		display: flex;
		gap: 8px;
	}

	@media (max-width: 480px) {
		.app-header {
			padding: 8px 16px;
		}
	}
</style>

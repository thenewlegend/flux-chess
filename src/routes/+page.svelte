<script>
	import MainMenu from '$lib/components/Lobby/MainMenu.svelte';
	import { theme } from '$lib/stores/theme.svelte.js';
	import { goto } from '$app/navigation';

	function startLocal() {
		goto('/local');
	}

	function showOnline() {
		goto('/multiplayer');
	}
</script>

<div class="splash-screen">
	<div class="splash-inner unified-lobby">
		<img src={theme.logoSrc} alt="FLUX Chess Logo" class="splash-logo" />
		<div class="text-block">
			<h1>FLUX</h1>
		</div>

		<MainMenu
			onLocal={startLocal}
			onOnline={showOnline}
		/>
	</div>
</div>

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
</style>

<script>
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Particles from '$lib/components/Particles.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { theme } from '$lib/stores/theme.svelte.js';
	import { onMount } from 'svelte';

	let { children } = $props();
	let tutorialOpen = $state(false);

	onMount(() => {
		theme.init();
	});
</script>

<svelte:head>
	<title>FLUX Chess</title>
</svelte:head>

<Particles />

<Header onTutorial={() => { tutorialOpen = true; }} />

{@render children()}

<Toast />

<!-- Tutorial Modal -->
<Modal open={tutorialOpen} title="How to Play" onclose={() => { tutorialOpen = false; }}>
	<div class="tutorial-content">
		<div class="tutorial-step">
			<p>Normal chess rules apply, but there are portals on the board!</p>
		</div>
		<div class="tutorial-step">
			<p>Every few moves, pieces standing on portals swap positions. The portal charge fills up as moves progress.</p>
		</div>
		<div class="tutorial-step">
			<p>If a king is on a portal when it swaps, the king teleports — this can lead to captures!</p>
		</div>
		<div class="tutorial-step">
			<p>Win by checkmate or by capturing the opponent's king through a portal swap.</p>
		</div>
	</div>
	<div class="modal-actions">
		<button class="btn filled" onclick={() => { tutorialOpen = false; }}>Got it!</button>
	</div>
</Modal>

<style>
	.tutorial-content {
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-height: 50vh;
		overflow-y: auto;
		padding-right: 8px;
		scrollbar-width: none;
	}

	.tutorial-content::-webkit-scrollbar { display: none; }

	.tutorial-step p {
		margin: 0;
		line-height: 1.6;
		color: var(--md-sys-color-on-surface-variant);
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 24px;
	}
</style>

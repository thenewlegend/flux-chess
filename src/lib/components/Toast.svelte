<script>
	import { roomState } from '$lib/stores/room.svelte.js';
</script>

{#if roomState.toastVisible}
	<div class="toast" class:visible={roomState.toastVisible}>
		{roomState.toastMessage}
	</div>
{/if}

<style>
	.toast {
		position: fixed;
		bottom: 24px;
		left: 50%;
		transform: translateX(-50%) translateY(16px);
		background: var(--md-sys-color-surface);
		color: var(--md-sys-color-on-surface);
		border: 1px solid var(--md-sys-color-outline);
		padding: 10px 20px;
		border-radius: 24px;
		font-size: 0.9rem;
		font-weight: 500;
		box-shadow: var(--md-elevation-3);
		z-index: 9000;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.3s ease, transform 0.3s ease;
		white-space: nowrap;
	}

	.toast.visible {
		opacity: 1;
		transform: translateX(-50%) translateY(0);
	}
</style>

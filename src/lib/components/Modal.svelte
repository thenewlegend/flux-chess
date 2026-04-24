<script>
	let { open = false, title = '', onclose, children } = $props();
</script>

{#if open}
	<div class="modal-backdrop" onclick={onclose} role="presentation">
		<div class="modal-surface" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
			{#if title}
				<div class="modal-header">
					<h3 class="modal-title">{title}</h3>
					{#if onclose}
						<button class="icon-button" onclick={onclose} aria-label="Close">
							<span class="material-symbols-rounded">close</span>
						</button>
					{/if}
				</div>
			{/if}
			{@render children()}
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1000;
		background-color: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: fadeIn 0.3s ease;
	}

	.modal-surface {
		background-color: var(--md-sys-color-surface);
		color: var(--md-sys-color-on-surface);
		border-radius: 28px;
		padding: 24px;
		width: 90%;
		max-width: 400px;
		box-shadow: var(--md-elevation-3);
		animation: slideUp 0.3s cubic-bezier(0.2, 0, 0, 1);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
	}

	.modal-title {
		margin: 0;
		font-size: 1.35rem;
		font-weight: 500;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes slideUp {
		from { transform: translateY(20px); opacity: 0; }
		to { transform: translateY(0); opacity: 1; }
	}
</style>

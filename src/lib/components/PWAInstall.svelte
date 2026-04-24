<script>
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';

	let deferredPrompt = $state(null);
	let showPrompt = $state(false);
	let isInstalled = $state(false);

	let isIOS = $state(false);

	onMount(() => {
		// Check if already installed
		if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
			isInstalled = true;
		}

		// Detect iOS
		isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

		if (isIOS && !isInstalled) {
			// On iOS, we can't detect beforeinstallprompt, so we show it after a delay
			setTimeout(() => {
				if (sessionStorage.getItem('pwa-prompt-dismissed') !== 'true') {
					showPrompt = true;
				}
			}, 6000);
		}

		window.addEventListener('beforeinstallprompt', (e) => {
			console.log('beforeinstallprompt event fired');
			e.preventDefault();
			deferredPrompt = e;
			setTimeout(() => {
				if (!isInstalled && sessionStorage.getItem('pwa-prompt-dismissed') !== 'true') {
					showPrompt = true;
				}
			}, 3000);
		});

		window.addEventListener('appinstalled', () => {
			// Clear the deferredPrompt so it can be garbage collected
			deferredPrompt = null;
			showPrompt = false;
			isInstalled = true;
			console.log('PWA was installed');
		});
	});

	async function handleInstall() {
		if (!deferredPrompt) return;
		
		// Show the install prompt
		deferredPrompt.prompt();
		
		// Wait for the user to respond to the prompt
		const { outcome } = await deferredPrompt.userChoice;
		console.log(`User response to the install prompt: ${outcome}`);
		
		// We've used the prompt, and can't use it again, throw it away
		deferredPrompt = null;
		showPrompt = false;
	}

	function dismissPrompt() {
		showPrompt = false;
		// Don't show again in this session
		sessionStorage.setItem('pwa-prompt-dismissed', 'true');
	}

	// Check session storage on mount to see if user dismissed it
	onMount(() => {
		if (sessionStorage.getItem('pwa-prompt-dismissed') === 'true') {
			showPrompt = false;
		}
	});
</script>

{#if showPrompt}
	<div class="pwa-install-overlay" transition:fade={{ duration: 300 }}>
		<div class="pwa-card" transition:slide={{ axis: 'y', duration: 400 }}>
			<div class="pwa-header">
				<img src="/img/flux-chess-dark.png" alt="FLUX Chess Logo" class="app-icon" />
				<div class="pwa-info">
					<h3>FLUX Chess</h3>
					<p>Install for a better experience</p>
				</div>
				<button class="close-btn" onclick={dismissPrompt}>
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
				</button>
			</div>
			
			<div class="pwa-features">
				<div class="feature">
					<span class="feature-icon">🚀</span>
					<span>Faster loading</span>
				</div>
				<div class="feature">
					<span class="feature-icon">📱</span>
					<span>Full screen play</span>
				</div>
				<div class="feature">
					<span class="feature-icon">🔋</span>
					<span>Optimized performance</span>
				</div>
			</div>

			<div class="pwa-actions">
				<button class="btn text-btn" onclick={dismissPrompt}>Maybe later</button>
				{#if isIOS}
					<div class="ios-instruction">
						Tap <span class="share-icon">
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
						</span> then <strong>"Add to Home Screen"</strong>
					</div>
				{:else}
					<button class="btn filled install-btn" onclick={handleInstall}>
						Install App
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.pwa-install-overlay {
		position: fixed;
		bottom: 24px;
		left: 0;
		right: 0;
		display: flex;
		justify-content: center;
		align-items: flex-end;
		z-index: 10000;
		padding: 0 16px;
		pointer-events: none;
	}

	.pwa-card {
		width: 100%;
		max-width: 400px;
		background: rgba(15, 15, 15, 0.85);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 20px;
		padding: 20px;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
		pointer-events: auto;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.pwa-header {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.app-icon {
		width: 56px;
		height: 56px;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0,0,0,0.3);
	}

	.pwa-info h3 {
		margin: 0;
		font-size: 1.2rem;
		color: var(--md-sys-color-primary);
	}

	.pwa-info p {
		margin: 4px 0 0;
		font-size: 0.9rem;
		color: var(--md-sys-color-on-surface-variant);
	}

	.close-btn {
		margin-left: auto;
		background: transparent;
		border: none;
		color: var(--md-sys-color-on-surface-variant);
		cursor: pointer;
		padding: 4px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.pwa-features {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 8px 0;
	}

	.feature {
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 0.9rem;
		color: var(--md-sys-color-on-surface);
	}

	.feature-icon {
		font-size: 1.1rem;
	}

	.pwa-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 8px;
	}

	.install-btn {
		padding-left: 32px;
		padding-right: 32px;
		font-weight: 600;
		background: var(--md-sys-color-primary);
		color: var(--md-sys-color-on-primary);
		box-shadow: 0 4px 12px rgba(235, 208, 113, 0.2);
	}

	.ios-instruction {
		font-size: 0.9rem;
		color: var(--md-sys-color-on-surface);
		display: flex;
		align-items: center;
		gap: 8px;
		background: rgba(255, 255, 255, 0.05);
		padding: 8px 16px;
		border-radius: 12px;
	}

	.share-icon {
		display: inline-flex;
		color: #007aff; /* iOS Blue */
	}

	@media (max-width: 480px) {
		.pwa-install-overlay {
			bottom: 16px;
		}
		
		.pwa-card {
			padding: 16px;
			border-radius: 24px;
		}
	}
</style>

import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			injectRegister: 'script',
			manifest: {
				name: 'FLUX Chess',
				short_name: 'FLUX Chess',
				description: 'Chess with portals and teleportation!',
				theme_color: '#000000',
				background_color: '#000000',
				display: 'standalone',
				orientation: 'portrait',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: 'img/flux-chess-dark.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: 'img/flux-chess-dark.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			},
			devOptions: {
				enabled: true,
				suppressWarnings: true,
				type: 'module'
			}
		})
	]
});


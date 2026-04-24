import { browser } from '$app/environment';

const STORAGE_KEY = 'flux-theme';

class ThemeState {
	/** @type {'dark'|'light'} */
	current = $state('dark');

	constructor() {
		if (browser) {
			this.current = /** @type {'dark'|'light'} */ (localStorage.getItem(STORAGE_KEY)) || 'dark';
			
			$effect.root(() => {
				$effect(() => {
					document.documentElement.setAttribute('data-theme', this.current);
					localStorage.setItem(STORAGE_KEY, this.current);
				});
			});
		}
	}

	toggle() {
		this.current = this.current === 'dark' ? 'light' : 'dark';
	}

	get isDark() {
		return this.current === 'dark';
	}

	get logoSrc() {
		return this.current === 'dark' ? '/img/flux-chess-dark.png' : '/img/flux-chess-white.png';
	}

	get themeIcon() {
		return this.current === 'dark' ? 'light_mode' : 'dark_mode';
	}

	init() {
		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', this.current);
		}
	}
}

export const theme = new ThemeState();

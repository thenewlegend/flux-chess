/**
 * Audio manager for chess game sounds.
 * Self-contained — handles loading, caching, and playback.
 */

const SOUND_URLS = {
	move: '/sounds/move.mp3',
	capture: '/sounds/capture.mp3',
	end: '/sounds/game-end.mp3'
};

/** @type {Map<string, HTMLAudioElement>} */
const audioCache = new Map();

function getAudio(key) {
	if (typeof window === 'undefined') return null;
	if (!audioCache.has(key)) {
		const audio = new Audio(SOUND_URLS[key]);
		audio.preload = 'auto';
		audioCache.set(key, audio);
	}
	return audioCache.get(key);
}

export function playMoveSound(isCapture = false) {
	const audio = getAudio(isCapture ? 'capture' : 'move');
	if (audio) {
		audio.currentTime = 0;
		audio.play().catch(() => {});
	}
}

export function playEndSound() {
	const audio = getAudio('end');
	if (audio) {
		audio.currentTime = 0;
		audio.play().catch(() => {});
	}
}

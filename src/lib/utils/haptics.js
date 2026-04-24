/** Vibration API wrapper — safe no-ops when unsupported */

/** @param {number|number[]} pattern */
export function vibrate(pattern) {
	if (typeof navigator !== 'undefined' && navigator.vibrate) {
		navigator.vibrate(pattern);
	}
}

export function vibrateMove() { vibrate(10); }
export function vibrateCapture() { vibrate([25, 20, 25]); }
export function vibrateCheck() { vibrate([40, 50, 40]); }
export function vibrateSwap() { vibrate([60, 40, 80]); }

import crypto from 'node:crypto';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	// Player ID cookie — anonymous identity for room ownership
	let playerId = event.cookies.get('flux_player_id');
	if (!playerId) {
		playerId = crypto.randomUUID();
		event.cookies.set('flux_player_id', playerId, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365 // 1 year
		});
	}
	event.locals.playerId = playerId;

	const response = await resolve(event);

	// Security headers
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=()');

	return response;
}

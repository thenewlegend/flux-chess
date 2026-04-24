import { json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase.js';
import { Chess } from 'chess.js';
import { generatePortalPairs, getRandomInterval } from '$lib/chess/portals.js';

/** POST /api/rooms/[code]/restart — Restart the game (host only) */
export async function POST({ params, locals }) {
	const playerId = locals.playerId;
	if (!playerId) return json({ error: 'No player identity' }, { status: 401 });

	const { code } = params;

	const { data: room, error } = await supabase
		.from('rooms')
		.select('*')
		.eq('code', code.toUpperCase())
		.eq('is_active', true)
		.single();

	if (error || !room) return json({ error: 'Room not found' }, { status: 404 });

	// Only host can restart
	if (room.host_player_id !== playerId) {
		return json({ error: 'Only host can restart' }, { status: 403 });
	}

	// Alternate colors
	const oldHostColor = room.game_state.hostColor || 'w';
	const newHostColor = oldHostColor === 'w' ? 'b' : 'w';

	const chess = new Chess();
	const portalPairs = generatePortalPairs();
	const swapInterval = getRandomInterval();

	const newState = {
		fen: chess.fen(),
		moveCount: 0,
		movesUntilSwap: swapInterval,
		swapInterval,
		portalPairs,
		hostColor: newHostColor,
		gameActive: true,
		statusText: 'White to move.',
		lastMove: null
	};

	await supabase.from('rooms').update({
		game_state: newState,
		host_color: newHostColor,
		last_updated: new Date().toISOString()
	}).eq('id', room.id);

	return json({ success: true, game_state: newState });
}

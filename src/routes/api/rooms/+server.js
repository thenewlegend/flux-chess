import { json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase.js';
import { Chess } from 'chess.js';
import { generatePortalPairs, getRandomInterval } from '$lib/chess/portals.js';
import crypto from 'node:crypto';

/** POST /api/rooms — Create a new room */
export async function POST({ locals }) {
	const playerId = locals.playerId;
	if (!playerId) return json({ error: 'No player identity' }, { status: 401 });

	// Generate secure room code
	const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	let code = '';
	const bytes = crypto.randomBytes(6);
	for (let i = 0; i < 6; i++) {
		code += charset[bytes[i] % charset.length];
	}

	const chess = new Chess();
	const portalPairs = generatePortalPairs();
	const swapInterval = getRandomInterval();

	const gameState = {
		fen: chess.fen(),
		moveCount: 0,
		movesUntilSwap: swapInterval,
		swapInterval,
		portalPairs,
		hostColor: 'w',
		gameActive: true,
		statusText: 'White to move.'
	};

	const { data, error } = await supabase.from('rooms').insert({
		code,
		host_player_id: playerId,
		game_state: gameState,
		host_color: 'w'
	}).select('code').single();

	if (error) {
		console.error('Room creation error:', error);
		return json({ 
			error: 'Database permission error. Ensure you have run the migration.sql in Supabase.',
			code: error.code 
		}, { status: 500 });
	}

	return json({ code: data.code });
}

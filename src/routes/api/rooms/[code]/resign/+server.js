import { json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase.js';

/** POST /api/rooms/[code]/resign — Resign from the game */
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

	const state = room.game_state;
	if (!state.gameActive) return json({ error: 'Game already ended' }, { status: 400 });

	const isHost = room.host_player_id === playerId;
	const isGuest = room.guest_player_id === playerId;
	if (!isHost && !isGuest) return json({ error: 'Not a player' }, { status: 403 });

	// Verify it's their turn
	const hostColor = state.hostColor || 'w';
	const playerColor = isHost ? hostColor : (hostColor === 'w' ? 'b' : 'w');
	const currentTurn = state.fen.split(' ')[1];
	if (currentTurn !== playerColor) {
		return json({ error: 'Can only resign on your turn' }, { status: 403 });
	}

	const loserColor = playerColor === 'w' ? 'White' : 'Black';
	const winnerColor = playerColor === 'w' ? 'Black' : 'White';

	const updatedState = {
		...state,
		gameActive: false,
		statusText: `${loserColor} resigned. ${winnerColor} wins.`
	};

	await supabase.from('rooms').update({
		game_state: updatedState,
		last_updated: new Date().toISOString()
	}).eq('id', room.id);

	return json({ success: true });
}

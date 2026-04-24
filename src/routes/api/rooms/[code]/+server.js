import { json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase.js';

/** GET /api/rooms/[code] — Fetch room state */
export async function GET({ params, locals }) {
	const { code } = params;
	const playerId = locals.playerId;

	const { data, error } = await supabase
		.from('rooms')
		.select('code, game_state, host_color, host_player_id, guest_player_id, is_active')
		.eq('code', code.toUpperCase())
		.eq('is_active', true)
		.single();

	if (error || !data) {
		return json({ error: 'Room not found' }, { status: 404 });
	}

	let currentUserRole = 'none';
	if (data.host_player_id === playerId) currentUserRole = 'host';
	else if (data.guest_player_id === playerId) currentUserRole = 'guest';

	console.log(`[API] Room ${code} - Player ${playerId} - Assigned Role: ${currentUserRole}`);

	return json({
		code: data.code,
		game_state: data.game_state,
		host_color: data.host_color,
		hasHost: !!data.host_player_id,
		hasGuest: !!data.guest_player_id,
		currentUserRole
	});
}

/** DELETE /api/rooms/[code] — Terminate room (Host only) */
export async function DELETE({ params, locals }) {
	const { code } = params;
	const playerId = locals.playerId;

	// Verify room exists and requester is the host
	const { data: room, error } = await supabase
		.from('rooms')
		.select('id, host_player_id')
		.eq('code', code.toUpperCase())
		.eq('is_active', true)
		.single();

	if (error || !room) {
		return json({ error: 'Room not found' }, { status: 404 });
	}

	if (room.host_player_id !== playerId) {
		return json({ error: 'Only the host can terminate the room' }, { status: 403 });
	}

	// Soft delete or hard delete? Let's go with hard delete as requested
	const { error: deleteError } = await supabase
		.from('rooms')
		.delete()
		.eq('id', room.id);

	if (deleteError) {
		return json({ error: 'Failed to terminate room' }, { status: 500 });
	}

	return json({ success: true });
}

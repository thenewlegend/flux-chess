import { json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase.js';

/** POST /api/rooms/[code]/join — Join a room with a role */
export async function POST({ params, locals, request }) {
	const playerId = locals.playerId;
	if (!playerId) return json({ error: 'No player identity' }, { status: 401 });

	const { code } = params;
	const { role } = await request.json();

	const { data: room, error } = await supabase
		.from('rooms')
		.select('*')
		.eq('code', code.toUpperCase())
		.eq('is_active', true)
		.single();

	if (error || !room) {
		return json({ error: 'Room not found' }, { status: 404 });
	}

	if (role === 'host') {
		if (room.host_player_id && room.host_player_id !== playerId) {
			return json({ error: 'Host slot is already taken' }, { status: 403 });
		}
		await supabase.from('rooms').update({ host_player_id: playerId }).eq('id', room.id);
	} else if (role === 'guest') {
		if (room.guest_player_id && room.guest_player_id !== playerId) {
			return json({ error: 'Guest slot is already taken' }, { status: 403 });
		}
		await supabase.from('rooms').update({ guest_player_id: playerId }).eq('id', room.id);
	} else {
		return json({ error: 'Invalid role' }, { status: 400 });
	}

	return json({ role });
}

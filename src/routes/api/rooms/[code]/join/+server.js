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

	let assignedRole = role;

	// If trying to be host but host slot is taken by someone else
	if (role === 'host' && room.host_player_id && room.host_player_id !== playerId) {
		// If guest slot is also taken, force spectator
		if (room.guest_player_id && room.guest_player_id !== playerId) {
			assignedRole = 'spectator';
			return json({ role: assignedRole, forcedRole: 'spectator' });
		}
	}

	// If trying to be guest but guest slot is taken by someone else
	if (role === 'guest' && room.guest_player_id && room.guest_player_id !== playerId) {
		// Both slots taken → spectator only
		if (room.host_player_id && room.host_player_id !== playerId) {
			assignedRole = 'spectator';
			return json({ role: assignedRole, forcedRole: 'spectator' });
		}
	}

	// Assign the player to the appropriate slot
	if (assignedRole === 'host' && (!room.host_player_id || room.host_player_id === playerId)) {
		await supabase.from('rooms').update({ host_player_id: playerId }).eq('id', room.id);
	} else if (assignedRole === 'guest' && (!room.guest_player_id || room.guest_player_id === playerId)) {
		await supabase.from('rooms').update({ guest_player_id: playerId }).eq('id', room.id);
	} else if (assignedRole !== 'spectator') {
		// Both slots taken, force spectator
		assignedRole = 'spectator';
	}

	return json({ role: assignedRole });
}

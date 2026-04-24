import { json } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase.js';
import { validateMove, kingExists, getGameStatus } from '$lib/chess/validation.js';
import { applyPortalSwap, getRandomInterval } from '$lib/chess/portals.js';

/** POST /api/rooms/[code]/move — Validate and apply a move */
export async function POST({ params, locals, request }) {
	const playerId = locals.playerId;
	if (!playerId) return json({ error: 'No player identity' }, { status: 401 });

	const { code } = params;
	const { from, to, promotion = 'q' } = await request.json();

	// Input validation
	if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
		return json({ error: 'Invalid move data' }, { status: 400 });
	}
	if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) {
		return json({ error: 'Invalid square notation' }, { status: 400 });
	}

	// Fetch current room state
	const { data: room, error } = await supabase
		.from('rooms')
		.select('*')
		.eq('code', code.toUpperCase())
		.eq('is_active', true)
		.single();

	if (error || !room) {
		return json({ error: 'Room not found' }, { status: 404 });
	}

	const state = room.game_state;
	if (!state.gameActive) {
		return json({ error: 'Game is not active' }, { status: 400 });
	}

	// Verify player identity — must be host or guest
	const isHost = room.host_player_id === playerId;
	const isGuest = room.guest_player_id === playerId;
	if (!isHost && !isGuest) {
		return json({ error: 'Not a player in this room' }, { status: 403 });
	}

	// Verify it's the player's turn
	const hostColor = state.hostColor || 'w';
	const playerColor = isHost ? hostColor : (hostColor === 'w' ? 'b' : 'w');
	const status = getGameStatus(state.fen);
	if (status.turn !== playerColor) {
		return json({ error: 'Not your turn' }, { status: 403 });
	}

	// Validate the move with chess.js
	const result = validateMove(state.fen, from, to, promotion);
	if (!result.valid) {
		return json({ error: result.error || 'Illegal move' }, { status: 400 });
	}

	// Build updated state
	let newFen = result.fen;
	let moveCount = (state.moveCount || 0) + 1;
	let movesUntilSwap = (state.movesUntilSwap || 1) - 1;
	let swapInterval = state.swapInterval || 3;
	let gameActive = true;
	let statusText = '';

	// Portal swap check
	if (movesUntilSwap <= 0) {
		newFen = applyPortalSwap(newFen, state.portalPairs || []);
		swapInterval = getRandomInterval();
		movesUntilSwap = swapInterval;

		// Check if kings survived the swap
		if (!kingExists(newFen, 'w') || !kingExists(newFen, 'b')) {
			const winner = kingExists(newFen, 'w') ? 'White' : 'Black';
			gameActive = false;
			statusText = `${winner} wins (king lost via portal)`;
		}
	}

	// Check endgame conditions from the move itself
	if (gameActive) {
		// King captured directly
		if (result.move?.captured === 'k') {
			gameActive = false;
			statusText = 'King captured. Game over.';
		} else {
			const newStatus = getGameStatus(newFen);
			if (newStatus.isCheckmate) {
				const winner = newStatus.turn === 'w' ? 'Black' : 'White';
				gameActive = false;
				statusText = `Checkmate! ${winner} wins.`;
			} else if (newStatus.isDraw) {
				gameActive = false;
				statusText = 'Draw!';
			} else if (newStatus.isCheck) {
				const inCheck = newStatus.turn === 'w' ? 'White' : 'Black';
				statusText = `${inCheck} is in check.`;
			} else {
				const toMove = newStatus.turn === 'w' ? 'White' : 'Black';
				statusText = `${toMove} to move.`;
			}
		}
	}

	// Update room in database
	const updatedState = {
		...state,
		fen: newFen,
		moveCount,
		movesUntilSwap,
		swapInterval,
		gameActive,
		statusText
	};

	const { error: updateError } = await supabase
		.from('rooms')
		.update({
			game_state: updatedState,
			last_updated: new Date().toISOString()
		})
		.eq('id', room.id);

	if (updateError) {
		console.error('Move update error:', updateError);
		return json({ error: 'Failed to save move' }, { status: 500 });
	}

	// Also record in moves table
	await supabase.from('moves').insert({
		room_id: room.id,
		player_id: playerId,
		move_number: moveCount,
		from_square: from,
		to_square: to,
		promotion: promotion !== 'q' ? promotion : null,
		fen_after: newFen
	});

	return json({ success: true, game_state: updatedState });
}

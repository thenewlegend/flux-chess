/**
 * Room/multiplayer store using Svelte 5 runes.
 * Manages online room state, role, and realtime subscriptions.
 */
import { supabaseClient } from '$lib/supabase.js';
import { gameState } from '$lib/stores/game.svelte.js';

class RoomState {
	/** @type {string|null} */
	code = $state(null);
	/** @type {'local'|'host'|'guest'|'none'} */
	role = $state('local');
	/** @type {'w'|'b'} */
	hostColor = $state('w');
	/** @type {'white'|'black'} */
	orientation = $state('white');
	/** @type {any} */
	channel = $state(null);
	/** @type {string} */
	toastMessage = $state('');
	toastVisible = $state(false);
	/** @type {number|null} */
	_toastTimeout = null;

	get isOnline() { return this.role !== 'local'; }
	get isHost() { return this.role === 'host'; }
	get canMove() { return this.role === 'local' || this.role === 'host' || this.role === 'guest'; }

	/** Get this player's color */
	get myColor() {
		if (this.role === 'host') return this.hostColor;
		if (this.role === 'guest') return this.hostColor === 'w' ? 'b' : 'w';
		return null;
	}

	/** Whether it's this player's turn */
	get isMyTurn() {
		if (this.role === 'local') return true;
		return gameState.turn === this.myColor;
	}

	/** Create a new room via server API */
	async createRoom() {
		const res = await fetch('/api/rooms', { method: 'POST' });
		if (!res.ok) throw new Error('Failed to create room');
		const data = await res.json();
		this.code = data.code;
		this.role = 'host';
		this.hostColor = 'w';
		this.orientation = 'white';
		gameState.reset();
		this.persistSession();
		this._subscribeRealtime();
		return data.code;
	}

	/** Join a room via server API */
	async joinRoom(code) {
		const res = await fetch(`/api/rooms/${code}`);
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.error || 'Room not found');
		}
		const data = await res.json();
		this.code = code;
		this.hostColor = data.game_state.hostColor || 'w';
		return data;
	}

	/** Pick a role and enter the game */
	async enterWithRole(role) {
		const res = await fetch(`/api/rooms/${this.code}/join`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ role })
		});

		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.error || 'Failed to join');
		} else {
			const data = await res.json();
			this.role = data.role;
		}

		// Set orientation based on role
		if (this.role === 'host') {
			this.orientation = this.hostColor === 'w' ? 'white' : 'black';
		} else if (this.role === 'guest') {
			this.orientation = this.hostColor === 'w' ? 'black' : 'white';
		}

		this.persistSession();
		this._subscribeRealtime();
	}

	/** Send a move to the server for validation */
	async sendMove(from, to, promotion = 'q') {
		if (!this.code) return false;

		const res = await fetch(`/api/rooms/${this.code}/move`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ from, to, promotion })
		});

		if (!res.ok) return false;
		return true;
	}

	/** Send resign action */
	async resign() {
		if (!this.code) return;
		await fetch(`/api/rooms/${this.code}/resign`, {
			method: 'POST'
		});
	}

	/** Send restart action (host only) */
	async restart() {
		if (!this.code || !this.isHost) return;
		await fetch(`/api/rooms/${this.code}/restart`, {
			method: 'POST'
		});
	}

	/** Subscribe to Realtime updates for the room */
	_subscribeRealtime() {
		if (!this.code) return;
		// Clean up existing channel
		if (this.channel) {
			supabaseClient.removeChannel(this.channel);
		}

		this.channel = supabaseClient.channel(`room_${this.code}`);

		// Listen for broadcast events (e.g. player joined)
		this.channel.on(
			'broadcast',
			{ event: 'player_joined' },
			(payload) => {
				// Don't toast for ourselves if we sent it
				if (payload.payload.role !== this.role) {
					const roleName = payload.payload.role === 'host' ? 'Host' : 'Guest';
					this.showToast(`${roleName} has joined the room`);
				}
			}
		);

		// Listen for DB state changes
		this.channel.on(
			'postgres_changes',
			{
				event: 'UPDATE',
				schema: 'public',
				table: 'rooms',
				filter: `code=eq.${this.code}`
			},
			(payload) => {
				if (payload.new?.game_state) {
					const state = payload.new.game_state;
					this.hostColor = state.hostColor || this.hostColor;
					gameState.loadState(state);

					// Update orientation on hostColor change
					if (this.role === 'host') {
						this.orientation = this.hostColor === 'w' ? 'white' : 'black';
					} else if (this.role === 'guest') {
						this.orientation = this.hostColor === 'w' ? 'black' : 'white';
					}

					// Toast notifications
					if (this.isMyTurn && gameState.gameActive) {
						if (gameState.isCheck) {
							import('$lib/chess/sounds.js').then(m => m.playCheckSound());
							this.showToast('You are in check!');
						} else {
							this.showToast('Your turn');
						}
					}
				}
			}
		);

		this.channel.subscribe((status) => {
			if (status === 'SUBSCRIBED' && this.isOnline) {
				this.channel.send({
					type: 'broadcast',
					event: 'player_joined',
					payload: { role: this.role }
				});
			}
		});
	}

	/** Clean up */
	disconnect() {
		if (this.channel) {
			supabaseClient.removeChannel(this.channel);
			this.channel = null;
		}
		this.code = null;
		this.role = 'local';
		this.clearSession();
	}

	flipBoard() {
		this.orientation = this.orientation === 'white' ? 'black' : 'white';
	}

	showToast(message) {
		this.toastMessage = message;
		this.toastVisible = true;
		if (this._toastTimeout) clearTimeout(this._toastTimeout);
		this._toastTimeout = setTimeout(() => {
			this.toastVisible = false;
		}, 2500);
	}
	
	persistSession() {
		if (!this.code || this.role === 'local') return;
		localStorage.setItem('flux_last_room', JSON.stringify({
			code: this.code,
			role: this.role,
			timestamp: Date.now()
		}));
	}

	clearSession() {
		localStorage.removeItem('flux_last_room');
	}

	getStoredSession() {
		try {
			const stored = localStorage.getItem('flux_last_room');
			if (!stored) return null;
			const session = JSON.parse(stored);
			// Expire after 24 hours
			if (Date.now() - session.timestamp > 86400000) {
				this.clearSession();
				return null;
			}
			return session;
		} catch {
			return null;
		}
	}
}

export const roomState = new RoomState();

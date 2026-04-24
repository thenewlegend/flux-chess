# FLUX Chess: Multiplayer Architecture Audit

## 1. Rubric for Evaluation

The following criteria have been established to assess the current multiplayer implementation:

1. **Simplicity & Purpose (20%)**: Does the codebase contain unnecessary features (e.g., Spectator Mode) that complicate the core 2-player game loop?
2. **State Cohesion (20%)**: Are client and server states perfectly synchronized? Does the UI accurately reflect the database reality?
3. **Reconnection Reliability (30%)**: Can players seamlessly refresh or drop/rejoin the session without losing their seat, role, or game state?
4. **Role Integrity (30%)**: Are roles (Host/Guest) securely enforced? Is there any conflicting code causing role overwriting or mismatched local storage?

---

## 2. Findings & Evaluation

### A. Spectator Mode Necessity (Score: Low)
**Finding:** Spectator mode adds significant complexity to role assignment, routing, and UI rendering (e.g., `RoleSelection.svelte`, `/api/rooms/[code]/join/+server.js`). 
**Evaluation:** For a 1v1 private-room chess game, spectator mode is fundamentally **unnecessary** and actively interferes with the re-joining logic by acting as a fallback when role assignment fails. 
**Action:** **Remove Spectator Mode entirely.** 

**Plan to Remove Spectator Mode:**
1. **API**: In `/api/rooms/[code]/join/+server.js`, remove the logic that assigns `spectator` if slots are full. Instead, return a `403 Forbidden` or `{ error: 'Room is full' }` so the client knows they cannot join.
2. **Stores**: Remove all `this.role === 'spectator'` and `this.isSpectator` checks in `room.svelte.js`.
3. **UI Lobby**: Remove the Spectator button from `RoleSelection.svelte`.
4. **Game UI**: Remove spectator checks from endgame popups in `+page.svelte`.

### B. Conflicting Code & Role Mismatches (Score: Medium)
**Finding:** There is conflicting role assignment logic distributed between the client UI (`RoleSelection.svelte`) and the server endpoint (`/api/rooms/[code]/join/+server.js`).
**Evaluation:**
- In `RoleSelection.svelte`, the client attempts to override the user's role to 'spectator' if `hasHost` and `hasGuest` are true, *even before* asking the server. 
- In `OnlineLobby.svelte`, `canRejoin` relies on a local storage `session.role` matching the server's `data.currentUserRole`. However, if the `playerId` cookie changes (or is expired), `data.currentUserRole` defaults to `spectator`. Since we are removing spectator mode, this needs to explicitly deny access instead of silently converting the user to a spectator.

### C. Re-joining Logic Flaws (Score: Critical)
**Finding:** The rejoin flow is manual and fragile. 
**Evaluation:**
1. **No Auto-Rejoin:** When `OnlineLobby.svelte` detects a stored session on mount, it fetches the room data but waits for the user to manually click the "Rejoin" button. A seamless experience should auto-rejoin if the player's cookie still holds the host/guest seat.
2. **Race Conditions in State Sync:** During `handleRejoin()`, the client loads the game state from the initial `joinRoom()` payload, and then calls `enterWithRole()`. However, `enterWithRole()` establishes the realtime subscription, which could overwrite the state with an older or newer payload.
3. **Ghost Sessions:** If a room is deleted or ends on the server, `roomState.getStoredSession()` might still hold the room code. The current try-catch in `OnlineLobby.svelte` clears the session if it receives a `not found` error, which is correct, but doesn't handle the case where the player is rejected for role mismatch properly.

---

## 3. Action Plan & Next Steps

1. **Purge Spectator Mode:**
   - Eradicate "spectator" references in `api/rooms/[code]/join/+server.js`, `api/rooms/[code]/+server.js`, `room.svelte.js`, `RoleSelection.svelte`, and `+page.svelte`.
   - Rooms will strictly be 2-player capacity. Attempts to join a full room will be rejected.

2. **Fix Role Assigment Conflicts:**
   - Remove client-side role forcing in `RoleSelection.svelte`. Trust the server response.
   - Refactor `join/+server.js` to return proper HTTP errors when slots are occupied instead of silently changing roles.

3. **Seamless Reconnection:**
   - Update `OnlineLobby.svelte` so that if `verifyingSession` succeeds and `currentUserRole` matches `session.role` (and `currentUserRole` is not null/'none'), it **automatically** fires `handleRejoin()` and enters the game, bypassing the splash screen entirely.
   - Ensure the server endpoint `api/rooms/[code]/+server.js` sends the exact `currentUserRole` reliably based on `locals.playerId`.

4. **UI Refinements:**
   - Without the Spectator button, the `RoleSelection.svelte` UI should cleanly present just the Host and Guest slots. If a slot is taken by the current user, it should say "Rejoin". If taken by the opponent, it should be disabled.

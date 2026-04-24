# FLUX Chess — Security & Code Quality Audit

Audited: 2026-04-24  
Scope: `index.html`, `script.js`, `style.css`, project architecture

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 4 |
| 🟠 High | 5 |
| 🟡 Medium | 6 |
| 🔵 Low / Info | 5 |

---

## 🔴 Critical

### C1 — Hardcoded Supabase Credentials in Client-Side Code

**File:** [script.js](file:///e:/flux-chess/script.js#L8-L9)

```js
const SUPABASE_URL = 'https://ddrlfuyxrpqaiobbgtfv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIs...';
```

The Supabase URL and anon key are embedded directly in the public JavaScript file. While anon keys are _designed_ to be public, this project has **no Row Level Security (RLS)** configured (see C2), meaning anyone who finds this key can read/write/delete **all rows** in every table.

**Risk:** Full database read/write/delete by any unauthenticated user.  
**Fix:** Migrate to SvelteKit with server-side routes that proxy Supabase calls. Never expose the `service_role` key. Enable RLS on all tables.

---

### C2 — No Row Level Security (RLS) on Supabase Tables

The `rooms` table is accessed entirely from the client with no RLS policies. Any user can:
- Read all rooms and game states
- Overwrite any room's `game_state`
- Delete rooms they don't own

**Risk:** Game tampering, data exfiltration, mass deletion.  
**Fix:** Enable RLS. Create policies scoped to authenticated users and room ownership.

---

### C3 — No Server-Side Game Logic Validation

All game logic (move validation, portal swaps, checkmate detection) runs exclusively client-side in `script.js`. A malicious client can:
- Skip move validation entirely and broadcast arbitrary FEN strings
- Cheat by sending fabricated `game_state` updates directly to Supabase
- Trigger portal swaps at will

**Risk:** Complete integrity loss of multiplayer games.  
**Fix:** Implement server-side move validation via SvelteKit API routes or Supabase Edge Functions.

---

### C4 — Anonymous Auth Without Session Binding

```js
await supabaseClient.auth.signInAnonymously();
```

Anonymous users get full database access. There is **no binding between the anonymous session and the room** — any anonymous user can impersonate any role (host/guest/spectator) in any room.

**Risk:** Session hijacking, role impersonation.  
**Fix:** Bind anonymous sessions to room codes via RLS. Or use proper auth (e.g. magic links, OAuth) in SvelteKit.

---

## 🟠 High

### H1 — XSS via Unsanitized DOM Injection

**File:** [script.js](file:///e:/flux-chess/script.js#L329)

```js
$('#role-room-id').text(`Room: ${roomCode}`);
```

While jQuery `.text()` is safe, there are patterns like `document.getElementById("status").innerText` and direct DOM manipulation throughout. Several places use `.html()` or `innerHTML` patterns that could become XSS vectors if user-controlled data (e.g., room codes, status text from broadcast) is ever injected unsafely.

**Risk:** XSS if any future change uses `.html()` or `innerHTML` with broadcast data.  
**Fix:** Migrate to SvelteKit's template system which auto-escapes by default.

---

### H2 — jQuery Dependency (v3.5.1) — Known CVEs

**File:** [index.html](file:///e:/flux-chess/index.html#L231)

```html
<script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
```

jQuery 3.5.1 has known prototype pollution vulnerabilities. Loading from CDN without `integrity` or `crossorigin` attributes means a CDN compromise could inject malicious code.

**Risk:** Prototype pollution, supply-chain attack.  
**Fix:** Remove jQuery entirely (SvelteKit doesn't need it). If retained, upgrade and add SRI hashes.

---

### H3 — All External Libraries Loaded from CDNs Without SRI

**File:** [index.html](file:///e:/flux-chess/index.html#L10-L234)

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.12.0/chess.min.js"></script>
<script src="https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

No Subresource Integrity (SRI) hashes. CDN compromise = full script injection.

**Risk:** Supply-chain attacks.  
**Fix:** Use npm packages bundled via SvelteKit/Vite. Eliminates CDN dependency entirely.

---

### H4 — Room Code Predictability

**File:** [script.js](file:///e:/flux-chess/script.js#L206-L208)

```js
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
```

`Math.random()` is not cryptographically secure. 6-character alphanumeric codes have only ~2.18 billion combinations and can be brute-forced. No rate limiting exists.

**Risk:** Room enumeration, joining unauthorized games.  
**Fix:** Use `crypto.getRandomValues()` for code generation. Implement rate limiting on room joins via server-side routes.

---

### H5 — No HTTPS Enforcement or CSP Headers

The project is a static HTML site with no Content Security Policy, no HSTS, and no security headers.

**Risk:** Man-in-the-middle attacks, script injection.  
**Fix:** SvelteKit enables CSP headers and HTTPS enforcement via adapter configuration.

---

## 🟡 Medium

### M1 — Client-Side Session Storage in `localStorage`

**File:** [script.js](file:///e:/flux-chess/script.js#L1046-L1051)

```js
localStorage.setItem('flux-room', currentRoom);
localStorage.setItem('flux-role', myRole);
localStorage.setItem('flux-hostColor', hostColor);
```

Room codes and roles are stored in `localStorage`, which is accessible to any script on the same origin (XSS amplification).

**Risk:** Session replay, role tampering.  
**Fix:** Use SvelteKit server-side sessions with httpOnly cookies.

---

### M2 — No Input Validation on Room Code Join

**File:** [script.js](file:///e:/flux-chess/script.js#L292-L323)

The room code input is `.toUpperCase()`'d but not sanitized. No length validation, no character filtering, no rate limiting on join attempts.

**Risk:** Injection attempts, brute-force room enumeration.  
**Fix:** Validate room code format (alphanumeric, fixed length) both client and server-side.

---

### M3 — chess.js v0.12.0 is Deprecated

**File:** [index.html](file:///e:/flux-chess/index.html#L230)

Using `chess.js` version 0.12.0 which is significantly outdated. The API has changed substantially in v1.x.

**Risk:** Unpatched bugs, incompatible API patterns.  
**Fix:** Upgrade to chess.js v1.x as an npm dependency.

---

### M4 — FEN Manipulation Without Validation

**File:** [script.js](file:///e:/flux-chess/script.js#L741-L775)

The portal swap logic directly manipulates FEN strings and calls `game.load(newFen)` without validating the resulting position. Combined with C3 (no server validation), this can produce illegal board states.

**Risk:** Corrupted game state, crashes.  
**Fix:** Add FEN validation after portal swaps. Implement server-side verification.

---

### M5 — `document.execCommand('copy')` Deprecation

**File:** [script.js](file:///e:/flux-chess/script.js#L283)

```js
const successful = document.execCommand('copy');
```

`execCommand` is deprecated and removed from web standards.

**Risk:** Clipboard functionality will break in future browsers.  
**Fix:** Use only `navigator.clipboard.writeText()` (already partially implemented).

---

### M6 — Duplicate CSS Rules

**File:** [style.css](file:///e:/flux-chess/style.css)

Multiple duplicate rule blocks exist:
- `.badge-you` defined twice (lines 359-368 duplicates 348-358)
- `.lobby-menu` defined twice (lines 548-566)
- `.lobby-input` defined twice (lines 575-586 and 664-675)

**Risk:** Maintenance confusion, unexpected style overrides.  
**Fix:** Deduplicate during SvelteKit migration using scoped component styles.

---

## 🔵 Low / Info

### L1 — No Error Boundaries or User Feedback for Network Failures

Supabase operations use `.catch()` or check `error` but mostly just `console.error()`. The user sees no feedback when the network is down or the database is unreachable.

**Fix:** Add user-facing error toasts and retry logic.

---

### L2 — Audio Files Loaded from chess.com CDN

**File:** [index.html](file:///e:/flux-chess/index.html#L225-L227)

Sound effects are hotlinked from `images.chesscomfiles.com`. This could break at any time if chess.com blocks hotlinking.

**Fix:** Self-host audio assets or use open-source alternatives.

---

### L3 — Piece Images Loaded from External Domain

**File:** [script.js](file:///e:/flux-chess/script.js#L976)

```js
pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
```

**Fix:** Bundle piece images as static assets.

---

### L4 — No `<meta>` Description or SEO Tags

**File:** [index.html](file:///e:/flux-chess/index.html#L4-L18)

Missing `<meta name="description">`, Open Graph tags, and favicon.

**Fix:** Add proper SEO metadata in SvelteKit's `+layout.svelte`.

---

### L5 — `user-scalable=no` Hurts Accessibility

**File:** [index.html](file:///e:/flux-chess/index.html#L6)

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

Disabling zoom violates WCAG 2.1 SC 1.4.4 and makes the app inaccessible to users who need to zoom.

**Fix:** Remove `maximum-scale=1.0` and `user-scalable=no`.

---

## Conclusion

The current architecture is a **static HTML/JS site with full client-side trust and no server-side validation**. This makes it fundamentally insecure for multiplayer. Migrating to SvelteKit addresses the majority of these issues by providing:

1. **Server-side API routes** for Supabase access (hides credentials, enables validation)
2. **Auto-escaped templates** (eliminates XSS class)
3. **npm-based dependencies** (eliminates CDN/SRI risks)
4. **CSP headers and security middleware**
5. **Server-side sessions** (replaces localStorage)
6. **Bundled static assets** (eliminates hotlinking)

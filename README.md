# Flux Chess

A modern, fast, and feature-rich real-time multiplayer chess application built with SvelteKit and Supabase.

---

## Preview

<!-- Add image / GIF of the gameplay here -->

---

## Features

* **Real-time Multiplayer**: Seamless online play powered by Supabase.
* **Local Play**: Play against a friend locally with an auto-flip board setting.
* **PWA Support**: Installable as a Progressive Web App for an app-like experience.
* **Modern UI**: Built with a premium aesthetic and sleek animations using Svelte 5.
* **Robust Chess Logic**: Move validation and state management handled reliably via `chess.js`.

---

## Rules

### Setup

* Follows standard FIDE chess rules.
* Players can create a multiplayer room and share the link/code or play locally.

### Gameplay

* All standard moves are supported including En Passant, Castling, and Pawn Promotion (with custom styled dialogs).

### Win Conditions

* Checkmate
* Resignation
* Draw by stalemate, insufficient material, or 50-move rule.

---

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/flux-chess.git

# Navigate to project
cd flux-chess

# Install dependencies
npm install
```

---

## Usage

```bash
# Start the development server
npm run dev

# Or build for production
npm run build
npm run preview
```

---

## Configuration (Optional)

* **Supabase setup**: To use the multiplayer functionality, ensure you have configured your environment variables (e.g., in a `.env` file) with `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`.

---

## Tech Stack

* **Frontend**: [SvelteKit](https://kit.svelte.dev/) (Svelte 5)
* **Backend/Multiplayer**: [Supabase](https://supabase.com/) (Database & Real-time WebSockets)
* **Game Engine**: [chess.js](https://github.com/jhlywa/chess.js) (Chess logic & move validation)
* **PWA**: [Vite PWA](https://vite-pwa-org.netlify.app/)

---

## Project Structure

```text
flux-chess/
 ├── src/
 │   ├── lib/
 │   │   └── components/  # UI components (e.g., Board, Lobby, ChatBox)
 │   ├── routes/          # SvelteKit pages (/local, /multiplayer)
 │   └── app.html         # Main HTML entry point
 ├── static/              # Static assets (PWA icons, etc.)
 ├── package.json
 └── svelte.config.js
```

---

## Core Logic

* **Multiplayer Sync**: Real-time Supabase subscriptions synchronize the board state and chat between host and guest.
* **Session Management**: Persistent player sessions that allow re-entry into ongoing matches without losing progress.

---

## Roadmap

* Implement AI opponent for single-player mode.
* Implement spectator mode for ongoing matches.
* Global leaderboards and user profiles.

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any new features, UI enhancements, or bug fixes.

---

## License

CC NC (Creative Commons Non-Commercial)

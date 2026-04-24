-- FLUX Chess — Supabase Migration
-- Run this in your Supabase SQL Editor

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(8) UNIQUE NOT NULL,
    host_player_id UUID NOT NULL,
    guest_player_id UUID,
    game_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    host_color CHAR(1) NOT NULL DEFAULT 'w' CHECK (host_color IN ('w', 'b')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Move history (server-validated moves)
CREATE TABLE IF NOT EXISTS moves (
    id BIGSERIAL PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    player_id UUID NOT NULL,
    move_number INT NOT NULL,
    from_square VARCHAR(2) NOT NULL,
    to_square VARCHAR(2) NOT NULL,
    promotion VARCHAR(1),
    fen_after TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_moves_room ON moves(room_id);

-- Enable Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;

-- RLS: Anon can SELECT active rooms (needed for Realtime subscriptions)
CREATE POLICY "anon_read_active_rooms" ON rooms
    FOR SELECT TO anon, authenticated
    USING (is_active = true);

-- RLS: Anon can SELECT moves for active rooms
CREATE POLICY "anon_read_moves" ON moves
    FOR SELECT TO anon, authenticated
    USING (room_id IN (SELECT id FROM rooms WHERE is_active = true));

-- All INSERT/UPDATE/DELETE go through server API routes using service_role key
-- No write policies needed for anon/authenticated roles

-- Enable Realtime on rooms table
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

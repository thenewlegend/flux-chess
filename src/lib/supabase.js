import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

/**
 * Client-side Supabase client using anon key.
 * Used ONLY for Realtime channel subscriptions (read-only).
 * All mutations go through server API routes.
 */
export const supabaseClient = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

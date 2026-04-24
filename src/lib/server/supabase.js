import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using service_role key.
 * This bypasses RLS — only use in server routes (src/routes/api/).
 * NEVER import this in client code.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log('Supabase Server Client initialized. URL:', SUPABASE_URL, 'Key length:', SUPABASE_SERVICE_ROLE_KEY?.length);

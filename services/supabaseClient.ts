
import { createClient } from '@supabase/supabase-js';

// Configuration with provided credentials
// NOTE: In a real production build, these should be strictly in .env files.
const supabaseUrl = process.env.SUPABASE_URL || 'https://mjlmrpykezwgqftysyou.supabase.com';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_secret_xY_XrpNKdKdbUUavyt1Ujw_nff45Pcg';

// Validation: Check if key is present and appears to be a valid string (basic sanity check)
const isValidConfig = 
  supabaseUrl && 
  supabaseUrl.startsWith('https://') && 
  supabaseKey && 
  supabaseKey !== 'your-anon-key' && 
  supabaseKey !== 'placeholder';

export const supabase = createClient(
  supabaseUrl,
  isValidConfig ? supabaseKey : 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: { 'x-application-name': 'AutoMateSystem-v3' }
    },
    // Improve retry logic for flaky connections
    db: {
      schema: 'public',
    }
  }
);

/**
 * Helper to check if Supabase is actually connected/configured.
 * Use this before attempting complex queries to fail fast or switch to local mode.
 */
export const isSupabaseConfigured = () => isValidConfig;

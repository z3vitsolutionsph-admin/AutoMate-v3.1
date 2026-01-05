import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase Project URL and Anon Key
// In a real production environment, use process.env.REACT_APP_SUPABASE_URL, etc.
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

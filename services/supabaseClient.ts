
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://depnuqrnqgdvogfsysmn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlcG51cXJucWdkdm9nZnN5c21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDE4NDYsImV4cCI6MjA4MzIxNzg0Nn0.a9ILAz-m4e-_glIp75Y1NMVWztonIUtcG-rBzdV0Pnc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: { 'x-application-name': 'automate-pos-v3' },
  },
});

export const isSupabaseConfigured = () => {
  return SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http');
};

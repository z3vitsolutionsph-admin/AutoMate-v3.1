
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qycwtizguezoqtktzdsw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5Y3d0aXpndWV6b3F0a3R6ZHN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MDAzNjEsImV4cCI6MjA4MzE3NjM2MX0.EtuA180TQLTX95EQPlfZezi3BNl6u0hKqYiF9BErTrc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const isSupabaseConfigured = () => true;

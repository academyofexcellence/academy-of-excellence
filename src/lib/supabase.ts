import { createClient } from '@supabase/supabase-js';

// Fallback to empty string to prevent crashes during initial development 
// before the user has added their new Supabase keys.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

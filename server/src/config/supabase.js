// server/src/config/supabase.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ⚠️ service_role = clé ULTRA sensible → backend ONLY
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  { auth: { persistSession: false } }
);

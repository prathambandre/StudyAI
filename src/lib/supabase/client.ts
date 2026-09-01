import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseAnonKey } from "@/lib/config";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

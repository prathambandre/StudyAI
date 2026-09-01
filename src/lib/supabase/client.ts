import { createBrowserClient } from "@supabase/ssr";
import { supabaseUrl, supabaseAnonKey } from "@/lib/config";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
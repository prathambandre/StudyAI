function isConfigured(value: string | undefined): boolean {
  return (
    !!value &&
    !value.includes("your_") &&
    !value.includes("placeholder") &&
    !value.includes("xxx")
  );
}

// Fallback values so the app can build/run before real credentials are set.
// Replace these in .env.local with your actual Supabase + Gemini keys.
const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = isConfigured(rawSupabaseUrl);
export const supabaseUrl =
  supabaseConfigured && rawSupabaseUrl
    ? rawSupabaseUrl
    : "https://placeholder.supabase.co";
export const supabaseAnonKey =
  isConfigured(rawAnonKey) && rawAnonKey
    ? rawAnonKey
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

export const geminiKey = isConfigured(process.env.GEMINI_API_KEY)
  ? (process.env.GEMINI_API_KEY as string)
  : "";
export const geminiConfigured = geminiKey !== "";

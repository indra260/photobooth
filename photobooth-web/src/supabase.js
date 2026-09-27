import { createClient } from "@supabase/supabase-js";

// Supabase bersifat OPSIONAL: tanpa env, aplikasi tetap jalan (auth nonaktif),
// bukan white screen seperti versi lama yang melempar Error saat module load.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const authEnabled = Boolean(supabaseUrl && supabaseKey);

let client = null;
if (authEnabled) {
  try {
    client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  } catch {
    client = null;
  }
}

// Noop stub supaya pemanggil tidak perlu pengecekan null di tiap titik.
const noop = async () => ({ data: null, error: new Error("Auth tidak dikonfigurasi.") });
export const supabase = client || {
  auth: {
    enabled: false,
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithPassword: noop,
    signUp: noop,
    signOut: noop,
    resetPasswordForEmail: noop,
  },
};

// ─── Supabase project constants ───────────────────────────────────────────────
// The anon/publishable key is safe to ship in mobile apps.
// Never add the service_role key here.

export const SUPABASE_URL = 'https://lahdgyiibfqwpmgghmgk.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_LwxGjcL6N0hwnY731nyQIQ_HcYmWHYZ';

// Minimum gap between background syncs (ms)
export const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Max games fetched per pull-sync page
export const SYNC_PAGE_SIZE = 100;

import { supabase } from './supabaseClient';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Session, User } from '@supabase/supabase-js';

WebBrowser.maybeCompleteAuthSession();

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: string | null;
}

// ─── Email / Password ─────────────────────────────────────────────────────────

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return {
    user: data.user ?? null,
    session: data.session ?? null,
    error: error?.message ?? null,
  };
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return {
    user: data.user ?? null,
    session: data.session ?? null,
    error: error?.message ?? null,
  };
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────
// Uses expo-auth-session to open the browser, then exchanges the code with
// Supabase. Requires the Google provider to be enabled in the Supabase dashboard
// and the redirect URI below added to the allowed list.

export async function signInWithGoogle(): Promise<AuthResult> {
  // Explicitly use the app's native scheme for consistency in production builds
  const redirectUri = 'backlogflow://';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUri,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return { user: null, session: null, error: error?.message ?? 'OAuth URL missing' };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

  if (result.type !== 'success') {
    return { user: null, session: null, error: 'Sign-in was cancelled or failed.' };
  }

  // Parse the tokens from the redirect URL fragment
  const url = result.url;
  const params = new URLSearchParams(url.split('#')[1] ?? url.split('?')[1] ?? '');
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return { user: null, session: null, error: 'Could not extract tokens from redirect.' };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return {
    user: sessionData.user ?? null,
    session: sessionData.session ?? null,
    error: sessionError?.message ?? null,
  };
}

// ─── Session management ───────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

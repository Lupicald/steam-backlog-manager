import { useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOut as authSignOut,
} from '../services/authService';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  // Restore persisted session on mount and listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setState((prev) => ({
        ...prev,
        session: data.session ?? null,
        user: data.session?.user ?? null,
        loading: false,
      }));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({
        ...prev,
        session: session ?? null,
        user: session?.user ?? null,
        loading: false,
      }));
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const result = await signInWithEmail(email, password);
    setState((prev) => ({
      ...prev,
      user: result.user,
      session: result.session,
      error: result.error,
      loading: false,
    }));
    return result;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const result = await signUpWithEmail(email, password);
    setState((prev) => ({
      ...prev,
      user: result.user,
      session: result.session,
      error: result.error,
      loading: false,
    }));
    return result;
  }, []);

  const signInGoogle = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const result = await signInWithGoogle();
    setState((prev) => ({
      ...prev,
      user: result.user,
      session: result.session,
      error: result.error,
      loading: false,
    }));
    return result;
  }, []);

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    await authSignOut();
    setState({ user: null, session: null, loading: false, error: null });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    isAuthenticated: !!state.session,
    signIn,
    signUp,
    signInGoogle,
    signOut,
    clearError,
  };
}

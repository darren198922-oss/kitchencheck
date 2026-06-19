import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { supabase, hasSupabaseEnv } from '@/lib/supabaseClient';

const AuthContext = createContext();

const LOCAL_DEV_AUTH = import.meta.env.VITE_LOCAL_DEV_AUTH === 'true';

const localDevUser = {
  id: 'local-dev-user',
  email: 'local-dev@kitchencheck.test',
  full_name: 'Local Dev User',
  name: 'Local Dev User',
};

const supabasePublicSettings = {
  id: 'kitchencheck-supabase',
  public_settings: {
    name: 'KitchenCheck',
    auth_required: true,
  },
};

function mapSupabaseUser(supabaseUser) {
  const meta = supabaseUser.user_metadata || {};
  const displayName = meta.full_name || meta.name || supabaseUser.email?.split('@')[0] || '';
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    full_name: displayName,
    name: displayName,
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const isLoggingOutRef = useRef(false);

  const clearAuthenticatedState = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthError({
      type: 'auth_required',
      message: 'Please sign in to use KitchenCheck.',
    });
  }, []);

  const applySession = useCallback((session) => {
    if (session?.user) {
      setUser(mapSupabaseUser(session.user));
      setIsAuthenticated(true);
      setAuthError(null);
    } else {
      clearAuthenticatedState();
    }
  }, [clearAuthenticatedState]);

  const checkAppState = useCallback(async () => {
    if (LOCAL_DEV_AUTH) {
      setUser(localDevUser);
      setIsAuthenticated(true);
      setAuthError(null);
      setAppPublicSettings({
        id: 'local-dev-kitchencheck',
        public_settings: {
          name: 'KitchenCheck',
          auth_required: true,
        },
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      return;
    }

    if (!hasSupabaseEnv) {
      setAuthError({
        type: 'missing_env',
        message: 'KitchenCheck Supabase env vars are missing. Supabase auth is disabled.',
      });
      setUser(null);
      setIsAuthenticated(false);
      setAppPublicSettings(null);
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      return;
    }

    setIsLoadingAuth(true);
    setIsLoadingPublicSettings(true);

    try {
      setAppPublicSettings(supabasePublicSettings);
      setIsLoadingPublicSettings(false);

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      applySession(session);
    } catch (err) {
      console.error('Auth check failed:', err);
      setAuthError({
        type: 'auth_error',
        message: err.message || 'Auth check failed.',
      });
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  }, [applySession]);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  useEffect(() => {
    if (LOCAL_DEV_AUTH || !hasSupabaseEnv) return undefined;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isLoggingOutRef.current && event !== 'SIGNED_OUT') {
        return;
      }

      if (event === 'SIGNED_OUT') {
        clearAuthenticatedState();
        setIsLoadingAuth(false);
        return;
      }

      applySession(session);
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, [applySession, clearAuthenticatedState]);

  const login = async (email, password) => {
    if (LOCAL_DEV_AUTH) {
      throw new Error('Login is disabled while local dev auth is enabled.');
    }
    if (!hasSupabaseEnv) {
      throw new Error('KitchenCheck Supabase env vars are missing. Supabase auth is disabled.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message);
    }
    if (data.user) {
      setUser(mapSupabaseUser(data.user));
      setIsAuthenticated(true);
      setAuthError(null);
    }
    return data;
  };

  const signup = async (email, password) => {
    if (LOCAL_DEV_AUTH) {
      throw new Error('Signup is disabled while local dev auth is enabled.');
    }
    if (!hasSupabaseEnv) {
      throw new Error('KitchenCheck Supabase env vars are missing. Supabase auth is disabled.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (error) {
      throw new Error(error.message);
    }

    if (data.session?.user) {
      setUser(mapSupabaseUser(data.session.user));
      setIsAuthenticated(true);
      setAuthError(null);
    }

    return {
      user: data.user,
      session: data.session,
      needsEmailConfirmation: !data.session,
    };
  };

  const requestPasswordReset = async (email) => {
    if (LOCAL_DEV_AUTH) {
      throw new Error('Password reset is disabled while local dev auth is enabled.');
    }
    if (!hasSupabaseEnv) {
      throw new Error('KitchenCheck Supabase env vars are missing. Supabase auth is disabled.');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      throw new Error(error.message);
    }
  };

  const updatePassword = async (password) => {
    if (LOCAL_DEV_AUTH) {
      throw new Error('Password reset is disabled while local dev auth is enabled.');
    }
    if (!hasSupabaseEnv) {
      throw new Error('KitchenCheck Supabase env vars are missing. Supabase auth is disabled.');
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    isLoggingOutRef.current = true;

    try {
      if (LOCAL_DEV_AUTH) {
        clearAuthenticatedState();
        if (import.meta.env.DEV) {
          console.log('KitchenCheck logout completed');
        }
        return { success: true };
      }

      if (!hasSupabaseEnv) {
        clearAuthenticatedState();
        if (import.meta.env.DEV) {
          console.log('KitchenCheck logout completed');
        }
        return { success: true };
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout failed:', error);
        setAuthError({
          type: 'auth_error',
          message: error.message || 'Logout failed.',
        });
        throw new Error(error.message || 'Logout failed.');
      }

      clearAuthenticatedState();

      if (import.meta.env.DEV) {
        console.log('KitchenCheck logout completed');
      }
      return { success: true };
    } finally {
      isLoggingOutRef.current = false;
    }
  };

  const navigateToLogin = () => {
    if (LOCAL_DEV_AUTH) {
      setAuthError({
        type: 'local_dev_auth',
        message: 'Local dev auth is enabled during migration.',
      });
      return;
    }

    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      login,
      signup,
      requestPasswordReset,
      updatePassword,
      logout,
      navigateToLogin,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

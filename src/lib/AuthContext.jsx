import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

const LOCAL_DEV_AUTH = import.meta.env.VITE_LOCAL_DEV_AUTH === 'true';

const localDevUser = {
  id: 'local-dev-user',
  email: 'local-dev@kitchencheck.test',
  full_name: 'Local Dev User',
  name: 'Local Dev User',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
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

    setAuthError({
      type: 'migration_required',
      message: 'Base44 auth has been disabled for migration. Supabase auth is not connected yet.',
    });
    setIsLoadingPublicSettings(false);
    setIsLoadingAuth(false);
    setIsAuthenticated(false);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  const navigateToLogin = () => {
    setAuthError({
      type: 'local_dev_auth',
      message: 'Local dev auth is enabled during migration.',
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
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

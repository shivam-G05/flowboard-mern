import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo } from 'react';
import { authApi } from '../../services/endpoints.js';

export const ME_QUERY_KEY = ['auth', 'me'];

const AuthContext = createContext(null);

/**
 * The session lives in an HTTP-only cookie the browser can't read, so "am I logged in?" is answered
 * by asking the server (GET /api/auth/me). The answer is cached by React Query under ME_QUERY_KEY.
 */
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (err) {
        if (err.status === 401) return null; // not signed in is a normal state, not an error
        throw err;
      }
    },
    staleTime: Infinity,
    retry: false,
  });

  const onSignedIn = (signedInUser) => {
    queryClient.clear(); // never show cached data from a previous account
    queryClient.setQueryData(ME_QUERY_KEY, signedInUser);
  };

  const login = useMutation({ mutationFn: authApi.login, onSuccess: onSignedIn });
  const register = useMutation({ mutationFn: authApi.register, onSuccess: onSignedIn });
  const logout = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(ME_QUERY_KEY, null);
    },
  });

  const value = useMemo(
    () => ({ user: user ?? null, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

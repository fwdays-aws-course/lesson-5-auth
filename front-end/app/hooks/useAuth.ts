import { useState, useEffect } from 'react';
import { getCurrentUser, fetchAuthSession, type AuthUser } from 'aws-amplify/auth';
import { handleSignOut } from '../lib/auth';

/**
 * Custom hook для управління станом аутентифікації
 * 
 * Цей hook надає:
 * - Інформацію про поточного користувача
 * - Стан завантаження
 * - Функції для виходу
 * - JWT токени для API запитів
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tokens, setTokens] = useState<{
    accessToken: string | null;
    idToken: string | null;
  }>({
    accessToken: null,
    idToken: null,
  });

  // Перевіряємо стан аутентифікації при завантаженні
  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Перевіряє, чи користувач авторизований
   * Отримує інформацію про користувача та токени
   */
  const checkAuth = async () => {
    try {
      setLoading(true);
      setError(null);

      // Отримуємо поточного користувача
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      // Отримуємо токени для API запитів
      const session = await fetchAuthSession();
      const accessToken = session.tokens?.accessToken?.toString() || null;
      const idToken = session.tokens?.idToken?.toString() || null;

      setTokens({ accessToken, idToken });
    } catch (err) {
      // Користувач не авторизований
      setUser(null);
      setTokens({ accessToken: null, idToken: null });
      if (err instanceof Error) {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Виходить з системи
   */
  const signOut = async () => {
    try {
      await handleSignOut();
      setUser(null);
      setTokens({ accessToken: null, idToken: null });
    } catch (err) {
      console.error('Помилка виходу:', err);
      if (err instanceof Error) {
        setError(err);
      }
    }
  };

  /**
   * Оновлює токени- корисно після оновлення сесії
   */
  const refreshTokens = async () => {
    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      const accessToken = session.tokens?.accessToken?.toString() || null;
      const idToken = session.tokens?.idToken?.toString() || null;
      setTokens({ accessToken, idToken });
    } catch (err) {
      console.error('Помилка оновлення токенів:', err);
    }
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    tokens,
    signOut,
    refreshTokens,
    checkAuth,
  };
}


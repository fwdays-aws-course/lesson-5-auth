import { Navigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';

/**
 * Компонент для захисту маршрутів
 * 
 * AuthGuard перевіряє, чи користувач авторизований перед доступом до захищеного маршруту
 * Якщо користувач не авторизований, перенаправляє на сторінку входу
 * 
 * @example
 * <Route path="/dashboard" element={
 *   <AuthGuard>
 *     <Dashboard />
 *   </AuthGuard>
 * } />
 */
interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function AuthGuard({ children, redirectTo = '/login' }: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth();

  // Показуємо індикатор завантаження під час перевірки аутентифікації
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Перевірка авторизації...</p>
        </div>
      </div>
    );
  }

  // Якщо користувач не авторизований, перенаправляємо на сторінку входу
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Якщо користувач авторизований, показуємо захищений контент
  return <>{children}</>;
}


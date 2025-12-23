import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { AuthGuard } from '../components/AuthGuard';
import { getProtectedData } from '../lib/api';
import type { Route } from './+types/dashboard';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Dashboard - AWS Cognito Auth Course' },
    { name: 'description', content: 'Захищена сторінка dashboard' },
  ];
}

/**
 * Захищена сторінка Dashboard
 * 
 * Демонструє:
 * - Захищені маршрути через AuthGuard
 * - Використання JWT токенів для API запитів
 * - Відображення інформації про користувача
 * - Взаємодію з захищеними API endpoints
 */
function DashboardContent() {
  const { user, signOut, tokens } = useAuth();
  const navigate = useNavigate();
  const [apiData, setApiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Завантажуємо дані з захищеного API при монтуванні компонента
  useEffect(() => {
    loadProtectedData();
  }, []);

  const loadProtectedData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Отримуємо дані з захищеного endpoint
      const data = await getProtectedData();
      setApiData(data);
    } catch (err: any) {
      console.error('Помилка завантаження даних:', err);
      setError(err.message || 'Помилка завантаження даних');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  AWS Cognito Auth Course
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/dashboard"
                  className="border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Профіль
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">
                {user?.username || user?.signInDetails?.loginId}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Вийти
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Ласкаво просимо до Dashboard!
            </h2>

            {/* Інформація про користувача */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Інформація про користувача
              </h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">User ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user?.userId}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Username</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {user?.username || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Access Token (наявність)
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {tokens.accessToken ? '✅ Наявний' : '❌ Відсутній'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    ID Token (наявність)
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {tokens.idToken ? '✅ Наявний' : '❌ Відсутній'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Дані з захищеного API */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Дані з захищеного API
                </h3>
                <button
                  onClick={loadProtectedData}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Завантаження...' : 'Оновити'}
                </button>
              </div>

              {loading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              )}

              {error && (
                <div className="rounded-md bg-red-50 p-4 mb-4">
                  <div className="text-sm text-red-800">{error}</div>
                </div>
              )}

              {apiData && !loading && (
                <div className="bg-gray-50 rounded-md p-4">
                  <pre className="text-sm text-gray-800 overflow-x-auto">
                    {JSON.stringify(apiData, null, 2)}
                  </pre>
                </div>
              )}

              {!apiData && !loading && !error && (
                <p className="text-gray-500 text-sm">
                  Натисніть "Оновити" для завантаження даних
                </p>
              )}
            </div>

            {/* Інформація про JWT токени */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
              <h3 className="text-lg font-medium text-blue-900 mb-2">
                Про JWT токени
              </h3>
              <p className="text-sm text-blue-800">
                JWT (JSON Web Token) токени використовуються для авторизації API запитів.
                Access Token передається в заголовку Authorization при кожному запиті до
                захищеного endpoint. Токени автоматично оновлюються Amplify Auth при
                необхідності.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Обгортаємо компонент в AuthGuard для захисту маршруту
export default function Dashboard() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}


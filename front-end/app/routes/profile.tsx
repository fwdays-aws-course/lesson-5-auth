import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { AuthGuard } from '../components/AuthGuard';
import { getUserProfile } from '../lib/api';
import type { Route } from './+types/profile';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Профіль - AWS Cognito Auth Course' },
    { name: 'description', content: 'Сторінка профілю користувача' },
  ];
}

/**
 * Сторінка профілю користувача
 * 
 * Демонструє:
 * - Відображення інформації про користувача
 * - Налаштування MFA (Multi-Factor Authentication)
 * - Оновлення профілю
 * - Роботу з Cognito User Attributes
 */
function ProfileContent() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getUserProfile();
      setProfile(data);
    } catch (err: any) {
      console.error('Помилка завантаження профілю:', err);
      setError(err.message || 'Помилка завантаження профілю');
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
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
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
          <div className="bg-white shadow rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Профіль користувача
            </h2>

            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-4 mb-6">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            {profile && !loading && (
              <div className="space-y-6">
                {/* Основна інформація */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Основна інформація
                  </h3>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">User ID</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {profile.profile?.userId || user?.userId}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {profile.profile?.email || 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Username</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {profile.profile?.username || user?.username || 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Групи</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {profile.profile?.groups?.length > 0
                          ? profile.profile.groups.join(', ')
                          : 'Немає груп'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* MFA налаштування */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Multi-Factor Authentication (MFA)
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    MFA додає додатковий рівень безпеки до вашого акаунту. Після введення
                    паролю вам потрібно буде ввести код з SMS або додатку для аутентифікації.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Примітка:</strong> Налаштування MFA потребує додаткової
                      інтеграції з Cognito. Для навчальних цілей MFA налаштовано як опціональне
                      в User Pool.
                    </p>
                  </div>
                </div>

                {/* Детальна інформація з API */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Детальна інформація з API
                  </h3>
                  <div className="bg-gray-50 rounded-md p-4">
                    <pre className="text-sm text-gray-800 overflow-x-auto">
                      {JSON.stringify(profile, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Обгортаємо компонент в AuthGuard для захисту маршруту
export default function Profile() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}


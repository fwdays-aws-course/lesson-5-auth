import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { handleSignIn } from '../lib/auth';
import { SocialLogin } from '../components/SocialLogin';
import type { Route } from './+types/login';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Вхід - AWS Cognito Auth Course' },
    { name: 'description', content: 'Сторінка входу в систему' },
  ];
}

/**
 * Сторінка входу
 * 
 * Демонструє:
 * - Вхід через email/username та пароль
 * - Обробку помилок аутентифікації
 * - Інтеграцію з AWS Cognito через Amplify Auth
 * - Соціальний вхід (Google, Facebook)
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Перевіряємо, чи є повідомлення про успіх у location state
  useEffect(() => {
    const state = location.state as any;
    if (state?.message) {
      setSuccessMessage(state.message);
      // Очищаємо state після відображення
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await handleSignIn({ username, password });

      if (result.isSignedIn) {
        // Успішний вхід - перенаправляємо на dashboard
        navigate('/dashboard');
      } else if (result.nextStep) {
        // Можливо потрібна додаткова верифікація (MFA, тощо)
        if (result.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE') {
          navigate('/verify-mfa', { state: { username } });
        } else {
          setError('Потрібна додаткова верифікація');
        }
      }
    } catch (err: any) {
      console.error('Помилка входу:', err);
      
      // Обробка різних типів помилок
      if (err.name === 'NotAuthorizedException') {
        setError('Невірний email/username або пароль');
      } else if (err.name === 'UserNotConfirmedException') {
        setError('Акаунт не підтверджено. Перевірте email для коду підтвердження або перейдіть на сторінку підтвердження.');
        // Можна додати посилання на сторінку підтвердження
      } else if (err.name === 'UserNotFoundException') {
        setError('Користувача не знайдено');
      } else if (err.message?.includes('already') || err.message?.includes('signed in')) {
        // Якщо користувач вже увійшов, перенаправляємо на dashboard
        navigate('/dashboard');
        return;
      } else {
        setError(err.message || 'Помилка входу. Спробуйте ще раз.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Вхід в систему
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Або{' '}
            <Link
              to="/signup"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              створіть новий акаунт
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {successMessage && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">{successMessage}</h3>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Email або Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email або Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Забули пароль?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Вхід...' : 'Увійти'}
            </button>
          </div>

          <SocialLogin />
        </form>
      </div>
    </div>
  );
}


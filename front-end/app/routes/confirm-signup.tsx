import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { handleConfirmSignUp, handleResendSignUpCode } from '../lib/auth';
import type { Route } from './+types/confirm-signup';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Підтвердження реєстрації - AWS Cognito Auth Course' },
    { name: 'description', content: 'Підтвердження email адреси' },
  ];
}

/**
 * Сторінка підтвердження реєстрації
 * 
 * Демонструє:
 * - Підтвердження email через код верифікації
 * - Повторну відправку коду
 * - Обробку помилок
 */
export default function ConfirmSignUp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Отримуємо username з location state або з форми
  useEffect(() => {
    const stateUsername = (location.state as any)?.username;
    if (stateUsername) {
      setUsername(stateUsername);
    }
  }, [location]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!username) {
      setError('Будь ласка, введіть username');
      setLoading(false);
      return;
    }

    if (!code || code.length !== 6) {
      setError('Код підтвердження повинен містити 6 символів');
      setLoading(false);
      return;
    }

    try {
      const result = await handleConfirmSignUp({
        username,
        confirmationCode: code,
      });

      if (result.isSignUpComplete) {
        setSuccess(true);
        // Перенаправляємо на сторінку входу після успішного підтвердження
        setTimeout(() => {
          navigate('/login', {
            state: { message: 'Email успішно підтверджено! Тепер ви можете увійти.' },
          });
        }, 2000);
      }
    } catch (err: any) {
      console.error('Помилка підтвердження реєстрації:', err);

      // Обробка різних типів помилок
      if (err.name === 'CodeMismatchException') {
        setError('Невірний код підтвердження');
      } else if (err.name === 'ExpiredCodeException') {
        setError('Код підтвердження застарів. Запросіть новий код.');
      } else if (err.name === 'UserNotFoundException') {
        setError('Користувача не знайдено');
      } else if (err.name === 'NotAuthorizedException') {
        setError('Акаунт вже підтверджено або не потребує підтвердження');
      } else {
        setError(err.message || 'Помилка підтвердження реєстрації. Спробуйте ще раз.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!username) {
      setError('Будь ласка, введіть username');
      return;
    }

    setResending(true);
    setError(null);

    try {
      await handleResendSignUpCode(username);
      setError(null);
      alert('Код підтвердження відправлено на ваш email');
    } catch (err: any) {
      console.error('Помилка повторної відправки коду:', err);
      setError(err.message || 'Помилка відправки коду. Спробуйте ще раз.');
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Email успішно підтверджено! Перенаправлення на сторінку входу...
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Підтвердження реєстрації
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Введіть код підтвердження, який було відправлено на ваш email
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Код підтвердження
              </label>
              <input
                id="code"
                name="code"
                type="text"
                required
                maxLength={6}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-center text-2xl tracking-widest"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
              <p className="mt-1 text-xs text-gray-500">
                Введіть 6-значний код з email
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending || !username}
              className="text-sm font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? 'Відправка...' : 'Відправити код ще раз'}
            </button>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Підтвердження...' : 'Підтвердити'}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Повернутися до входу
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

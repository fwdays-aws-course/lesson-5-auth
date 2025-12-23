import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router';
import { handleSignUp } from '../lib/auth';
import { SocialLogin } from '../components/SocialLogin';
import type { Route } from './+types/signup';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Реєстрація - AWS Cognito Auth Course' },
    { name: 'description', content: 'Сторінка реєстрації нового користувача' },
  ];
}

/**
 * Сторінка реєстрації
 * 
 * Демонструє:
 * - Реєстрацію нового користувача
 * - Валідацію форми
 * - Email верифікацію (якщо налаштована)
 * - Обробку помилок
 */
export default function SignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Валідація паролів
    if (formData.password !== formData.confirmPassword) {
      setError('Паролі не співпадають');
      setLoading(false);
      return;
    }

    // Валідація мінімальної довжини паролю
    if (formData.password.length < 8) {
      setError('Пароль повинен містити мінімум 8 символів');
      setLoading(false);
      return;
    }

    try {
      const result = await handleSignUp({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      if (result.isSignUpComplete) {
        // Реєстрація завершена (email автоматично підтверджено) - перенаправляємо на login
        setSuccess(true);
        setTimeout(() => {
          navigate('/login', {
            state: { message: 'Реєстрація успішна! Тепер ви можете увійти.' },
          });
        }, 2000);
      } else if (result.nextStep) {
        // Потрібна верифікація email
        if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
          // Перенаправляємо на сторінку підтвердження
          navigate('/confirm-signup', {
            state: { username: formData.username },
          });
        } else {
          // Інший крок - показуємо повідомлення
          setSuccess(true);
          setError('Перевірте email для підтвердження реєстрації');
        }
      } else {
        // Якщо nextStep відсутній, але isSignUpComplete = false, все одно перенаправляємо на підтвердження
        navigate('/confirm-signup', {
          state: { username: formData.username },
        });
      }
    } catch (err: any) {
      console.error('Помилка реєстрації:', err);

      // Обробка різних типів помилок
      if (err.name === 'UsernameExistsException') {
        setError('Користувач з таким username вже існує');
      } else if (err.name === 'InvalidPasswordException') {
        setError('Пароль не відповідає вимогам безпеки');
      } else if (err.name === 'InvalidParameterException') {
        setError('Невірні дані. Перевірте правильність введення.');
      } else {
        setError(err.message || 'Помилка реєстрації. Спробуйте ще раз.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Реєстрація успішна! Перенаправлення...
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
            Створення акаунту
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Або{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              увійдіть в існуючий акаунт
            </Link>
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
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Мінімум 8 символів"
                value={formData.password}
                onChange={handleChange}
              />
              <p className="mt-1 text-xs text-gray-500">
                Пароль повинен містити: великі та малі літери, цифри, спеціальні символи
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Підтвердження паролю
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Повторіть пароль"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Реєстрація...' : 'Зареєструватися'}
            </button>
          </div>

          <SocialLogin />
        </form>
      </div>
    </div>
  );
}


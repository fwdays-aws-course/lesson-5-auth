import { Amplify } from 'aws-amplify';
import { signIn, signUp, signOut, confirmSignUp, resendSignUpCode, 
  getCurrentUser, fetchAuthSession, updatePassword, 
  resetPassword, confirmResetPassword, updateUserAttributes } from 'aws-amplify/auth';

/**
 * Get configuration from runtime (window.APP_CONFIG) or build-time environment variables
 * Runtime config takes precedence to support dynamic deployments
 */
function getConfig(key: string): string | undefined {
  // Check for runtime config first (set by CDK deployment)
  if (typeof window !== 'undefined' && (window as any).APP_CONFIG) {
    const runtimeValue = (window as any).APP_CONFIG[key];
    if (runtimeValue) {
      return runtimeValue;
    }
  }
  
  // Fall back to build-time environment variables
  return (import.meta.env as any)[key];
}

/**
 * Конфігурація AWS Amplify Auth
 * 
 * Amplify Auth - це бібліотека для інтеграції з AWS Cognito
 * Вона надає простий API для:
 * - Реєстрації користувачів
 * - Входу/виходу
 * - Управління паролями
 * - MFA (Multi-Factor Authentication)
 * - Соціального входу
 * 
 * Конфігурація читається з runtime config або змінних оточення
 */
export function configureAuth() {
  const userPoolId = getConfig('VITE_USER_POOL_ID');
  const userPoolClientId = getConfig('VITE_USER_POOL_CLIENT_ID');

  if (!userPoolId || !userPoolClientId) {
    console.warn('Cognito конфігурація не знайдена. Перевірте змінні оточення або runtime config.');
    return;
  }

  const config: any = {
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        // Налаштування для OAuth (соціальний вхід)
        loginWith: {
          // Дозволяємо вхід через email/username та пароль
          email: true,
          username: true,
        },
      },
    },
    API: {
      REST: {
        api: {
          endpoint: getConfig('VITE_API_URL') || 'http://localhost:3000',
        },
      },
    },
  };

  // Add OAuth config if domain is provided
  let cognitoDomain = getConfig('VITE_COGNITO_DOMAIN');
  if (cognitoDomain) {
    // Ensure domain doesn't include https:// prefix (Amplify expects just the domain)
    cognitoDomain = cognitoDomain.replace(/^https?:\/\//, '');
    
    // Determine redirect URLs based on current environment
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const redirectSignIn = getConfig('VITE_REDIRECT_SIGN_IN') || `${currentOrigin}/callback`;
    const redirectSignOut = getConfig('VITE_REDIRECT_SIGN_OUT') || currentOrigin;
    
    config.Auth.Cognito.loginWith.oauth = {
      domain: cognitoDomain,
      scopes: ['email', 'openid', 'profile'],
      redirectSignIn: [redirectSignIn],
      redirectSignOut: [redirectSignOut],
      responseType: 'code',
    };
    
    console.log('OAuth configured with domain:', cognitoDomain);
    console.log('Redirect Sign In:', redirectSignIn);
    console.log('Redirect Sign Out:', redirectSignOut);
  } else {
    console.warn('VITE_COGNITO_DOMAIN not configured. Social login (Google) will not work.');
  }

  Amplify.configure(config);
}

/**
 * Check if OAuth/Social login is configured
 */
export function isOAuthConfigured(): boolean {
  const cognitoDomain = getConfig('VITE_COGNITO_DOMAIN');
  return Boolean(cognitoDomain && cognitoDomain.trim().length > 0);
}

/**
 * Типи для аутентифікації
 */
export interface SignUpParams {
  username: string;
  password: string;
  email: string;
}

export interface SignInParams {
  username: string;
  password: string;
}

export interface ConfirmSignUpParams {
  username: string;
  confirmationCode: string;
}

/**
 * Функції для роботи з аутентифікацією
 * Обгортки навколо Amplify Auth API з обробкою помилок
 */

// Реєстрація нового користувача
export async function handleSignUp({ username, password, email }: SignUpParams) {
  try {
    // Перевіряємо, чи користувач вже увійшов
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        // Якщо користувач вже увійшов, виходимо перед реєстрацією
        await signOut();
      }
    } catch (err) {
      // Користувач не увійшов - продовжуємо з реєстрацією
    }

    const { isSignUpComplete, userId, nextStep } = await signUp({
      username,
      password,
      options: {
        userAttributes: {
          email,
        },
        // Не використовуємо autoSignIn, щоб дозволити email верифікацію
        // Якщо email автоматично підтверджений (autoVerify: true в Cognito),
        // то isSignUpComplete буде true і користувач зможе увійти
      },
    });

    return { success: true, isSignUpComplete, userId, nextStep };
  } catch (error: any) {
    console.error('Помилка реєстрації:', error);
    throw error;
  }
}

// Вхід користувача
export async function handleSignIn({ username, password }: SignInParams) {
  try {
    // Перевіряємо, чи користувач вже увійшов
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        // Користувач вже увійшов - повертаємо успіх
        const session = await fetchAuthSession();
        return { 
          success: true, 
          isSignedIn: true, 
          nextStep: null,
          alreadySignedIn: true 
        };
      }
    } catch (err) {
      // Користувач не увійшов - продовжуємо з входом
    }

    const { isSignedIn, nextStep } = await signIn({
      username,
      password,
    });

    return { success: true, isSignedIn, nextStep };
  } catch (error: any) {
    console.error('Помилка входу:', error);
    // Обробка помилки "There is already a signed in user"
    if (error.message?.includes('already') || error.message?.includes('signed in')) {
      // Спробуємо отримати поточного користувача
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          return { 
            success: true, 
            isSignedIn: true, 
            nextStep: null,
            alreadySignedIn: true 
          };
        }
      } catch (err) {
        // Якщо не вдалося отримати користувача, виходимо і пробуємо вийти
        try {
          await signOut();
        } catch (signOutErr) {
          // Ігноруємо помилки виходу
        }
      }
    }
    throw error;
  }
}

// Підтвердження реєстрації (email верифікація)
export async function handleConfirmSignUp({ username, confirmationCode }: ConfirmSignUpParams) {
  try {
    const { isSignUpComplete, nextStep } = await confirmSignUp({
      username,
      confirmationCode,
    });

    return { success: true, isSignUpComplete, nextStep };
  } catch (error: any) {
    console.error('Помилка підтвердження реєстрації:', error);
    throw error;
  }
}

// Повторна відправка коду підтвердження
export async function handleResendSignUpCode(username: string) {
  try {
    await resendSignUpCode({ username });
    return { success: true };
  } catch (error: any) {
    console.error('Помилка повторної відправки коду:', error);
    throw error;
  }
}

// Вихід
export async function handleSignOut() {
  try {
    await signOut();
    return { success: true };
  } catch (error: any) {
    console.error('Помилка виходу:', error);
    throw error;
  }
}

// Отримання поточного користувача
export async function getCurrentAuthUser() {
  try {
    const user = await getCurrentUser();
    return { success: true, user };
  } catch (error: any) {
    return { success: false, error };
  }
}

// Отримання сесії з токенами
export async function getAuthSession() {
  try {
    const session = await fetchAuthSession();
    return { success: true, session };
  } catch (error: any) {
    return { success: false, error };
  }
}

// Оновлення паролю
export async function handleUpdatePassword(oldPassword: string, newPassword: string) {
  try {
    await updatePassword({ oldPassword, newPassword });
    return { success: true };
  } catch (error: any) {
    console.error('Помилка оновлення паролю:', error);
    throw error;
  }
}

// Скидання паролю
export async function handleResetPassword(username: string) {
  try {
    const { nextStep } = await resetPassword({ username });
    return { success: true, nextStep };
  } catch (error: any) {
    console.error('Помилка скидання паролю:', error);
    throw error;
  }
}

// Підтвердження скидання паролю
export async function handleConfirmResetPassword(
  username: string,
  confirmationCode: string,
  newPassword: string
) {
  try {
    await confirmResetPassword({
      username,
      confirmationCode,
      newPassword,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Помилка підтвердження скидання паролю:', error);
    throw error;
  }
}

// Оновлення атрибутів користувача
export async function handleUpdateUserAttributes(attributes: Record<string, string>) {
  try {
    await updateUserAttributes({
      userAttributes: attributes,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Помилка оновлення атрибутів:', error);
    throw error;
  }
}


/**
 * API клієнт для взаємодії з бекендом
 * 
 * Використовує Amplify REST API з JWT токенами
 */

import { get, post } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';

// Назва API з конфігурації Amplify
const API_NAME = 'api';

/**
 * Отримує Authorization header з JWT токеном
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const session = await fetchAuthSession();
    // Prefer ID token for "profile-ish" data: it usually contains claims like `email`.
    // (Access token often does NOT include `email`.)
    const token =
      session.tokens?.idToken?.toString() ||
      session.tokens?.accessToken?.toString();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/**
 * Типи відповідей API
 */
interface UserInfo {
  id: string;
  email?: string;
  username?: string;
  groups: string[];
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

// Отримання інформації про поточного користувача
export async function getCurrentUserInfo() {
  const headers = await getAuthHeaders();
  const response = await get({ apiName: API_NAME, path: '/auth/me', options: { headers } }).response;
  return (await response.body.json()) as unknown as { success: boolean; user: UserInfo };
}

// Валідація токену
export async function validateToken() {
  const headers = await getAuthHeaders();
  const response = await post({ apiName: API_NAME, path: '/auth/validate', options: { headers } }).response;
  return (await response.body.json()) as unknown as { success: boolean; message: string; valid: boolean };
}

// Отримання захищених даних
export async function getProtectedData() {
  const headers = await getAuthHeaders();
  const response = await get({ apiName: API_NAME, path: '/protected/data', options: { headers } }).response;
  return (await response.body.json()) as unknown as ApiResponse;
}

// Створення/оновлення даних
export async function saveProtectedData(content: string) {
  const headers = await getAuthHeaders();
  const response = await post({
    apiName: API_NAME,
    path: '/protected/data',
    options: { headers, body: JSON.parse(JSON.stringify({ content })) },
  }).response;
  return (await response.body.json()) as unknown as ApiResponse;
}

// Отримання профілю користувача
export async function getUserProfile() {
  const headers = await getAuthHeaders();
  const response = await get({ apiName: API_NAME, path: '/protected/user-profile', options: { headers } }).response;
  return (await response.body.json()) as unknown as { success: boolean; profile: unknown };
}

// Отримання публічної інформації
export async function getPublicInfo() {
  const response = await get({ apiName: API_NAME, path: '/public/info' }).response;
  return (await response.body.json()) as unknown as { success: boolean; message: string; info: unknown };
}

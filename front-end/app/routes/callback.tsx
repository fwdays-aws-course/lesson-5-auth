import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import "aws-amplify/auth/enable-oauth-listener";

import type { Route } from "./+types/callback";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Callback - AWS Cognito Auth Course" }];
}

/**
 * OAuth callback page.
 *
 * Cognito redirects back here with `code` (auth code grant). Amplify завершить обмін
 * на токени під час ініціалізації/першого запиту. Ми робимо легку перевірку сесії
 * і перекидаємо користувача на dashboard.
 */
export default function Callback() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Завершуємо вхід…");

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // Check for OAuth error in URL params (Cognito returns errors this way)
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    
    if (errorParam) {
      console.error("OAuth error from Cognito:", errorParam, errorDescription);
      setError(`OAuth помилка: ${errorDescription || errorParam}`);
      setDebugInfo(`Error: ${errorParam}\nDescription: ${errorDescription}`);
      return;
    }

    const code = searchParams.get("code");
    if (!code) {
      setError("Відсутній код авторизації в URL.");
      setDebugInfo(
        `Очікувався параметр 'code' у callback URL.\nURL: ${typeof window !== "undefined" ? window.location.href : ""}`
      );
      return;
    }

    (async () => {
      const maxAttempts = 40; // 40 * 250ms = 10s
      let lastErr: unknown = null;

      for (let i = 0; i < maxAttempts && !cancelled; i++) {
        setStatus(`Завершуємо автентифікацію… (${i + 1}/${maxAttempts})`);

        try {
          // Once the OAuth listener exchanges code->tokens, fetchAuthSession will start returning tokens.
          const session = await fetchAuthSession();
          if (session.tokens?.accessToken) {
            // optional: helps ensure user cache is consistent
            await getCurrentUser().catch(() => null);

            if (!cancelled) {
              setStatus("Вхід успішний! Перенаправляємо…");
              // Full reload is intentional: ensures app loads with authenticated state everywhere.
              window.location.replace("/dashboard");
            }
            return;
          }
        } catch (e) {
          lastErr = e;
        }

        await sleep(250);
      }

      if (!cancelled) {
        setError("Не вдалося завершити вхід (токени не отримані).");
        setDebugInfo(
          `OAuth callback отримав code/state, але токени не зʼявилися за 10 секунд.\n` +
            `URL: ${typeof window !== "undefined" ? window.location.href : ""}\n\n` +
            `Last error (if any):\n${JSON.stringify(lastErr, null, 2)}`
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow rounded-lg p-6">
        {!error ? (
          <>
            <div className="flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 text-center">Завершуємо вхід…</h1>
            <p className="mt-2 text-sm text-gray-600 text-center">
              {status}
            </p>
            <p className="mt-4 text-xs text-gray-500 text-center">
              Якщо сторінка не оновлюється — поверніться на{" "}
              <a className="text-blue-600 hover:text-blue-500 underline" href="/login">
                логін
              </a>
              .
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-4">❌ Помилка входу</h1>
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <p className="text-sm font-medium text-red-800">{error}</p>
              {debugInfo && (
                <details className="mt-3 open:mt-3" open>
                  <summary className="text-xs text-red-600 cursor-pointer font-semibold">
                    📋 Технічні деталі (для розробника)
                  </summary>
                  <pre className="mt-2 text-xs text-red-700 whitespace-pre-wrap overflow-auto max-h-64 bg-red-100 p-2 rounded">
                    {debugInfo}
                  </pre>
                </details>
              )}
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <a 
                href="/login" 
                className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                ← Повернутися на сторінку входу
              </a>
              <button
                onClick={() => window.location.reload()}
                className="block w-full text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
              >
                🔄 Спробувати ще раз
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}



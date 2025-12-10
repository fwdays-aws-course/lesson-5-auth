import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Плагін для валідації JWT токенів від AWS Cognito
 * 
 * JWT (JSON Web Token) - це стандартний спосіб передачі інформації про користувача
 * між клієнтом та сервером. Cognito генерує три типи токенів:
 * - ID Token: містить інформацію про користувача (email, username, etc.)
 * - Access Token: використовується для авторизації API запитів
 * - Refresh Token: використовується для отримання нових токенів
 * 
 * Цей плагін валідує Access Token або ID Token, перевіряючи:
 * 1. Підпис токену (використовуючи JWKS endpoint від Cognito)
 * 2. Термін дії токену
 * 3. Аудиторію та видавця токену
 */
export interface AuthPluginOptions {
  userPoolId: string;
  region: string;
}

// Інтерфейс для декодованого JWT токену
export interface DecodedToken {
  sub: string; // User ID
  email?: string;
  'cognito:username'?: string;
  'cognito:groups'?: string[];
  token_use: 'id' | 'access';
  exp: number;
  iat: number;
  aud: string;
  iss: string;
}

// Розширюємо тип FastifyRequest для додавання інформації про користувача
declare module 'fastify' {
  interface FastifyRequest {
    user?: DecodedToken;
  }
}

export default fp<AuthPluginOptions>(async (fastify, opts) => {
  console.log('opts', opts);
  const { userPoolId, region } = opts;

  if (!userPoolId || !region) {
    throw new Error('userPoolId та region обов\'язкові для auth плагіну');
  }

  // JWKS (JSON Web Key Set) - це набір публічних ключів для валідації JWT підписів
  // Cognito надає JWKS endpoint, який містить публічні ключі для перевірки підписів токенів
  const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
  
  const client = jwksClient({
    jwksUri: jwksUrl,
    cache: true, // Кешуємо ключі для покращення продуктивності
    cacheMaxAge: 86400000, // 24 години
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  // Функція для отримання ключа для валідації токену
  const getKey = (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) => {
    if (!header.kid) {
      return callback(new Error('Token header не містить kid (Key ID)'));
    }

    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        return callback(err);
      }
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    });
  };

  // Очікуваний issuer (видавець) токену від Cognito
  const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

  /**
   * Middleware для валідації JWT токену
   * 
   * Використовується як декоратор на маршрутах, які потребують аутентифікації
   * 
   * @example
   * fastify.get('/protected', { preHandler: fastify.authenticate }, async (request, reply) => {
   *   return { message: 'Hello', user: request.user };
   * });
   */
  fastify.decorate('authenticate', async function (
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      // Отримуємо токен з заголовка Authorization
      // Формат: "Bearer <token>"
      const authHeader = request.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Відсутній або невалідний Authorization заголовок',
        });
      }

      const token = authHeader.substring(7); // Видаляємо "Bearer "

      // Валідуємо токен
      // verify() перевіряє:
      // - Підпис токену (використовуючи публічний ключ з JWKS)
      // - Термін дії (exp claim)
      // - Issuer (видавець) - має відповідати Cognito User Pool
      // - Audience (аудиторія) - має відповідати Client ID
      const decoded = await new Promise<DecodedToken>((resolve, reject) => {
        jwt.verify(
          token,
          getKey,
          {
            issuer,
            // audience перевіряється динамічно в getKey функції
            algorithms: ['RS256'], // Cognito використовує RS256 алгоритм
          },
          (err, decoded) => {
            if (err) {
              return reject(err);
            }
            resolve(decoded as DecodedToken);
          }
        );
      });

      // Перевіряємо, що токен є Access Token або ID Token
      if (decoded.token_use !== 'access' && decoded.token_use !== 'id') {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Невідповідний тип токену',
        });
      }

      // Додаємо інформацію про користувача до запиту
      // Тепер у маршрутах можна використовувати request.user
      request.user = decoded;

      // Перевіряємо, що токен не застарів
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp < now) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Токен застарів',
        });
      }
    } catch (error) {
      // Обробка помилок валідації
      if (error instanceof jwt.TokenExpiredError) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Токен застарів',
          code: 'TOKEN_EXPIRED',
        });
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Невірний токен',
          code: 'INVALID_TOKEN',
        });
      }

      fastify.log.error(error, 'Помилка валідації токену');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Помилка валідації токену',
      });
    }
  });
});

// Декларація типу для TypeScript
declare module 'fastify' {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}


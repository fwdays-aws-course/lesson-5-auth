import fp from 'fastify-plugin';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Плагін для валідації JWT токенів від AWS Cognito
 * 
 * Використовує aws-jwt-verify - офіційну бібліотеку від AWS
 * яка автоматично:
 * - Завантажує та кешує JWKS ключі
 * - Валідує підпис токену
 * - Перевіряє термін дії та issuer
 */
export interface AuthPluginOptions {
  userPoolId: string;
  region: string;
  clientId?: string; // Опціонально - для додаткової перевірки audience
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
  aud?: string;
  iss: string;
}

// Розширюємо тип FastifyRequest для додавання інформації про користувача
declare module 'fastify' {
  interface FastifyRequest {
    user?: DecodedToken;
  }
}

export default fp<AuthPluginOptions>(async (fastify, opts) => {
  const { userPoolId, region, clientId } = opts;

  if (!userPoolId || !region) {
    throw new Error('userPoolId та region обов\'язкові для auth плагіну');
  }

  // Створюємо верифікатор для Cognito токенів
  // aws-jwt-verify автоматично кешує JWKS ключі та обробляє ротацію
  const verifier = CognitoJwtVerifier.create({
    userPoolId,
    tokenUse: null, // Приймаємо і access, і id токени
    clientId: clientId || null, // Якщо не вказано - не перевіряємо audience
  });

  /**
   * Middleware для валідації JWT токену
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
      const authHeader = request.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Відсутній або невалідний Authorization заголовок',
        });
      }

      const token = authHeader.substring(7); // Видаляємо "Bearer "

      // Верифікуємо токен - бібліотека автоматично перевіряє:
      // - Підпис (використовуючи JWKS)
      // - Термін дії (exp)
      // - Issuer (iss)
      // - Token use (access/id)
      // - Audience (якщо вказано clientId)
      const payload = await verifier.verify(token);

      // Додаємо інформацію про користувача до запиту
      request.user = payload as unknown as DecodedToken;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Визначаємо тип помилки для правильного повідомлення
      if (errorMessage.includes('expired')) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Токен застарів',
          code: 'TOKEN_EXPIRED',
        });
      }

      fastify.log.error(error, 'Помилка валідації токену');
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Невірний токен',
        code: 'INVALID_TOKEN',
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

import { FastifyPluginAsync } from 'fastify'

/**
 * Маршрути для роботи з аутентифікацією
 * 
 * Ці маршрути допомагають перевірити валідність токенів та отримати інформацію про користувача
 * Основна логіка аутентифікації (логін, реєстрація) відбувається на фронтенді через Amplify Auth
 */
const auth: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // Перевіряємо, чи зареєстровано auth плагін
  const authenticate = fastify.authenticate

  /**
   * GET /auth/me
   * 
   * Повертає інформацію про поточного авторизованого користувача
   * Використовує authenticate middleware для валідації токену
   */
  const meRouteOptions = authenticate
    ? {
        // preHandler виконується перед обробником маршруту
        // authenticate middleware перевіряє JWT токен та додає request.user
        preHandler: [authenticate],
      }
    : {}

  fastify.get(
    '/me',
    meRouteOptions,
    async function (request, reply) {
      if (!authenticate) {
        return reply.code(503).send({
          success: false,
          error: 'Service Unavailable',
          message: 'Аутентифікація не налаштована. Будь ласка, надайте userPoolId та region.',
        })
      }

      // request.user було додано плагіном authenticate після валідації токену
      const user = request.user!

      return {
        success: true,
        user: {
          id: user.sub, // User ID з Cognito
          email: user.email,
          username: user['cognito:username'],
          groups: user['cognito:groups'] || [],
          tokenUse: user.token_use, // 'id' або 'access'
        },
      }
    }
  )

  /**
   * POST /auth/validate
   * 
   * Валідує JWT токен без повернення інформації про користувача
   * Корисно для перевірки валідності токену без отримання даних користувача
   */
  const validateRouteOptions = authenticate
    ? {
        preHandler: [authenticate],
      }
    : {}

  fastify.post(
    '/validate',
    validateRouteOptions,
    async function (request, reply) {
      if (!authenticate) {
        return reply.code(503).send({
          success: false,
          error: 'Service Unavailable',
          message: 'Аутентифікація не налаштована. Будь ласка, надайте userPoolId та region.',
        })
      }

      return {
        success: true,
        message: 'Токен валідний',
        valid: true,
      }
    }
  )

  /**
   * GET /auth/public
   * 
   * Публічний маршрут для демонстрації різниці між захищеними та публічними маршрутами
   * Не потребує аутентифікації
   */
  fastify.get('/public', async function (request, reply) {
    return {
      success: true,
      message: 'Це публічний маршрут - аутентифікація не потрібна',
      timestamp: new Date().toISOString(),
    }
  })
}

export default auth


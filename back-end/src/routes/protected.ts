import { FastifyPluginAsync } from 'fastify'

/**
 * Захищені маршрути API
 *
 * Ці маршрути демонструють, як захищати API endpoints за допомогою JWT токенів
 * Всі маршрути в цьому файлі вимагають валідний JWT токен від Cognito
 */
const protectedRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // Перевіряємо, чи зареєстровано auth плагін
  const authenticate = fastify.authenticate

  /**
   * GET /data
   *
   * Приклад захищеного маршруту, який повертає дані тільки для авторизованих користувачів
   */
  const dataGetRouteOptions = authenticate
    ? {
        preHandler: [authenticate],
      }
    : {}

  fastify.get(
    '/data',
    dataGetRouteOptions,
    async function (request, reply) {
      if (!authenticate) {
        return reply.code(503).send({
          success: false,
          error: 'Service Unavailable',
          message: 'Аутентифікація не налаштована. Будь ласка, надайте userPoolId та region.',
        })
      }

      const user = request.user!

      return {
        success: true,
        message: 'Це захищені дані',
        data: {
          userId: user.sub,
          email: user.email,
          username: user['cognito:username'],
          // Приклад даних, які можна отримати тільки після авторизації
          sensitiveInfo: 'Ця інформація доступна тільки авторизованим користувачам',
        },
        timestamp: new Date().toISOString(),
      }
    }
  )

  /**
   * POST /data
   *
   * Приклад захищеного POST маршруту для створення/оновлення даних
   */
  const dataPostRouteOptions = authenticate
    ? {
        preHandler: [authenticate],
        schema: {
          body: {
            type: 'object',
            properties: {
              content: { type: 'string' },
            },
            required: ['content'],
          },
        },
      }
    : {
        schema: {
          body: {
            type: 'object',
            properties: {
              content: { type: 'string' },
            },
            required: ['content'],
          },
        },
      }

  fastify.post(
    '/data',
    dataPostRouteOptions,
    async function (request, reply) {
      if (!authenticate) {
        return reply.code(503).send({
          success: false,
          error: 'Service Unavailable',
          message: 'Аутентифікація не налаштована. Будь ласка, надайте userPoolId та region.',
        })
      }

      const user = request.user!
      const body = request.body as { content: string }

      // Тут зазвичай відбувається збереження даних у базу даних
      // Для прикладу просто повертаємо підтвердження

      return {
        success: true,
        message: 'Дані успішно збережено',
        data: {
          id: `data-${Date.now()}`,
          content: body.content,
          createdBy: user.sub,
          createdAt: new Date().toISOString(),
        },
      }
    }
  )

  /**
   * GET /user-profile
   *
   * Отримання профілю користувача
   * Демонструє використання інформації з JWT токену
   */
  const userProfileRouteOptions = authenticate
    ? {
        preHandler: [authenticate],
      }
    : {}

  fastify.get(
    '/user-profile',
    userProfileRouteOptions,
    async function (request, reply) {
      if (!authenticate) {
        return reply.code(503).send({
          success: false,
          error: 'Service Unavailable',
          message: 'Аутентифікація не налаштована. Будь ласка, надайте userPoolId та region.',
        })
      }

      const user = request.user!

      return {
        success: true,
        profile: {
          userId: user.sub,
          email: user.email,
          username: user['cognito:username'],
          groups: user['cognito:groups'] || [],
          // Додаткова інформація може бути отримана з бази даних
          // або з Cognito User Pool через AWS SDK
        },
      }
    }
  )

  /**
   * GET /admin
   *
   * Приклад маршруту, який доступний тільки для користувачів з певною групою
   * Демонструє авторизацію на основі груп Cognito
   */
  const adminRouteOptions = authenticate
    ? {
        preHandler: [authenticate],
      }
    : {}

  fastify.get(
    '/admin',
    adminRouteOptions,
    async function (request, reply) {
      if (!authenticate) {
        return reply.code(503).send({
          success: false,
          error: 'Service Unavailable',
          message: 'Аутентифікація не налаштована. Будь ласка, надайте userPoolId та region.',
        })
      }

      const user = request.user!
      const userGroups = user['cognito:groups'] || []

      // Перевіряємо, чи користувач належить до адміністративної групи
      // У реальному додатку групи налаштовуються в Cognito User Pool
      if (!userGroups.includes('admin') && !userGroups.includes('administrators')) {
        return reply.code(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Доступ заборонено. Потрібні права адміністратора.',
        })
      }

      return {
        success: true,
        message: 'Ласкаво просимо до адміністративної панелі',
        adminData: {
          // Приклад адміністративних даних
          totalUsers: 100,
          systemStatus: 'operational',
        },
      }
    }
  )
}

export default protectedRoutes


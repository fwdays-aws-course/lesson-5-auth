import { FastifyPluginAsync } from 'fastify'

/**
 * Публічні маршрути API
 *
 * Ці маршрути доступні без аутентифікації
 * Використовуються для демонстрації різниці між публічними та захищеними endpoints
 */
const publicRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  /**
   * GET /info
   *
   * Повертає загальну інформацію про API
   * Не потребує аутентифікації
   */
  fastify.get('/info', async function (request, reply) {
    return {
      success: true,
      message: 'Це публічний API endpoint',
      info: {
        version: '1.0.0',
        description: 'AWS Cognito Authentication Course API',
        endpoints: {
          public: [
            'GET /public/info',
            'GET /public/health',
          ],
          protected: [
            'GET /protected/data',
            'POST /protected/data',
            'GET /protected/user-profile',
            'GET /protected/admin',
          ],
          auth: [
            'GET /auth/me',
            'POST /auth/validate',
            'GET /auth/public',
          ],
        },
      },
    }
  })

  /**
   * GET /health
   *
   * Health check endpoint для моніторингу стану API
   */
  fastify.get('/health', async function (request, reply) {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }
  })
}

export default publicRoutes


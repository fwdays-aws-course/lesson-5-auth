import { join } from 'node:path'
import AutoLoad, { AutoloadPluginOptions } from '@fastify/autoload'
import { FastifyPluginAsync, FastifyServerOptions } from 'fastify'
import cors from '@fastify/cors'
import authPlugin from './plugins/auth'
import publicRoutes from './routes/public'
import protectedRoutes from './routes/protected'
import authRoutes from './routes/auth'
import rootRoutes from './routes/root'

export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {
  // Опції для Cognito аутентифікації
  userPoolId?: string
  region?: string
}

// Pass --options via CLI arguments in command to enable these options.
// Read configuration from environment variables
const options: AppOptions = {
  userPoolId: process.env.USER_POOL_ID,
  region: process.env.AWS_REGION,
}

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts
): Promise<void> => {
  /**
   * CORS
   *
   * Why this exists:
   * - The frontend calls the backend cross-origin (CloudFront -> App Runner)
   * - Requests with `Authorization` trigger an OPTIONS preflight
   * - Without proper CORS headers on preflight, the browser blocks the request
   *
   * App Runner "easy fix":
   * - Set `CORS_ORIGIN` to the CloudFront URL (comma-separated list supported)
   *   e.g. `https://d21qxpkeqvjscm.cloudfront.net`
   */
  const corsOriginEnv = (process.env.CORS_ORIGIN || '').trim()
  const allowedOrigins = corsOriginEnv
    ? corsOriginEnv.split(',').map((s) => s.trim()).filter(Boolean)
    : []
  const allowAllOrigins = allowedOrigins.length === 0 || allowedOrigins.includes('*')
  const allowCredentials = (process.env.CORS_CREDENTIALS || '').toLowerCase() === 'true'

  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Non-browser clients (curl, health checks) often don't send Origin
      if (!origin) return cb(null, true)
      if (allowAllOrigins) return cb(null, true)
      return cb(null, allowedOrigins.includes(origin))
    },
    // Keep this off by default; turn on only if you truly rely on cookies.
    // (Authorization-header auth does NOT need credentials.)
    credentials: allowCredentials && !allowAllOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    optionsSuccessStatus: 204,
    maxAge: 60 * 60 * 24, // 24h
  })

  // Отримуємо конфігурацію з опцій або змінних оточення
  const userPoolId = opts.userPoolId || process.env.USER_POOL_ID
  const region = opts.region || process.env.AWS_REGION

  // Реєструємо auth плагін, якщо надано конфігурацію
  if (userPoolId && region) {
    await fastify.register(authPlugin, {
      userPoolId,
      region,
    })
  }

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  // Note: auth plugin is excluded as it's registered manually above
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts,
    ignorePattern: /^auth\.(ts|js)$/
  })

  // Register routes with explicit prefixes
  // This ensures routes are accessible at /public/*, /protected/*, and /auth/*
  await fastify.register(publicRoutes, { prefix: '/public' })
  await fastify.register(protectedRoutes, { prefix: '/protected' })
  await fastify.register(authRoutes, { prefix: '/auth' })

  // Root routes (/, /health)
  await fastify.register(rootRoutes)
}

export default app
export { app, options }

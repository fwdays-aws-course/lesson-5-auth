import { join } from 'node:path'
import AutoLoad, { AutoloadPluginOptions } from '@fastify/autoload'
import { FastifyPluginAsync, FastifyServerOptions } from 'fastify'
import cors from '@fastify/cors'
import authPlugin from './plugins/auth'
import publicRoutes from './routes/public'
import protectedRoutes from './routes/protected'
import authRoutes from './routes/auth'

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
  // Реєструємо CORS для дозволу запитів з фронтенду
  // У продакшені краще вказати конкретні домени
  await fastify.register(cors, {
    origin: true, // Дозволяємо всі джерела (для навчальних цілей)
    credentials: true, // Дозволяємо передачу cookies та credentials
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

  // Load other routes (like root.ts, example/) via AutoLoad
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    options: opts,
    ignorePattern: /^(public|protected|auth)\.(ts|js)$/
  })
}

export default app
export { app, options }

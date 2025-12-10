import { FastifyPluginAsync } from 'fastify'

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    return { root: true }
  })

  // Health check endpoint for load balancer
  fastify.get('/health', async function (request, reply) {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })
}

export default root

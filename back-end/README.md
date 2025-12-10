# Backend - Fastify API

Fastify API сервер з JWT валідацією через AWS Cognito.

## Структура

- `src/app.ts` - Головний файл додатку
- `src/plugins/auth.ts` - Плагін для валідації JWT токенів
- `src/routes/` - API маршрути
  - `auth.ts` - Маршрути для аутентифікації
  - `protected.ts` - Захищені маршрути
  - `public.ts` - Публічні маршрути

## Налаштування

### 1. Встановлення залежностей

```bash
npm install
```

### 2. Створення .env файлу

```bash
cp .env.example .env
```

Відредагуйте `.env`:

```env
USER_POOL_ID=us-east-1_XXXXXXXXX
AWS_REGION=us-east-1
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173
```

### 3. Запуск

```bash
# Development mode (з hot reload)
npm run dev

# Production mode
npm start
```

## API Endpoints

### Публічні

- `GET /public/info` - Інформація про API
- `GET /public/health` - Health check

### Аутентифікація

- `GET /auth/me` - Інформація про поточного користувача (потребує JWT)
- `POST /auth/validate` - Валідація токену (потребує JWT)
- `GET /auth/public` - Публічний endpoint

### Захищені

- `GET /protected/data` - Захищені дані (потребує JWT)
- `POST /protected/data` - Створення/оновлення даних (потребує JWT)
- `GET /protected/user-profile` - Профіль користувача (потребує JWT)
- `GET /protected/admin` - Адміністративні дані (потребує JWT та admin групу)

## JWT Валідація

Всі захищені маршрути використовують `fastify.authenticate` middleware:

```typescript
fastify.get('/protected/data', {
  preHandler: [fastify.authenticate],
}, async (request, reply) => {
  // request.user містить декодований JWT токен
  return { data: 'protected' };
});
```

### Як працює валідація

1. Токен читається з заголовка `Authorization: Bearer <token>`
2. Токен валідується через JWKS endpoint від Cognito
3. Перевіряється підпис, термін дії, issuer
4. Декодований токен додається до `request.user`

## Тестування

### Тест публічного endpoint

```bash
curl http://localhost:3000/public/info
```

### Тест захищеного endpoint

```bash
# Отримайте токен з Amplify Auth на фронтенді
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/protected/data
```

## Розробка

### Створення нового маршруту

1. Створіть файл у `src/routes/`
2. Експортуйте FastifyPluginAsync
3. Файл автоматично завантажиться через @fastify/autoload

Приклад:

```typescript
import { FastifyPluginAsync } from 'fastify'

const myRoute: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get('/my-route', async (request, reply) => {
    return { message: 'Hello' }
  })
}

export default myRoute
```

## Додаткова інформація

- [Fastify Documentation](https://fastify.dev/)
- [JWT.io](https://jwt.io/) - для роботи з JWT токенами

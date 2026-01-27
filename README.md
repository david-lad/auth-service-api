# Authentication & Authorization Service

A standalone authentication and authorization backend built with NestJS, PostgreSQL, Prisma, and JWT. Implements role-based access control (RBAC) with secure token practices.

## Features

- JWT authentication with access and refresh tokens
- Role-based authorization (USER, ADMIN)
- Secure password hashing with bcrypt
- Refresh token rotation and revocation
- PostgreSQL + Prisma ORM
- Input validation and sanitization
- Modular architecture

## Tech Stack

- NestJS, TypeScript
- PostgreSQL, Prisma
- Passport JWT
- class-validator

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Setup

1) Install dependencies

```bash
npm install
```

2) Configure environment

```bash
cp .env.example .env
```


```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/auth_db?schema=public

# JWT
JWT_SECRET=replace-in-production
JWT_REFRESH_SECRET=replace-in-production
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d

# App
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
```

3) Initialize database

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

4) Run the service

```bash
npm run start:dev
```

Service runs at http://localhost:3000/api

## API Endpoints

**Authentication**
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET  /api/auth/me

**Users**
- GET    /api/users (admin)
- GET    /api/users/:id (admin)
- PATCH  /api/users/:id (admin)
- DELETE /api/users/:id (admin)
- POST   /api/users/assign-role (admin)
- GET    /api/users/profile (authenticated)

## Security

- bcrypt password hashing
- Short-lived access tokens (15m)
- Long-lived refresh tokens (7d, revocable)
- Separate JWT secrets
- Input validation and whitelisting

## RBAC

Roles: `USER` and `ADMIN`

Guards: `JwtAuthGuard` authenticates, `RolesGuard` enforces permissions

Decorators: `@Public()`, `@Roles(...)`, `@GetUser()`

## Testing

```bash
npm test
npm run test:e2e
```

Demo accounts (after seed):
- admin@example.com / admin123
- user@example.com / user123

## Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

## License

MIT

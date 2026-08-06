# Authentication & Authorization Service

A standalone authentication and authorization backend built with NestJS, PostgreSQL, Prisma, and JWT. Implements role-based access control (RBAC) with secure token practices.

## Features

- JWT authentication with access and refresh tokens
- Role-based authorization (USER, ADMIN)
- Secure password hashing with bcrypt
- Refresh token rotation and revocation
- Rate limiting on auth endpoints
- Account lockout after failed login attempts
- Password strength validation
- Email verification
- Audit logging for security events
- PostgreSQL + Prisma ORM
- Input validation and sanitization
- Modular architecture
- Strict TypeScript configuration

## Tech Stack

- NestJS, TypeScript (strict mode)
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
- POST /api/auth/register — register new user (rate limited: 3/hour)
- POST /api/auth/login — login (rate limited: 5/15min, account lockout after 5 failures)
- POST /api/auth/refresh — refresh tokens
- POST /api/auth/logout — revoke refresh token
- GET  /api/auth/verify-email/:token — verify email address
- POST /api/auth/resend-verification — resend verification token
- GET  /api/auth/me — get current user profile

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
- Rate limiting: 3 registrations/hour, 5 login attempts/15 minutes
- Account lockout: 5 failed attempts triggers 15-minute lock
- Password strength: minimum 8 characters, uppercase, lowercase, number, and special character required
- Email verification on registration

## Password Policy

Passwords must contain at least:
- 8 characters
- 1 uppercase letter
- 1 lowercase letter
- 1 number
- 1 special character (!@#$%^&*...)

## Account Lockout

After 5 consecutive failed login attempts, the account is locked for 15 minutes. The lockout resets on successful login.

## Audit Logging

The service logs security-relevant events to an `audit_logs` table:

- `REGISTER` — new user created
- `LOGIN` — successful login
- `LOGIN_FAILED` — failed login attempt
- `ACCOUNT_LOCKED` — account locked after 5 failures
- `EMAIL_VERIFIED` — email address verified
- `LOGOUT` — user logged out

Each log entry includes: actor ID, action, target ID, IP address, and timestamp.

## RBAC

Roles: `USER` and `ADMIN`

Guards: `JwtAuthGuard` authenticates, `RolesGuard` enforces permissions

Decorators: `@Public()`, `@Roles(...)`, `@GetUser()`

## Testing

```bash
npm test
npm run test:e2e
```

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

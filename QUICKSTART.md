# Quick Start Guide

Get your authentication service up and running in 5 minutes!

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Step 1: Install Dependencies

```bash
cd "Authentication Service"
npm install
```

## Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL connection:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/auth_db?schema=public"
```

## Step 3: Set Up Database

```bash
# Generate Prisma client
npm run prisma:generate

# Create database tables
npm run prisma:migrate

# Seed with test users
npm run prisma:seed
```

## Step 4: Start Server

```bash
npm run start:dev
```

Server is now running at `http://localhost:3000/api` 🎉

## Step 5: Test the API

### Test Login (Terminal)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

### Test with Script

```bash
node test/api-test.js
```

## Default Test Accounts

**Admin:**
- Email: `admin@example.com`
- Password: `admin123`

**User:**
- Email: `user@example.com`
- Password: `user123`

## Next Steps

- Read [README.md](README.md) for full documentation
- Read [RBAC_INTEGRATION.md](RBAC_INTEGRATION.md) for integration guide
- Customize roles and permissions
- Deploy to production

## Common Issues

**Database connection failed?**
- Check PostgreSQL is running
- Verify DATABASE_URL in `.env`

**Port 3000 already in use?**
- Change PORT in `.env`

**Prisma errors?**
- Run `npm run prisma:generate` again
- Delete `node_modules` and reinstall

---

**Need help?** Check the full README or open an issue!

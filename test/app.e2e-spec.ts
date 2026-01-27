import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Authentication Service (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminAccessToken: string;
  let userAccessToken: string;
  let userRefreshToken: string;
  let createdUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    app.setGlobalPrefix('api');
    
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    if (process.env.NODE_ENV === 'test') {
      await prisma.cleanDatabase();
    }
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('Auth Endpoints', () => {
    it('/api/auth/register (POST) - should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('user');
          expect(response.body).toHaveProperty('accessToken');
          expect(response.body).toHaveProperty('refreshToken');
          expect(response.body.user.email).toBe('test@example.com');
          userAccessToken = response.body.accessToken;
          userRefreshToken = response.body.refreshToken;
          createdUserId = response.body.user.id;
        });
    }, 10000);

    it('/api/auth/register (POST) - should fail with duplicate email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(409);
    });

    it('/api/auth/register (POST) - should fail with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);
    });

    it('/api/auth/register (POST) - should fail with short password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'another@example.com',
          password: '123',
        })
        .expect(400);
    });

    it('/api/auth/login (POST) - should login successfully', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('user');
          expect(response.body).toHaveProperty('accessToken');
          expect(response.body).toHaveProperty('refreshToken');
        });
    }, 10000);

    it('/api/auth/login (POST) - should fail with wrong password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('/api/auth/login (POST) - should fail with non-existent email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);
    });

    it('/api/auth/me (GET) - should return current user profile', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body.user).toHaveProperty('id');
          expect(response.body.user).toHaveProperty('email');
          expect(response.body.user.email).toBe('test@example.com');
        });
    });

    it('/api/auth/me (GET) - should fail without token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });

    it('/api/auth/me (GET) - should fail with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('/api/auth/refresh (POST) - should refresh tokens', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: userRefreshToken,
        })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('accessToken');
          expect(response.body).toHaveProperty('refreshToken');
          userAccessToken = response.body.accessToken;
          userRefreshToken = response.body.refreshToken;
        });
    });

    it('/api/auth/logout (POST) - should logout successfully', () => {
      return request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          refreshToken: userRefreshToken,
        })
        .expect(200);
    });

    it('/api/auth/refresh (POST) - should fail with revoked token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({
          refreshToken: userRefreshToken,
        })
        .expect(401);
    });
  });

  describe('RBAC Tests', () => {
    beforeAll(async () => {
      const adminRegister = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'admin123',
          firstName: 'Admin',
          lastName: 'User',
        });

      await prisma.user.update({
        where: { id: adminRegister.body.user.id },
        data: { role: 'ADMIN' },
      });

      const adminLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'admin123',
        });

      adminAccessToken = adminLogin.body.accessToken;

      const userLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      userAccessToken = userLogin.body.accessToken;
    });

    it('/api/users (GET) - admin should access all users', () => {
      return request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeGreaterThan(0);
        });
    });

    it('/api/users (GET) - regular user should be denied', () => {
      return request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(403);
    });

    it('/api/users/assign-role (POST) - admin should assign roles', async () => {
      // Create a new user to assign role to
      const newUser = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'roletest@example.com',
          password: 'password123',
          firstName: 'Role',
          lastName: 'Test',
        });

      return request(app.getHttpServer())
        .post('/api/users/assign-role')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          userId: newUser.body.user.id,
          role: 'ADMIN',
        })
        .expect(201);
    });

    it('/api/users/assign-role (POST) - regular user should be denied', () => {
      return request(app.getHttpServer())
        .post('/api/users/assign-role')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send({
          userId: createdUserId,
          role: 'ADMIN',
        })
        .expect(403);
    });

    it('/api/users/:id (GET) - admin should access user by ID', () => {
      return request(app.getHttpServer())
        .get(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('email');
        });
    });

    it('/api/users/:id (PATCH) - admin should update user', () => {
      return request(app.getHttpServer())
        .patch(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        })
        .expect(200)
        .then((response) => {
          expect(response.body.firstName).toBe('Updated');
          expect(response.body.lastName).toBe('Name');
        });
    });

    it('/api/users/profile (GET) - user should access own profile', () => {
      return request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('email');
        });
    });
  });
});

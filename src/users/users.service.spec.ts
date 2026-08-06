import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    role: 'USER',
    isActive: true,
    isEmailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserWithoutPassword = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'USER',
    isActive: true,
    isEmailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      prisma.user.create.mockResolvedValue(mockUserWithoutPassword);

      const result = await service.create({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(result).toEqual(mockUserWithoutPassword);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          password: expect.stringMatching(/^\$2b\$10\$/),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null for non-existent email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUserWithoutPassword);

      const result = await service.findById('user-1');

      expect(result).toEqual(mockUserWithoutPassword);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      prisma.user.findMany.mockResolvedValue([mockUserWithoutPassword]);

      const result = await service.findAll();

      expect(result).toEqual([mockUserWithoutPassword]);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: expect.objectContaining({
          id: true,
          email: true,
        }),
      });
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const updatedUser = { ...mockUserWithoutPassword, firstName: 'Updated' };
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.update('user-1', { firstName: 'Updated' });

      expect(result).toEqual(updatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { firstName: 'Updated' },
        select: expect.objectContaining({
          id: true,
          email: true,
        }),
      });
    });
  });

  describe('assignRole', () => {
    it('should assign role to user', async () => {
      const adminUser = { ...mockUserWithoutPassword, role: 'ADMIN' };
      prisma.user.update.mockResolvedValue(adminUser);

      const result = await service.assignRole('user-1', 'ADMIN');

      expect(result).toEqual(adminUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { role: 'ADMIN' },
        select: expect.objectContaining({
          id: true,
          email: true,
        }),
      });
    });
  });

  describe('deactivate', () => {
    it('should deactivate user', async () => {
      const deactivatedUser = { ...mockUserWithoutPassword, isActive: false };
      prisma.user.update.mockResolvedValue(deactivatedUser);

      await service.deactivate('user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { isActive: false },
      });
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      prisma.user.delete.mockResolvedValue({});

      await service.remove('user-1');

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });
});

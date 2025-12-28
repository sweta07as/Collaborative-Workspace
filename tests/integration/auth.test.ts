import request from 'supertest';
import express, { Application } from 'express';

// Mock mongoose models
jest.mock('../../src/models/index', () => ({
  User: {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
  },
  RefreshToken: {
    findOne: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

jest.mock('../../src/middleware/rateLimit', () => ({
  generalRateLimiter: (req: any, res: any, next: any) => next(),
  authRateLimiter: (req: any, res: any, next: any) => next(),
  strictRateLimiter: (req: any, res: any, next: any) => next(),
}));

import { User, RefreshToken } from '../../src/models/index';
import bcrypt from 'bcryptjs';

const createTestApp = (): Application => {
  const app = express();
  app.use(express.json());

  const authRoutes = require('../../src/modules/auth/auth.routes').default;
  app.use('/api/v1/auth', authRoutes);

  app.use((err: any, req: any, res: any, next: any) => {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Internal server error',
    });
  });

  return app;
};

describe('Auth API Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'Password123',
        name: 'New User',
      };

      const mockUser = {
        _id: { toString: () => 'new-user-id' },
        email: userData.email.toLowerCase(),
        name: userData.name,
        createdAt: new Date(),
      };

      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue(mockUser);
      (RefreshToken.create as jest.Mock).mockResolvedValue({
        _id: 'token-id',
        token: 'refresh-token',
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email.toLowerCase());
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });

    it('should return 400 for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123',
        name: 'New User',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        name: 'New User',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 409 for existing email', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'Password123',
        name: 'New User',
      };

      (User.findOne as jest.Mock).mockResolvedValue({
        _id: 'existing-id',
        email: userData.email,
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email already registered');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'Password123',
      };

      const hashedPassword = await bcrypt.hash(loginData.password, 10);

      const mockUser = {
        _id: { toString: () => 'user-id' },
        email: loginData.email,
        passwordHash: hashedPassword,
        name: 'Test User',
        createdAt: new Date(),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (RefreshToken.create as jest.Mock).mockResolvedValue({
        _id: 'token-id',
        token: 'refresh-token',
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });

    it('should return 401 for invalid password', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'WrongPassword',
      };

      const mockUser = {
        _id: { toString: () => 'user-id' },
        email: loginData.email,
        passwordHash: await bcrypt.hash('CorrectPassword123', 10),
        name: 'Test User',
        createdAt: new Date(),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 401 for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123',
      };

      (User.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';

      const mockStoredToken = {
        _id: { toString: () => 'token-id' },
        token: refreshToken,
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 86400000),
        populate: jest.fn().mockReturnThis(),
      };

      const mockUser = {
        _id: { toString: () => 'user-id' },
        email: 'user@example.com',
        name: 'Test User',
      };

      (RefreshToken.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockStoredToken),
      });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (RefreshToken.deleteOne as jest.Mock).mockResolvedValue({});
      (RefreshToken.create as jest.Mock).mockResolvedValue({
        _id: 'new-token-id',
        token: 'new-refresh-token',
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should return 401 for invalid refresh token', async () => {
      (RefreshToken.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});

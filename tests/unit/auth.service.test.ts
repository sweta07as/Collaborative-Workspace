import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config/index';

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

import { User, RefreshToken } from '../../src/models/index';
import { AuthService } from '../../src/modules/auth/auth.service';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const input = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      };

      const mockUser = {
        _id: { toString: () => 'user-id-123' },
        email: input.email.toLowerCase(),
        name: input.name,
        createdAt: new Date(),
      };

      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User.create as jest.Mock).mockResolvedValue(mockUser);
      (RefreshToken.create as jest.Mock).mockResolvedValue({
        _id: 'token-id',
        token: 'refresh-token',
      });

      const result = await authService.register(input);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(input.email.toLowerCase());
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw error if email already exists', async () => {
      const input = {
        email: 'existing@example.com',
        password: 'Password123',
        name: 'Test User',
      };

      (User.findOne as jest.Mock).mockResolvedValue({
        _id: 'existing-user',
        email: input.email,
      });

      await expect(authService.register(input)).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const input = {
        email: 'test@example.com',
        password: 'Password123',
      };

      const hashedPassword = await bcrypt.hash(input.password, 10);

      const mockUser = {
        _id: { toString: () => 'user-id-123' },
        email: input.email,
        passwordHash: hashedPassword,
        name: 'Test User',
        createdAt: new Date(),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (RefreshToken.create as jest.Mock).mockResolvedValue({
        _id: 'token-id',
        token: 'refresh-token',
      });

      const result = await authService.login(input);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(input.email);
      expect(result.tokens.accessToken).toBeDefined();
    });

    it('should throw error for invalid email', async () => {
      const input = {
        email: 'nonexistent@example.com',
        password: 'Password123',
      };

      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(authService.login(input)).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for invalid password', async () => {
      const input = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      const mockUser = {
        _id: { toString: () => 'user-id-123' },
        email: input.email,
        passwordHash: await bcrypt.hash('CorrectPassword123', 10),
        name: 'Test User',
        createdAt: new Date(),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.login(input)).rejects.toThrow('Invalid email or password');
    });
  });

  describe('validateAccessToken', () => {
    it('should validate a valid access token', async () => {
      const payload = {
        userId: 'user-id-123',
        email: 'test@example.com',
        type: 'access',
      };

      const token = jwt.sign(payload, config.jwt.secret, {
        expiresIn: '15m',
      });

      const result = await authService.validateAccessToken(token);

      expect(result.userId).toBe(payload.userId);
      expect(result.email).toBe(payload.email);
      expect(result.type).toBe('access');
    });

    it('should throw error for invalid token', async () => {
      await expect(authService.validateAccessToken('invalid-token')).rejects.toThrow(
        'Invalid token'
      );
    });

    it('should throw error for refresh token used as access token', async () => {
      const payload = {
        userId: 'user-id-123',
        email: 'test@example.com',
        type: 'refresh',
      };

      const token = jwt.sign(payload, config.jwt.secret, {
        expiresIn: '7d',
      });

      await expect(authService.validateAccessToken(token)).rejects.toThrow('Invalid token type');
    });
  });
});

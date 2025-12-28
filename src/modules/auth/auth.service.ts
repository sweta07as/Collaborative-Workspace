import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User, RefreshToken } from '../../models/index.js';
import { config } from '../../config/index.js';
import { JwtPayload } from '../../shared/types.js';
import {
  UnauthorizedError,
  ConflictError,
} from '../../shared/errors.js';
import { RegisterInput, LoginInput } from '../../shared/validation.js';
import { parseMs } from '../../shared/utils.js';

const BCRYPT_ROUNDS = 12;

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface UserResponse {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export class AuthService {
  async register(input: RegisterInput): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    const existingUser = await User.findOne({ email: input.email.toLowerCase() });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const user = await User.create({
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name,
    });

    const tokens = await this.generateTokens(user._id.toString(), user.email);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  async login(input: LoginInput): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    const user = await User.findOne({ email: input.email.toLowerCase() });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = await this.generateTokens(user._id.toString(), user.email);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      tokens,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    const storedToken = await RefreshToken.findOne({ token: refreshToken }).populate('userId');

    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (new Date() > storedToken.expiresAt) {
      await RefreshToken.deleteOne({ _id: storedToken._id });
      throw new UnauthorizedError('Refresh token expired');
    }

    const user = await User.findById(storedToken.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    await RefreshToken.deleteOne({ _id: storedToken._id });

    const tokens = await this.generateTokens(user._id.toString(), user.email);

    return tokens;
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await RefreshToken.deleteMany({ token: refreshToken });
    } else {
      await RefreshToken.deleteMany({ userId });
    }
  }

  async validateAccessToken(token: string): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

      if (decoded.type !== 'access') {
        throw new UnauthorizedError('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired');
      }
      throw new UnauthorizedError('Invalid token');
    }
  }

  async getUserById(userId: string): Promise<UserResponse | null> {
    const user = await User.findById(userId).select('email name createdAt');

    if (!user) {
      return null;
    }

    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  private async generateTokens(userId: string, email: string): Promise<AuthTokens> {
    const accessPayload: JwtPayload = {
      userId,
      email,
      type: 'access',
    };

    const expiresIn = config.jwt.accessExpiry;
    const accessToken = jwt.sign(
      accessPayload,
      config.jwt.secret,
      { expiresIn } as jwt.SignOptions
    );

    const refreshToken = uuidv4();
    const refreshExpiry = parseMs(config.jwt.refreshExpiry);

    await RefreshToken.create({
      token: refreshToken,
      userId,
      expiresAt: new Date(Date.now() + refreshExpiry),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: parseMs(config.jwt.accessExpiry) / 1000,
    };
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await RefreshToken.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    return result.deletedCount;
  }
}

export const authService = new AuthService();

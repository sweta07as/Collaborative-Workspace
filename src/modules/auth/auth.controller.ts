import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { successResponse } from '../../shared/utils.js';
import { AuthenticatedRequest } from '../../shared/types.js';
import { RegisterInput, LoginInput } from '../../shared/validation.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: RegisterInput = req.body;
      const result = await authService.register(input);

      successResponse(res, result, 'User registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: LoginInput = req.body;
      const result = await authService.login(input);

      successResponse(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshAccessToken(refreshToken);

      successResponse(res, tokens, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { refreshToken } = req.body;

      await authService.logout(userId, refreshToken);

      successResponse(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const user = await authService.getUserById(userId);

      successResponse(res, user, 'User retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();

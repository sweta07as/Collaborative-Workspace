import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AuthenticatedRequest, JwtPayload, Role, ProjectMemberContext } from '../shared/types.js';
import { UnauthorizedError, ForbiddenError } from '../shared/errors.js';
import { ProjectMember } from '../models/index.js';

export function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    if (decoded.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
}

export function authorize(...allowedRoles: Role[]) {
  return async (
    req: ProjectMemberContext,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const projectId = req.params.projectId || req.params.id;
      if (!projectId) {
        throw new ForbiddenError('Project ID required');
      }

      const member = await ProjectMember.findOne({
        projectId,
        userId: req.user.userId,
      });

      if (!member) {
        throw new ForbiddenError('Not a member of this project');
      }

      if (!allowedRoles.includes(member.role as Role)) {
        throw new ForbiddenError('Insufficient permissions');
      }

      req.projectId = projectId;
      req.memberRole = member.role as Role;

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    if (decoded.type === 'access') {
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
      };
    }

    next();
  } catch {
    next();
  }
}

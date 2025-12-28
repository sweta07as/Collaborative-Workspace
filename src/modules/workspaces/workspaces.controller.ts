import { Response, NextFunction } from 'express';
import { workspaceService } from './workspaces.service.js';
import { successResponse, paginatedResponse } from '../../shared/utils.js';
import { AuthenticatedRequest } from '../../shared/types.js';
import { CreateWorkspaceInput, UpdateWorkspaceInput } from '../../shared/validation.js';

export class WorkspaceController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const projectId = req.params.projectId;
      const input: CreateWorkspaceInput = req.body;

      const workspace = await workspaceService.create(projectId, userId, input);

      successResponse(res, workspace, 'Workspace created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async findByProject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const projectId = req.params.projectId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { workspaces, total } = await workspaceService.findByProject(
        projectId,
        userId,
        page,
        limit
      );

      paginatedResponse(res, workspaces, page, limit, total, 'Workspaces retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const workspaceId = req.params.id;

      const workspace = await workspaceService.findById(workspaceId, userId);

      successResponse(res, workspace, 'Workspace retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const workspaceId = req.params.id;
      const input: UpdateWorkspaceInput = req.body;

      const workspace = await workspaceService.update(workspaceId, userId, input);

      successResponse(res, workspace, 'Workspace updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const workspaceId = req.params.id;

      await workspaceService.delete(workspaceId, userId);

      successResponse(res, null, 'Workspace deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const workspaceController = new WorkspaceController();

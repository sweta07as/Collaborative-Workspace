import { Response, NextFunction } from 'express';
import { projectService } from './projects.service.js';
import { successResponse, paginatedResponse } from '../../shared/utils.js';
import { AuthenticatedRequest } from '../../shared/types.js';
import { CreateProjectInput, UpdateProjectInput } from '../../shared/validation.js';

export class ProjectController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const input: CreateProjectInput = req.body;

      const project = await projectService.create(userId, input);

      successResponse(res, project, 'Project created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { projects, total } = await projectService.findAll(userId, page, limit);

      paginatedResponse(res, projects, page, limit, total, 'Projects retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const projectId = req.params.id;

      const project = await projectService.findById(projectId, userId);

      successResponse(res, project, 'Project retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const projectId = req.params.id;
      const input: UpdateProjectInput = req.body;

      const project = await projectService.update(projectId, userId, input);

      successResponse(res, project, 'Project updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const projectId = req.params.id;

      await projectService.delete(projectId, userId);

      successResponse(res, null, 'Project deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();

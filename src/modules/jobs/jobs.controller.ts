import { Response, NextFunction } from 'express';
import { jobService } from './jobs.service.js';
import { successResponse, paginatedResponse } from '../../shared/utils.js';
import { AuthenticatedRequest } from '../../shared/types.js';
import { CreateJobInput } from '../../shared/validation.js';
import { JobStatus } from '../../shared/types.js';

export class JobController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const input: CreateJobInput = req.body;

      const job = await jobService.create(userId, input);

      successResponse(res, job, 'Job created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const jobId = req.params.id;

      const job = await jobService.findById(jobId, userId);

      successResponse(res, job, 'Job retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async findByWorkspace(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const workspaceId = req.params.workspaceId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as JobStatus | undefined;

      const { jobs, total } = await jobService.findByWorkspace(
        workspaceId,
        userId,
        page,
        limit,
        status
      );

      paginatedResponse(res, jobs, page, limit, total, 'Jobs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const jobId = req.params.id;

      const job = await jobService.cancelJob(jobId, userId);

      successResponse(res, job, 'Job cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  async getQueueStats(
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await jobService.getQueueStats();

      successResponse(res, stats, 'Queue stats retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const jobController = new JobController();

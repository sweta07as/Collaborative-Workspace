import mongoose from 'mongoose';
import { Job, Workspace, ProjectMember } from '../../models/index.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../shared/errors.js';
import { CreateJobInput } from '../../shared/validation.js';
import { JobStatus, JobType, Role } from '../../shared/types.js';
import { generateIdempotencyKey } from '../../shared/utils.js';
import { logger } from '../../config/logger.js';

interface JobWithWorkspace {
  id: string;
  type: string;
  status: string;
  payload: unknown;
  result: unknown;
  errorMessage: string | null;
  attempts: number;
  maxAttempts: number;
  idempotencyKey: string | null;
  workspaceId: string;
  createdBy: string;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  workspace: {
    id: string;
    name: string;
    projectId: string;
  };
  creator: {
    id: string;
    email: string;
    name: string;
  };
}

async function formatJob(jobId: string): Promise<JobWithWorkspace> {
  const job = await Job.findById(jobId)
    .populate('workspaceId', 'name projectId')
    .populate('createdBy', 'email name');

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  const workspace = job.workspaceId as unknown as { _id: mongoose.Types.ObjectId; name: string; projectId: mongoose.Types.ObjectId };
  const creator = job.createdBy as unknown as { _id: mongoose.Types.ObjectId; email: string; name: string };

  return {
    id: job._id.toString(),
    type: job.type,
    status: job.status,
    payload: job.payload,
    result: job.result || null,
    errorMessage: job.errorMessage || null,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    idempotencyKey: job.idempotencyKey || null,
    workspaceId: workspace._id.toString(),
    createdBy: creator._id.toString(),
    startedAt: job.startedAt || null,
    completedAt: job.completedAt || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    workspace: {
      id: workspace._id.toString(),
      name: workspace.name,
      projectId: workspace.projectId.toString(),
    },
    creator: {
      id: creator._id.toString(),
      email: creator.email,
      name: creator.name,
    },
  };
}

// Simulated job processor for serverless environment
async function processJobAsync(jobId: string, type: string): Promise<void> {
  try {
    // Mark job as processing
    await Job.findByIdAndUpdate(jobId, {
      status: JobStatus.PROCESSING,
      startedAt: new Date(),
      $inc: { attempts: 1 },
    });

    // Simulate job processing based on type
    let result: Record<string, unknown>;

    if (type === JobType.CODE_EXECUTION) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      result = {
        output: 'Code executed successfully (simulated)',
        executionTime: Math.floor(Math.random() * 1000) + 100,
        memoryUsed: Math.floor(Math.random() * 50) + 10,
      };
    } else if (type === JobType.FILE_ANALYSIS) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      result = {
        linesOfCode: Math.floor(Math.random() * 1000) + 100,
        complexity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        issues: [],
        suggestions: ['Consider adding type annotations'],
      };
    } else {
      result = { message: 'Job processed successfully' };
    }

    // Mark job as completed
    await Job.findByIdAndUpdate(jobId, {
      status: JobStatus.COMPLETED,
      result,
      completedAt: new Date(),
    });

    logger.info(`Job ${jobId} completed successfully`);
  } catch (error) {
    await Job.findByIdAndUpdate(jobId, {
      status: JobStatus.FAILED,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      completedAt: new Date(),
    });

    logger.error(`Job ${jobId} failed:`, error);
  }
}

export class JobService {
  async create(userId: string, input: CreateJobInput): Promise<JobWithWorkspace> {
    const workspace = await Workspace.findById(input.workspaceId);

    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const member = await ProjectMember.findOne({ projectId: workspace.projectId, userId });

    if (!member) {
      throw new ForbiddenError('Not a member of this project');
    }

    if (member.role === Role.VIEWER) {
      throw new ForbiddenError('Viewers cannot create jobs');
    }

    const idempotencyKey = generateIdempotencyKey(
      userId,
      input.workspaceId,
      input.type,
      JSON.stringify(input.payload)
    );

    const existingJob = await Job.findOne({ idempotencyKey });

    if (existingJob && existingJob.status !== JobStatus.FAILED) {
      logger.info(`Idempotent job request: returning existing job ${existingJob._id}`);
      return formatJob(existingJob._id.toString());
    }

    const job = await Job.create({
      type: input.type as JobType,
      status: JobStatus.PENDING,
      payload: input.payload,
      idempotencyKey,
      workspaceId: input.workspaceId,
      createdBy: userId,
    });

    logger.info(`Job ${job._id} created`);

    // Process job asynchronously (non-blocking)
    processJobAsync(job._id.toString(), input.type).catch((error) => {
      logger.error(`Error processing job ${job._id}:`, error);
    });

    return formatJob(job._id.toString());
  }

  async findById(jobId: string, userId: string): Promise<JobWithWorkspace> {
    const job = await Job.findById(jobId).populate('workspaceId', 'name projectId');

    if (!job) {
      throw new NotFoundError('Job not found');
    }

    const workspace = job.workspaceId as unknown as { projectId: mongoose.Types.ObjectId };
    const member = await ProjectMember.findOne({ projectId: workspace.projectId, userId });

    if (!member) {
      throw new ForbiddenError('Not a member of this project');
    }

    return formatJob(jobId);
  }

  async findByWorkspace(
    workspaceId: string,
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: JobStatus
  ) {
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const member = await ProjectMember.findOne({ projectId: workspace.projectId, userId });

    if (!member) {
      throw new ForbiddenError('Not a member of this project');
    }

    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { workspaceId };
    if (status) {
      query.status = status;
    }

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate('workspaceId', 'name projectId')
        .populate('createdBy', 'email name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Job.countDocuments(query),
    ]);

    const formattedJobs = await Promise.all(
      jobs.map((j) => formatJob(j._id.toString()))
    );

    return { jobs: formattedJobs, total };
  }

  async cancelJob(jobId: string, userId: string): Promise<JobWithWorkspace> {
    const job = await this.findById(jobId, userId);

    if (job.status !== JobStatus.PENDING) {
      throw new ConflictError('Only pending jobs can be cancelled');
    }

    const jobDoc = await Job.findById(jobId).populate('workspaceId', 'projectId');
    const workspace = jobDoc!.workspaceId as unknown as { projectId: mongoose.Types.ObjectId };

    const member = await ProjectMember.findOne({ projectId: workspace.projectId, userId });

    if (!member || member.role === Role.VIEWER) {
      throw new ForbiddenError('Insufficient permissions to cancel job');
    }

    await Job.findByIdAndUpdate(jobId, {
      status: JobStatus.FAILED,
      errorMessage: 'Job cancelled by user',
      completedAt: new Date(),
    });

    return formatJob(jobId);
  }

  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    result?: Record<string, unknown>,
    errorMessage?: string
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status };

    if (status === JobStatus.PROCESSING) {
      updateData.startedAt = new Date();
      updateData.$inc = { attempts: 1 };
    }

    if (status === JobStatus.COMPLETED || status === JobStatus.FAILED) {
      updateData.completedAt = new Date();
    }

    if (result !== undefined) {
      updateData.result = result;
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await Job.findByIdAndUpdate(jobId, updateData);
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [pending, processing, completed, failed] = await Promise.all([
      Job.countDocuments({ status: JobStatus.PENDING }),
      Job.countDocuments({ status: JobStatus.PROCESSING }),
      Job.countDocuments({ status: JobStatus.COMPLETED }),
      Job.countDocuments({ status: JobStatus.FAILED }),
    ]);

    return {
      waiting: pending,
      active: processing,
      completed,
      failed,
    };
  }
}

export const jobService = new JobService();

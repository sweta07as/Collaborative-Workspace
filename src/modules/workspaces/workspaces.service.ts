import mongoose from 'mongoose';
import { Workspace, ProjectMember, Project, Job } from '../../models/index.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';
import { CreateWorkspaceInput, UpdateWorkspaceInput } from '../../shared/validation.js';
import { Role } from '../../shared/types.js';

interface WorkspaceWithProject {
  id: string;
  name: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  project: {
    id: string;
    name: string;
    ownerId: string;
  };
}

async function formatWorkspace(workspaceId: string): Promise<WorkspaceWithProject> {
  const workspace = await Workspace.findById(workspaceId).populate('projectId', 'name ownerId');
  if (!workspace) {
    throw new NotFoundError('Workspace not found');
  }

  const project = workspace.projectId as unknown as { _id: mongoose.Types.ObjectId; name: string; ownerId: mongoose.Types.ObjectId };

  return {
    id: workspace._id.toString(),
    name: workspace.name,
    projectId: workspace.projectId.toString(),
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    project: {
      id: project._id.toString(),
      name: project.name,
      ownerId: project.ownerId.toString(),
    },
  };
}

export class WorkspaceService {
  async create(
    projectId: string,
    userId: string,
    input: CreateWorkspaceInput
  ): Promise<WorkspaceWithProject> {
    const member = await ProjectMember.findOne({ projectId, userId });

    if (!member) {
      throw new ForbiddenError('Not a member of this project');
    }

    if (member.role === Role.VIEWER) {
      throw new ForbiddenError('Viewers cannot create workspaces');
    }

    const workspace = await Workspace.create({
      name: input.name,
      projectId,
    });

    return formatWorkspace(workspace._id.toString());
  }

  async findByProject(
    projectId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const member = await ProjectMember.findOne({ projectId, userId });

    if (!member) {
      throw new ForbiddenError('Not a member of this project');
    }

    const skip = (page - 1) * limit;

    const [workspaces, total] = await Promise.all([
      Workspace.find({ projectId })
        .populate('projectId', 'name ownerId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Workspace.countDocuments({ projectId }),
    ]);

    const formattedWorkspaces = await Promise.all(
      workspaces.map(async (w) => {
        const jobCount = await Job.countDocuments({ workspaceId: w._id });
        const project = w.projectId as unknown as { _id: mongoose.Types.ObjectId; name: string; ownerId: mongoose.Types.ObjectId };
        return {
          id: w._id.toString(),
          name: w.name,
          projectId: w.projectId.toString(),
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
          project: {
            id: project._id.toString(),
            name: project.name,
            ownerId: project.ownerId.toString(),
          },
          _count: {
            jobs: jobCount,
          },
        };
      })
    );

    return { workspaces: formattedWorkspaces, total };
  }

  async findById(workspaceId: string, userId: string): Promise<WorkspaceWithProject> {
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const member = await ProjectMember.findOne({ projectId: workspace.projectId, userId });

    if (!member) {
      throw new ForbiddenError('Not a member of this project');
    }

    return formatWorkspace(workspaceId);
  }

  async update(
    workspaceId: string,
    userId: string,
    input: UpdateWorkspaceInput
  ): Promise<WorkspaceWithProject> {
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const member = await ProjectMember.findOne({ projectId: workspace.projectId, userId });

    if (!member) {
      throw new ForbiddenError('Not a member of this project');
    }

    if (member.role === Role.VIEWER) {
      throw new ForbiddenError('Viewers cannot update workspaces');
    }

    await Workspace.findByIdAndUpdate(workspaceId, {
      ...(input.name && { name: input.name }),
    });

    return formatWorkspace(workspaceId);
  }

  async delete(workspaceId: string, userId: string): Promise<void> {
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const member = await ProjectMember.findOne({ projectId: workspace.projectId, userId });

    if (!member) {
      throw new ForbiddenError('Not a member of this project');
    }

    if (member.role !== Role.OWNER && member.role !== Role.COLLABORATOR) {
      throw new ForbiddenError('Insufficient permissions to delete workspace');
    }

    await Promise.all([
      Job.deleteMany({ workspaceId }),
      Workspace.deleteOne({ _id: workspaceId }),
    ]);
  }

  async verifyAccess(workspaceId: string, userId: string): Promise<{ workspace: WorkspaceWithProject; role: Role }> {
    const workspace = await this.findById(workspaceId, userId);

    const member = await ProjectMember.findOne({ projectId: workspace.projectId, userId });

    if (!member) {
      throw new ForbiddenError('Not a member of this project');
    }

    return { workspace, role: member.role as Role };
  }
}

export const workspaceService = new WorkspaceService();

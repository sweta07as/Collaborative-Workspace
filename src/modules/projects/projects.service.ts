import mongoose from 'mongoose';
import { Project, ProjectMember, User, Workspace } from '../../models/index.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';
import { CreateProjectInput, UpdateProjectInput } from '../../shared/validation.js';
import { Role } from '../../shared/types.js';

interface ProjectWithMembers {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    email: string;
    name: string;
  };
  members: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      email: string;
      name: string;
    };
  }>;
  _count: {
    workspaces: number;
  };
}

async function formatProject(projectId: string): Promise<ProjectWithMembers> {
  const project = await Project.findById(projectId).populate('ownerId', 'email name');
  if (!project) {
    throw new NotFoundError('Project not found');
  }

  const members = await ProjectMember.find({ projectId }).populate('userId', 'email name');
  const workspaceCount = await Workspace.countDocuments({ projectId });

  const owner = project.ownerId as unknown as { _id: mongoose.Types.ObjectId; email: string; name: string };

  return {
    id: project._id.toString(),
    name: project.name,
    description: project.description || null,
    ownerId: project.ownerId.toString(),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    owner: {
      id: owner._id.toString(),
      email: owner.email,
      name: owner.name,
    },
    members: members.map((m) => {
      const user = m.userId as unknown as { _id: mongoose.Types.ObjectId; email: string; name: string };
      return {
        id: m._id.toString(),
        role: m.role,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        },
      };
    }),
    _count: {
      workspaces: workspaceCount,
    },
  };
}

export class ProjectService {
  async create(userId: string, input: CreateProjectInput): Promise<ProjectWithMembers> {
    const project = await Project.create({
      name: input.name,
      description: input.description,
      ownerId: userId,
    });

    await ProjectMember.create({
      projectId: project._id,
      userId,
      role: Role.OWNER,
    });

    return formatProject(project._id.toString());
  }

  async findAll(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const memberProjects = await ProjectMember.find({ userId }).select('projectId');
    const projectIds = memberProjects.map((m) => m.projectId);

    const [projects, total] = await Promise.all([
      Project.find({ _id: { $in: projectIds } })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Project.countDocuments({ _id: { $in: projectIds } }),
    ]);

    const formattedProjects = await Promise.all(
      projects.map((p) => formatProject(p._id.toString()))
    );

    return { projects: formattedProjects, total };
  }

  async findById(projectId: string, userId: string): Promise<ProjectWithMembers> {
    const project = await Project.findById(projectId);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const member = await ProjectMember.findOne({ projectId, userId });
    if (!member) {
      throw new ForbiddenError('Not a member of this project');
    }

    return formatProject(projectId);
  }

  async update(
    projectId: string,
    userId: string,
    input: UpdateProjectInput
  ): Promise<ProjectWithMembers> {
    const member = await ProjectMember.findOne({ projectId, userId });

    if (!member) {
      throw new ForbiddenError('Not a member of this project');
    }

    if (member.role === Role.VIEWER) {
      throw new ForbiddenError('Viewers cannot update projects');
    }

    await Project.findByIdAndUpdate(projectId, {
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
    });

    return formatProject(projectId);
  }

  async delete(projectId: string, userId: string): Promise<void> {
    const project = await Project.findById(projectId);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.ownerId.toString() !== userId) {
      throw new ForbiddenError('Only the owner can delete a project');
    }

    // Delete all related data
    await Promise.all([
      Workspace.deleteMany({ projectId }),
      ProjectMember.deleteMany({ projectId }),
      Project.deleteOne({ _id: projectId }),
    ]);
  }

  async getMemberRole(projectId: string, userId: string): Promise<Role | null> {
    const member = await ProjectMember.findOne({ projectId, userId });
    return member?.role as Role | null;
  }
}

export const projectService = new ProjectService();

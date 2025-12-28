import mongoose from 'mongoose';
import { Project, ProjectMember, User } from '../../models/index.js';
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from '../../shared/errors.js';
import { InviteCollaboratorInput, UpdateMemberRoleInput } from '../../shared/validation.js';
import { Role } from '../../shared/types.js';

interface MemberWithUser {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

async function formatMember(member: any): Promise<MemberWithUser> {
  const user = member.userId as unknown as { _id: mongoose.Types.ObjectId; email: string; name: string };
  return {
    id: member._id.toString(),
    projectId: member.projectId.toString(),
    userId: user._id.toString(),
    role: member.role,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    },
  };
}

export class CollaboratorService {
  async getMembers(projectId: string, userId: string): Promise<MemberWithUser[]> {
    const member = await ProjectMember.findOne({ projectId, userId });

    if (!member) {
      throw new ForbiddenError('Not a member of this project');
    }

    const members = await ProjectMember.find({ projectId })
      .populate('userId', 'email name')
      .sort({ role: 1, createdAt: 1 });

    return Promise.all(members.map(formatMember));
  }

  async inviteCollaborator(
    projectId: string,
    inviterId: string,
    input: InviteCollaboratorInput
  ): Promise<MemberWithUser> {
    const inviter = await ProjectMember.findOne({ projectId, userId: inviterId });

    if (!inviter) {
      throw new ForbiddenError('Not a member of this project');
    }

    if (inviter.role === Role.VIEWER) {
      throw new ForbiddenError('Viewers cannot invite collaborators');
    }

    if (inviter.role === Role.COLLABORATOR && input.role === 'COLLABORATOR') {
      throw new ForbiddenError('Collaborators can only invite viewers');
    }

    const userToInvite = await User.findOne({ email: input.email.toLowerCase() });

    if (!userToInvite) {
      throw new NotFoundError('User not found with this email');
    }

    const existingMember = await ProjectMember.findOne({ projectId, userId: userToInvite._id });

    if (existingMember) {
      throw new ConflictError('User is already a member of this project');
    }

    const newMember = await ProjectMember.create({
      projectId,
      userId: userToInvite._id,
      role: input.role as Role,
    });

    const populatedMember = await ProjectMember.findById(newMember._id).populate('userId', 'email name');

    return formatMember(populatedMember);
  }

  async updateMemberRole(
    projectId: string,
    targetUserId: string,
    requesterId: string,
    input: UpdateMemberRoleInput
  ): Promise<MemberWithUser> {
    if (targetUserId === requesterId) {
      throw new BadRequestError('Cannot change your own role');
    }

    const requester = await ProjectMember.findOne({ projectId, userId: requesterId });

    if (!requester) {
      throw new ForbiddenError('Not a member of this project');
    }

    if (requester.role !== Role.OWNER) {
      throw new ForbiddenError('Only owners can change member roles');
    }

    const targetMember = await ProjectMember.findOne({ projectId, userId: targetUserId });

    if (!targetMember) {
      throw new NotFoundError('Member not found in this project');
    }

    if (targetMember.role === Role.OWNER && input.role !== 'OWNER') {
      const ownerCount = await ProjectMember.countDocuments({ projectId, role: Role.OWNER });

      if (ownerCount <= 1) {
        throw new BadRequestError('Cannot demote the only owner');
      }
    }

    await ProjectMember.findByIdAndUpdate(targetMember._id, { role: input.role as Role });

    const updatedMember = await ProjectMember.findById(targetMember._id).populate('userId', 'email name');

    return formatMember(updatedMember);
  }

  async removeMember(
    projectId: string,
    targetUserId: string,
    requesterId: string
  ): Promise<void> {
    const project = await Project.findById(projectId);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (targetUserId === project.ownerId.toString() && targetUserId === requesterId) {
      throw new BadRequestError('Project owner cannot leave. Transfer ownership first or delete the project.');
    }

    const requester = await ProjectMember.findOne({ projectId, userId: requesterId });

    if (!requester) {
      throw new ForbiddenError('Not a member of this project');
    }

    const targetMember = await ProjectMember.findOne({ projectId, userId: targetUserId });

    if (!targetMember) {
      throw new NotFoundError('Member not found in this project');
    }

    const isSelfRemove = targetUserId === requesterId;

    if (!isSelfRemove) {
      if (requester.role === Role.VIEWER) {
        throw new ForbiddenError('Viewers cannot remove members');
      }

      if (requester.role === Role.COLLABORATOR && targetMember.role !== Role.VIEWER) {
        throw new ForbiddenError('Collaborators can only remove viewers');
      }

      if (targetMember.role === Role.OWNER) {
        throw new ForbiddenError('Cannot remove project owner');
      }
    }

    await ProjectMember.deleteOne({ projectId, userId: targetUserId });
  }

  async transferOwnership(
    projectId: string,
    newOwnerId: string,
    currentOwnerId: string
  ): Promise<void> {
    const project = await Project.findById(projectId);

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (project.ownerId.toString() !== currentOwnerId) {
      throw new ForbiddenError('Only the current owner can transfer ownership');
    }

    if (newOwnerId === currentOwnerId) {
      throw new BadRequestError('You are already the owner');
    }

    const newOwnerMember = await ProjectMember.findOne({ projectId, userId: newOwnerId });

    if (!newOwnerMember) {
      throw new NotFoundError('New owner must be a member of the project');
    }

    // Use session for transaction-like behavior
    await Project.findByIdAndUpdate(projectId, { ownerId: newOwnerId });
    await ProjectMember.findOneAndUpdate({ projectId, userId: newOwnerId }, { role: Role.OWNER });
    await ProjectMember.findOneAndUpdate({ projectId, userId: currentOwnerId }, { role: Role.COLLABORATOR });
  }
}

export const collaboratorService = new CollaboratorService();

import { Response, NextFunction } from 'express';
import { collaboratorService } from './collaborators.service.js';
import { successResponse } from '../../shared/utils.js';
import { AuthenticatedRequest } from '../../shared/types.js';
import { InviteCollaboratorInput, UpdateMemberRoleInput } from '../../shared/validation.js';

export class CollaboratorController {
  async getMembers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const projectId = req.params.projectId;

      const members = await collaboratorService.getMembers(projectId, userId);

      successResponse(res, members, 'Members retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async inviteCollaborator(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.userId;
      const projectId = req.params.projectId;
      const input: InviteCollaboratorInput = req.body;

      const member = await collaboratorService.inviteCollaborator(projectId, userId, input);

      successResponse(res, member, 'Collaborator invited successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateMemberRole(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const requesterId = req.user!.userId;
      const { projectId, userId: targetUserId } = req.params;
      const input: UpdateMemberRoleInput = req.body;

      const member = await collaboratorService.updateMemberRole(
        projectId,
        targetUserId,
        requesterId,
        input
      );

      successResponse(res, member, 'Member role updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const requesterId = req.user!.userId;
      const { projectId, userId: targetUserId } = req.params;

      await collaboratorService.removeMember(projectId, targetUserId, requesterId);

      successResponse(res, null, 'Member removed successfully');
    } catch (error) {
      next(error);
    }
  }

  async leaveProject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const projectId = req.params.projectId;

      await collaboratorService.removeMember(projectId, userId, userId);

      successResponse(res, null, 'Left project successfully');
    } catch (error) {
      next(error);
    }
  }

  async transferOwnership(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const currentOwnerId = req.user!.userId;
      const projectId = req.params.projectId;
      const { userId: newOwnerId } = req.body;

      await collaboratorService.transferOwnership(projectId, newOwnerId, currentOwnerId);

      successResponse(res, null, 'Ownership transferred successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const collaboratorController = new CollaboratorController();

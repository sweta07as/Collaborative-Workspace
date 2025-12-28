import { Router } from 'express';
import { collaboratorController } from './collaborators.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { inviteCollaboratorSchema, updateMemberRoleSchema, uuidSchema } from '../../shared/validation.js';
import { z } from 'zod';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /projects/{projectId}/members:
 *   get:
 *     summary: Get all members of a project
 *     tags: [Collaborators]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Members retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       role:
 *                         type: string
 *                         enum: [OWNER, COLLABORATOR, VIEWER]
 *                       user:
 *                         $ref: '#/components/schemas/User'
 *       403:
 *         description: Not a member of this project
 */
router.get(
  '/:projectId/members',
  collaboratorController.getMembers.bind(collaboratorController)
);

/**
 * @swagger
 * /projects/{projectId}/members/invite:
 *   post:
 *     summary: Invite a user to the project
 *     tags: [Collaborators]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [COLLABORATOR, VIEWER]
 *     responses:
 *       201:
 *         description: Collaborator invited successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: User not found
 *       409:
 *         description: User is already a member
 */
router.post(
  '/:projectId/members/invite',
  validateBody(inviteCollaboratorSchema),
  collaboratorController.inviteCollaborator.bind(collaboratorController)
);

/**
 * @swagger
 * /projects/{projectId}/members/{userId}:
 *   put:
 *     summary: Update a member's role
 *     tags: [Collaborators]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [OWNER, COLLABORATOR, VIEWER]
 *     responses:
 *       200:
 *         description: Member role updated successfully
 *       403:
 *         description: Only owners can change member roles
 *       404:
 *         description: Member not found
 */
router.put(
  '/:projectId/members/:userId',
  validateBody(updateMemberRoleSchema),
  collaboratorController.updateMemberRole.bind(collaboratorController)
);

/**
 * @swagger
 * /projects/{projectId}/members/{userId}:
 *   delete:
 *     summary: Remove a member from the project
 *     tags: [Collaborators]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Member removed successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Member not found
 */
router.delete(
  '/:projectId/members/:userId',
  collaboratorController.removeMember.bind(collaboratorController)
);

/**
 * @swagger
 * /projects/{projectId}/leave:
 *   post:
 *     summary: Leave a project
 *     tags: [Collaborators]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Left project successfully
 *       400:
 *         description: Cannot leave if you are the only owner
 */
router.post(
  '/:projectId/leave',
  collaboratorController.leaveProject.bind(collaboratorController)
);

/**
 * @swagger
 * /projects/{projectId}/transfer-ownership:
 *   post:
 *     summary: Transfer project ownership to another member
 *     tags: [Collaborators]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Ownership transferred successfully
 *       403:
 *         description: Only the current owner can transfer ownership
 *       404:
 *         description: New owner must be a member of the project
 */
router.post(
  '/:projectId/transfer-ownership',
  validateBody(z.object({ userId: uuidSchema })),
  collaboratorController.transferOwnership.bind(collaboratorController)
);

export default router;

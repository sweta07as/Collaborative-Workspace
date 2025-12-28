import { Router } from 'express';
import { workspaceController } from './workspaces.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  paginationSchema,
} from '../../shared/validation.js';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /workspaces/{id}:
 *   get:
 *     summary: Get a workspace by ID
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Workspace retrieved successfully
 *       403:
 *         description: Not a member of this project
 *       404:
 *         description: Workspace not found
 */
router.get('/:id', workspaceController.findById.bind(workspaceController));

/**
 * @swagger
 * /workspaces/{id}:
 *   put:
 *     summary: Update a workspace
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: id
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
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Workspace updated successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Workspace not found
 */
router.put(
  '/:id',
  validateBody(updateWorkspaceSchema),
  workspaceController.update.bind(workspaceController)
);

/**
 * @swagger
 * /workspaces/{id}:
 *   delete:
 *     summary: Delete a workspace
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Workspace deleted successfully
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Workspace not found
 */
router.delete('/:id', workspaceController.delete.bind(workspaceController));

export default router;

export const projectWorkspaceRoutes = Router();

projectWorkspaceRoutes.use(authenticate);

/**
 * @swagger
 * /projects/{projectId}/workspaces:
 *   get:
 *     summary: Get all workspaces for a project
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Workspaces retrieved successfully
 *       403:
 *         description: Not a member of this project
 */
projectWorkspaceRoutes.get(
  '/:projectId/workspaces',
  validateQuery(paginationSchema),
  workspaceController.findByProject.bind(workspaceController)
);

/**
 * @swagger
 * /projects/{projectId}/workspaces:
 *   post:
 *     summary: Create a new workspace in a project
 *     tags: [Workspaces]
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
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Workspace created successfully
 *       403:
 *         description: Insufficient permissions
 */
projectWorkspaceRoutes.post(
  '/:projectId/workspaces',
  validateBody(createWorkspaceSchema),
  workspaceController.create.bind(workspaceController)
);

import { Router } from 'express';
import { jobController } from './jobs.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validateBody, validateQuery } from '../../middleware/validate.js';
import { createJobSchema, paginationSchema } from '../../shared/validation.js';
import { z } from 'zod';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /jobs:
 *   post:
 *     summary: Create a new job
 *     tags: [Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - workspaceId
 *               - payload
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [CODE_EXECUTION, FILE_ANALYSIS]
 *               workspaceId:
 *                 type: string
 *                 format: uuid
 *               payload:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                   language:
 *                     type: string
 *                   fileId:
 *                     type: string
 *     responses:
 *       201:
 *         description: Job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Job'
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Workspace not found
 */
router.post('/', validateBody(createJobSchema), jobController.create.bind(jobController));

/**
 * @swagger
 * /jobs/stats:
 *   get:
 *     summary: Get job queue statistics
 *     tags: [Jobs]
 *     responses:
 *       200:
 *         description: Queue stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     waiting:
 *                       type: integer
 *                     active:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     failed:
 *                       type: integer
 */
router.get('/stats', jobController.getQueueStats.bind(jobController));

/**
 * @swagger
 * /jobs/workspace/{workspaceId}:
 *   get:
 *     summary: Get jobs for a workspace
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: workspaceId
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, COMPLETED, FAILED]
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
 *       403:
 *         description: Not a member of this project
 */
router.get(
  '/workspace/:workspaceId',
  validateQuery(
    paginationSchema.extend({
      status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
    })
  ),
  jobController.findByWorkspace.bind(jobController)
);

/**
 * @swagger
 * /jobs/{id}:
 *   get:
 *     summary: Get a job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job retrieved successfully
 *       403:
 *         description: Not a member of this project
 *       404:
 *         description: Job not found
 */
router.get('/:id', jobController.findById.bind(jobController));

/**
 * @swagger
 * /jobs/{id}/cancel:
 *   post:
 *     summary: Cancel a pending job
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job cancelled successfully
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Only pending jobs can be cancelled
 */
router.post('/:id/cancel', jobController.cancel.bind(jobController));

export default router;

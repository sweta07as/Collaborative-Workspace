import request from 'supertest';
import express, { Application } from 'express';
import jwt from 'jsonwebtoken';

// Mock mongoose models
jest.mock('../../src/models/index', () => ({
  User: {
    findOne: jest.fn(),
    findById: jest.fn(),
  },
  Project: {
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
    countDocuments: jest.fn(),
  },
  ProjectMember: {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  Workspace: {
    countDocuments: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

jest.mock('../../src/middleware/rateLimit', () => ({
  generalRateLimiter: (req: any, res: any, next: any) => next(),
  authRateLimiter: (req: any, res: any, next: any) => next(),
}));

import { Project, ProjectMember, Workspace } from '../../src/models/index';

const JWT_SECRET = 'test-secret-key';
process.env.JWT_SECRET = JWT_SECRET;

const createToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email, type: 'access' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
};

const createTestApp = (): Application => {
  const app = express();
  app.use(express.json());

  const projectRoutes = require('../../src/modules/projects/projects.routes').default;
  app.use('/api/v1/projects', projectRoutes);

  app.use((err: any, req: any, res: any, next: any) => {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Internal server error',
    });
  });

  return app;
};

describe('Projects API Integration Tests', () => {
  let app: Application;
  const testUserId = 'test-user-id';
  const testEmail = 'test@example.com';
  let authToken: string;

  beforeAll(() => {
    app = createTestApp();
    authToken = createToken(testUserId, testEmail);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'New Project',
        description: 'A test project',
      };

      const mockProject = {
        _id: { toString: () => 'project-id' },
        ...projectData,
        ownerId: { toString: () => testUserId, _id: { toString: () => testUserId }, email: testEmail, name: 'Test User' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMember = {
        _id: { toString: () => 'member-id' },
        projectId: { toString: () => 'project-id' },
        userId: { _id: { toString: () => testUserId }, email: testEmail, name: 'Test User' },
        role: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (Project.create as jest.Mock).mockResolvedValue(mockProject);
      (ProjectMember.create as jest.Mock).mockResolvedValue(mockMember);
      (Project.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockProject),
      });
      (ProjectMember.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue([mockMember]),
      });
      (Workspace.countDocuments as jest.Mock).mockResolvedValue(0);

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(projectData.name);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .send({ name: 'Test' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('should get all projects for user', async () => {
      const mockMemberProjects = [
        { projectId: { toString: () => 'project-1' } },
      ];

      const mockProject = {
        _id: { toString: () => 'project-1' },
        name: 'Project 1',
        description: 'Description 1',
        ownerId: { toString: () => testUserId, _id: { toString: () => testUserId }, email: testEmail, name: 'Test User' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMember = {
        _id: { toString: () => 'member-id' },
        projectId: { toString: () => 'project-1' },
        userId: { _id: { toString: () => testUserId }, email: testEmail, name: 'Test User' },
        role: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (ProjectMember.find as jest.Mock).mockImplementation((query) => {
        if (query.userId) {
          return { select: jest.fn().mockResolvedValue(mockMemberProjects) };
        }
        return { populate: jest.fn().mockResolvedValue([mockMember]) };
      });

      (Project.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockProject]),
          }),
        }),
      });

      (Project.countDocuments as jest.Mock).mockResolvedValue(1);
      (Project.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockProject),
      });
      (Workspace.countDocuments as jest.Mock).mockResolvedValue(2);

      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('should get project by ID', async () => {
      const projectId = 'project-123';

      const mockProject = {
        _id: { toString: () => projectId },
        name: 'Test Project',
        ownerId: { toString: () => testUserId, _id: { toString: () => testUserId }, email: testEmail, name: 'Test User' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMember = {
        _id: { toString: () => 'member-id' },
        projectId: { toString: () => projectId },
        userId: { _id: { toString: () => testUserId }, email: testEmail, name: 'Test User' },
        role: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (Project.findById as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockProject),
      }));

      (ProjectMember.findOne as jest.Mock).mockResolvedValue(mockMember);
      (ProjectMember.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue([mockMember]),
      });
      (Workspace.countDocuments as jest.Mock).mockResolvedValue(0);

      const response = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(projectId);
    });

    it('should return 403 if not a member', async () => {
      const projectId = 'project-123';

      const mockProject = {
        _id: { toString: () => projectId },
        name: 'Test Project',
        ownerId: { toString: () => 'other-user' },
      };

      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      (ProjectMember.findOne as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent project', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/projects/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/projects/:id', () => {
    it('should update project as owner', async () => {
      const projectId = 'project-123';

      const mockMember = {
        projectId: { toString: () => projectId },
        userId: testUserId,
        role: 'OWNER',
      };

      const mockProject = {
        _id: { toString: () => projectId },
        name: 'Updated Name',
        ownerId: { toString: () => testUserId, _id: { toString: () => testUserId }, email: testEmail, name: 'Test User' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMemberForFormat = {
        _id: { toString: () => 'member-id' },
        projectId: { toString: () => projectId },
        userId: { _id: { toString: () => testUserId }, email: testEmail, name: 'Test User' },
        role: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (ProjectMember.findOne as jest.Mock).mockResolvedValue(mockMember);
      (Project.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockProject);
      (Project.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockProject),
      });
      (ProjectMember.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue([mockMemberForFormat]),
      });
      (Workspace.countDocuments as jest.Mock).mockResolvedValue(0);

      const response = await request(app)
        .put(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
    });

    it('should return 403 for viewers', async () => {
      const projectId = 'project-123';

      (ProjectMember.findOne as jest.Mock).mockResolvedValue({
        projectId,
        userId: testUserId,
        role: 'VIEWER',
      });

      const response = await request(app)
        .put(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    it('should delete project as owner', async () => {
      const projectId = 'project-123';

      (Project.findById as jest.Mock).mockResolvedValue({
        _id: { toString: () => projectId },
        ownerId: { toString: () => testUserId },
      });

      (Workspace.deleteMany as jest.Mock).mockResolvedValue({});
      (ProjectMember.deleteMany as jest.Mock).mockResolvedValue({});
      (Project.deleteOne as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 403 for non-owner', async () => {
      const projectId = 'project-123';

      (Project.findById as jest.Mock).mockResolvedValue({
        _id: { toString: () => projectId },
        ownerId: { toString: () => 'other-user' },
      });

      const response = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});

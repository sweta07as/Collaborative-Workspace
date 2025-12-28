import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';

import authRoutes from '../src/modules/auth/auth.routes';
import projectRoutes from '../src/modules/projects/projects.routes';
import workspaceRoutes, { projectWorkspaceRoutes } from '../src/modules/workspaces/workspaces.routes';
import collaboratorRoutes from '../src/modules/collaborators/collaborators.routes';
import jobRoutes from '../src/modules/jobs/jobs.routes';

import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler';

const app: Application = express();

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.DATABASE_URL || '');
  }
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// Ensure DB connection on each request
app.use(async (_req, _res, next) => {
  await connectDB();
  next();
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    platform: 'vercel'
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/projects', projectWorkspaceRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/projects', collaboratorRoutes);
app.use('/api/v1/jobs', jobRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

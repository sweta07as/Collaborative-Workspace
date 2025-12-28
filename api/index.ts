import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';

let authRoutes: any;
let projectRoutes: any;
let workspaceRoutes: any;
let projectWorkspaceRoutes: any;
let collaboratorRoutes: any;
let jobRoutes: any;
let errorHandler: any;
let notFoundHandler: any;

try {
  authRoutes = require('../src/modules/auth/auth.routes').default;
  projectRoutes = require('../src/modules/projects/projects.routes').default;
  const workspaceModule = require('../src/modules/workspaces/workspaces.routes');
  workspaceRoutes = workspaceModule.default;
  projectWorkspaceRoutes = workspaceModule.projectWorkspaceRoutes;
  collaboratorRoutes = require('../src/modules/collaborators/collaborators.routes').default;
  jobRoutes = require('../src/modules/jobs/jobs.routes').default;
  const errorModule = require('../src/middleware/errorHandler');
  errorHandler = errorModule.errorHandler;
  notFoundHandler = errorModule.notFoundHandler;
  console.log('All modules loaded successfully');
} catch (err) {
  console.error('Module loading error:', err);
}

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
    platform: 'vercel',
    routesLoaded: !!authRoutes
  });
});

// Debug route
app.get('/api/debug', (_req: Request, res: Response) => {
  res.json({
    authRoutes: typeof authRoutes,
    projectRoutes: typeof projectRoutes,
    workspaceRoutes: typeof workspaceRoutes
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

import { Request } from 'express';

export enum Role {
  OWNER = 'OWNER',
  COLLABORATOR = 'COLLABORATOR',
  VIEWER = 'VIEWER',
}

export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum JobType {
  CODE_EXECUTION = 'CODE_EXECUTION',
  FILE_ANALYSIS = 'FILE_ANALYSIS',
}

export interface JwtPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export interface ProjectMemberContext extends AuthenticatedRequest {
  projectId?: string;
  memberRole?: Role;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Array<{ field?: string; message: string }>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WebSocketEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
  userId?: string;
  workspaceId?: string;
}

export interface FileChangeEvent {
  fileId: string;
  fileName: string;
  changeType: 'create' | 'update' | 'delete';
  content?: string;
  userId: string;
  timestamp: Date;
}

export interface CursorUpdate {
  userId: string;
  userName: string;
  fileId: string;
  position: {
    line: number;
    column: number;
  };
  selection?: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
}

export interface UserActivity {
  userId: string;
  userName: string;
  action: 'typing' | 'idle' | 'viewing';
  fileId?: string;
  timestamp: Date;
}

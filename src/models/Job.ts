import mongoose, { Document, Schema } from 'mongoose';

export interface IJob extends Document {
  _id: mongoose.Types.ObjectId;
  type: 'CODE_EXECUTION' | 'FILE_ANALYSIS';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  errorMessage?: string;
  attempts: number;
  maxAttempts: number;
  idempotencyKey?: string;
  workspaceId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>(
  {
    type: {
      type: String,
      enum: ['CODE_EXECUTION', 'FILE_ANALYSIS'],
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    result: {
      type: Schema.Types.Mixed,
    },
    errorMessage: {
      type: String,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ status: 1, createdAt: 1 });
jobSchema.index({ workspaceId: 1 });
jobSchema.index({ createdBy: 1 });
jobSchema.index({ idempotencyKey: 1 });

export const Job = mongoose.model<IJob>('Job', jobSchema);

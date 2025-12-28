import mongoose, { Document, Schema } from 'mongoose';

export interface IProjectMember extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: 'OWNER' | 'COLLABORATOR' | 'VIEWER';
  createdAt: Date;
  updatedAt: Date;
}

const projectMemberSchema = new Schema<IProjectMember>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['OWNER', 'COLLABORATOR', 'VIEWER'],
      default: 'VIEWER',
    },
  },
  {
    timestamps: true,
  }
);

projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });
projectMemberSchema.index({ userId: 1 });

export const ProjectMember = mongoose.model<IProjectMember>('ProjectMember', projectMemberSchema);

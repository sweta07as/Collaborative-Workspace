import {
  registerSchema,
  loginSchema,
  createProjectSchema,
  createWorkspaceSchema,
  inviteCollaboratorSchema,
  createJobSchema,
  paginationSchema,
} from '../../src/shared/validation';

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'John Doe',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'Password123',
        name: 'John Doe',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject weak password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
        name: 'John Doe',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'John Doe',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short name', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'J',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'anypassword',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('createProjectSchema', () => {
    it('should validate correct project data', () => {
      const validData = {
        name: 'My Project',
        description: 'A test project',
      };

      const result = createProjectSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept project without description', () => {
      const validData = {
        name: 'My Project',
      };

      const result = createProjectSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
      };

      const result = createProjectSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('createWorkspaceSchema', () => {
    it('should validate correct workspace data', () => {
      const validData = {
        name: 'Development',
      };

      const result = createWorkspaceSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
      };

      const result = createWorkspaceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('inviteCollaboratorSchema', () => {
    it('should validate correct invite data', () => {
      const validData = {
        email: 'collaborator@example.com',
        role: 'COLLABORATOR',
      };

      const result = inviteCollaboratorSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept VIEWER role', () => {
      const validData = {
        email: 'viewer@example.com',
        role: 'VIEWER',
      };

      const result = inviteCollaboratorSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject OWNER role', () => {
      const invalidData = {
        email: 'owner@example.com',
        role: 'OWNER',
      };

      const result = inviteCollaboratorSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('createJobSchema', () => {
    it('should validate correct job data', () => {
      const validData = {
        type: 'CODE_EXECUTION',
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        payload: {
          code: 'console.log("Hello")',
          language: 'javascript',
        },
      };

      const result = createJobSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate FILE_ANALYSIS type', () => {
      const validData = {
        type: 'FILE_ANALYSIS',
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        payload: {
          fileId: 'file-123',
        },
      };

      const result = createJobSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid job type', () => {
      const invalidData = {
        type: 'INVALID_TYPE',
        workspaceId: '123e4567-e89b-12d3-a456-426614174000',
        payload: {},
      };

      const result = createJobSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        type: 'CODE_EXECUTION',
        workspaceId: 'not-a-uuid',
        payload: {},
      };

      const result = createJobSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('paginationSchema', () => {
    it('should use default values', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should accept custom values', () => {
      const result = paginationSchema.safeParse({ page: 5, limit: 50 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should reject limit over 100', () => {
      const result = paginationSchema.safeParse({ page: 1, limit: 150 });
      expect(result.success).toBe(false);
    });

    it('should reject page less than 1', () => {
      const result = paginationSchema.safeParse({ page: 0, limit: 20 });
      expect(result.success).toBe(false);
    });
  });
});

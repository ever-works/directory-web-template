import { UserDbService } from '@/lib/services/user-db.service';
import { 
  AuthUserData, 
  CreateUserRequest, 
  UpdateUserRequest, 
  UserListOptions,
  AuthUserListResponse,
  userValidationSchema,
  updateUserValidationSchema
} from '@/lib/types/user';

export class UserRepository {
  private userDbService: UserDbService;

  constructor() {
    this.userDbService = new UserDbService();
  }

  /**
   * Get all users with filtering and pagination
   */
  async findAll(options: UserListOptions = {}): Promise<AuthUserListResponse> {
    try {
      const result = await this.userDbService.findUsers(options);
      return {
        users: result.users,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      };
    } catch (error) {
      console.error('Error finding users:', error);
      throw new Error('Failed to retrieve users');
    }
  }

  /**
   * Get a single user by ID
   */
  async findById(id: string): Promise<AuthUserData | null> {
    try {
      return await this.userDbService.findById(id);
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw new Error('Failed to retrieve user');
    }
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserRequest): Promise<AuthUserData> {
    try {
      // Validate input data
      // Only validate persisted auth fields
      const validatedData = userValidationSchema
        .pick({ email: true, password: true })
        .parse(data);

      // Enforce email uniqueness before create
      const exists = await this.userDbService.emailExists(validatedData.email);
      if (exists) {
        throw new Error('Email already in use');
      }

      // Create user (duplicate checking is handled in the service)
      const user = await this.userDbService.createUser(validatedData);
      return user;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Update an existing user
   */
  async update(id: string, data: UpdateUserRequest): Promise<AuthUserData> {
    try {
      // Validate input data
      const validatedData = updateUserValidationSchema.parse(data);

      // Check if user exists
      const existingUser = await this.userDbService.findById(id);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Update user (duplicate checking is handled in the service)
      const updatedUser = await this.userDbService.updateUser(id, validatedData);
      return updatedUser;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * Delete a user
   */
  async delete(id: string): Promise<void> {
    try {
      // Check if user exists
      const existingUser = await this.userDbService.findById(id);
      if (!existingUser) {
        throw new Error('User not found');
      }

      // Note: Role-based deletion checks are now handled at the profile level
      // since AuthUserData only contains authentication information

      await this.userDbService.deleteUser(id);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Get user statistics
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    try {
      return await this.userDbService.getUserStats();
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw new Error('Failed to retrieve user statistics');
    }
  }

  /**
   * Check if username exists
   */
  async usernameExists(username: string, excludeId?: string): Promise<boolean> {
    try {
      return await this.userDbService.clientProfileUsernameExists(username, excludeId);
    } catch (error) {
      console.error('Error checking username existence:', error);
      throw new Error('Failed to check username availability');
    }
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    try {
      // For now, delegate to service readUsers and check in memory
      const all = await this.userDbService.readUsers();
      return all.some(u => u.email.toLowerCase() === email.toLowerCase() && (!excludeId || u.id !== excludeId));
    } catch (error) {
      console.error('Error checking email existence:', error);
      throw new Error('Failed to check email availability');
    }
  }

  /**
   * Get all users (for dropdowns, etc.)
   */
  async getAllUsers(): Promise<AuthUserData[]> {
    try {
      return await this.userDbService.readUsers();
    } catch (error) {
      console.error('Error getting all users:', error);
      throw new Error('Failed to retrieve all users');
    }
  }
} 
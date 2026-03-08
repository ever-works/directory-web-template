import { RoleDbService } from '@/lib/services/role-db.service';
import { 
  RoleData, 
  CreateRoleRequest, 
  UpdateRoleRequest, 
  RoleListOptions, 
  RoleWithCount 
} from '@/lib/types/role';

export class RoleRepository {
  private dbService: RoleDbService;

  constructor() {
    this.dbService = new RoleDbService();
  }

  async findAll(): Promise<RoleData[]> {
    return this.dbService.readRoles();
  }

  async findAllPaginated(options: RoleListOptions = {}): Promise<{
    roles: RoleData[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.dbService.findRoles(options);
  }

  async findById(id: string): Promise<RoleData | null> {
    return this.dbService.findById(id);
  }
  async findByName(name: string): Promise<RoleData | null> {
    return this.dbService.findBy('name',name);
  }

  async exists(id: string, options?: { includeDeleted?: boolean }): Promise<boolean> {
    return this.dbService.exists(id, options);
  }

  async create(data: CreateRoleRequest): Promise<RoleData> {
    return this.dbService.createRole(data);
  }

  async update(id: string, data: UpdateRoleRequest): Promise<RoleData> {
    return this.dbService.updateRole(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.dbService.deleteRole(id);
  }

  async hardDelete(id: string): Promise<void> {
    return this.dbService.hardDeleteRole(id);
  }

  async findWithCounts(): Promise<RoleWithCount[]> {
    const roles = await this.findAll();
    
    // For now, we'll return roles without user counts
    // TODO: Implement user count logic when user-role assignment is added
    return roles.map(role => ({
      ...role,
      userCount: 0, // Placeholder
    }));
  }

  async findActive(): Promise<RoleData[]> {
    const result = await this.dbService.findRoles({ status: 'active', limit: 1000 });
    return result.roles;
  }
} 
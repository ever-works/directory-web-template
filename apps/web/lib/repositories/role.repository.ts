import { RoleDbService } from '@/lib/services/role-db.service';
import { 
  RoleData, 
  CreateRoleRequest, 
  UpdateRoleRequest, 
  RoleListOptions, 
  RoleWithCount 
} from '@/lib/types/role';

/**
 * Thin repository wrapper around {@link RoleDbService}.
 *
 * **Purpose**: hold to the repository-pattern interface that the
 * rest of `apps/web/lib/repositories/` follows, so controllers /
 * services don't import the DB-service class directly. Most methods
 * are 1:1 delegates.
 *
 * **Behavioural caveats worth flagging:**
 *
 *   - **`findWithCounts()` returns `userCount: 0` for every role**
 *     (TODO inline). Any caller filtering / displaying user counts
 *     gets misleading data. If the admin "X users in this role"
 *     surface starts shipping wrong numbers, this is the cause.
 *
 *   - **`hardDelete()` bypasses the soft-delete invariant** —
 *     gone from disk, no `deletedAt` flag for forensics. Use only
 *     for orphan / test data cleanup; default to `delete()` for
 *     all user-driven deletions.
 *
 *   - **`findByName()` inherits the [findBy soft-delete gap]**
 *     from `RoleDbService` — returns tombstoned rows. If callers
 *     are seeing "this role was deleted but still appears in
 *     lookups", that's why.
 *
 *   - **`findActive()` hard-caps at 1000** — no pagination. A
 *     deployment with >1000 active roles silently truncates the
 *     list. Switch to paginated read if that's plausible.
 *
 *   - **`new RoleDbService()` per repository instance** — caller
 *     instantiating many repositories pays for many service
 *     objects. Cheap (no DB connection in constructor) but worth
 *     noting if `RoleDbService` ever takes on per-instance state.
 */
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
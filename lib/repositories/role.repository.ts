import { RoleDbService } from '@/lib/services/role-db.service';
import { RoleData, CreateRoleRequest, UpdateRoleRequest, RoleListOptions, RoleWithCount } from '@/lib/types/role';

export class RoleRepository {
	private dbService: RoleDbService;

	constructor() {
		this.dbService = new RoleDbService();
	}

	async findAll(tenantId: string): Promise<RoleData[]> {
		return this.dbService.readRoles(tenantId);
	}

	async findAllPaginated(
		tenantId: string,
		options: RoleListOptions = {}
	): Promise<{
		roles: RoleData[];
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	}> {
		return this.dbService.findRoles(tenantId, options);
	}

	async findById(id: string, tenantId: string): Promise<RoleData | null> {
		return this.dbService.findById(id, tenantId);
	}
	async findByName(name: string, tenantId: string): Promise<RoleData | null> {
		return this.dbService.findBy(tenantId, 'name', name);
	}

	async exists(id: string, tenantId: string, options?: { includeDeleted?: boolean }): Promise<boolean> {
		return this.dbService.exists(id, tenantId, options);
	}

	async create(data: CreateRoleRequest, tenantId: string): Promise<RoleData> {
		return this.dbService.createRole(data, tenantId);
	}

	async update(id: string, data: UpdateRoleRequest, tenantId: string): Promise<RoleData> {
		return this.dbService.updateRole(id, data, tenantId);
	}

	async delete(id: string, tenantId: string): Promise<void> {
		return this.dbService.deleteRole(id, tenantId);
	}

	async hardDelete(id: string, tenantId: string): Promise<void> {
		return this.dbService.hardDeleteRole(id, tenantId);
	}

	async findWithCounts(tenantId: string): Promise<RoleWithCount[]> {
		const roles = await this.findAll(tenantId);

		// For now, we'll return roles without user counts
		// TODO: Implement user count logic when user-role assignment is added
		return roles.map((role) => ({
			...role,
			userCount: 0 // Placeholder
		}));
	}

	async findActive(tenantId: string): Promise<RoleData[]> {
		const result = await this.dbService.findRoles(tenantId, { status: 'active', limit: 1000 });
		return result.roles;
	}
}

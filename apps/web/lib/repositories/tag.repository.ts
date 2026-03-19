import { TagData, CreateTagRequest, UpdateTagRequest, TagListResponse } from '@/lib/types/tag';
import { createTagGitService } from '@/lib/services/tag-git.service';
import { getContentPath } from '@/lib/lib';
import { coreConfig } from '@/lib/config/config-service';

export class TagRepository {
  private gitService: any = null;

  private async getGitService() {
    if (!this.gitService) {
      // Parse DATA_REPOSITORY URL to extract owner and repo
      const dataRepo = coreConfig.content.dataRepository;
      if (!dataRepo) {
        throw new Error('DATA_REPOSITORY not configured. Please set DATA_REPOSITORY environment variable.');
      }

      // Extract owner and repo from URL like: https://github.com/ever-co/awesome-time-tracking-data
      const match = dataRepo.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        throw new Error('Invalid DATA_REPOSITORY format. Expected: https://github.com/owner/repo');
      }

      const [, owner, repo] = match;
      const gitConfig = {
        owner,
        repo,
        token: coreConfig.content.ghToken || '',
        branch: coreConfig.content.githubBranch || 'main',
        dataDir: getContentPath(), // Use dynamic path (local: .content, Vercel: /tmp/.content)
        tagsFile: 'tags.yml',
      };

      if (!gitConfig.token) {
        throw new Error('GitHub token not configured. Please set GH_TOKEN environment variable.');
      }

      this.gitService = await createTagGitService(gitConfig);
    }
    return this.gitService;
  }

  async findAll(): Promise<TagData[]> {
    const gitService = await this.getGitService();
    const tags = await gitService.getAllTags();
    return this.sortTags(tags);
  }

  async findAllPaginated(page: number = 1, limit: number = 10): Promise<TagListResponse> {
    const gitService = await this.getGitService();
    return await gitService.getTagsPaginated(page, limit);
  }

  async findById(id: string): Promise<TagData | null> {
    const gitService = await this.getGitService();
    return await gitService.findTagById(id);
  }

  async findByName(name: string): Promise<TagData | null> {
    const gitService = await this.getGitService();
    return await gitService.findTagByName(name);
  }

  async create(data: CreateTagRequest): Promise<TagData> {
    this.validateCreateData(data);
    
    const gitService = await this.getGitService();
    return await gitService.createTag(data);
  }

  async update(id: string, data: UpdateTagRequest): Promise<TagData> {
    this.validateUpdateData(id, data);
    
    const gitService = await this.getGitService();
    return await gitService.updateTag(id, data);
  }

  async delete(id: string): Promise<void> {
    const gitService = await this.getGitService();
    await gitService.deleteTag(id);
  }

  async checkDuplicateName(name: string, excludeId?: string): Promise<boolean> {
    const gitService = await this.getGitService();
    return await gitService.checkDuplicateName(name, excludeId);
  }

  async checkDuplicateId(id: string): Promise<boolean> {
    const gitService = await this.getGitService();
    return await gitService.checkDuplicateId(id);
  }

  private validateCreateData(data: CreateTagRequest): void {
    if (!data.id || data.id.trim().length === 0) {
      throw new Error('Tag ID is required');
    }
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Tag name is required');
    }
    
    // Validate ID format (lowercase, hyphens, numbers only)
    const idRegex = /^[a-z0-9-]+$/;
    if (!idRegex.test(data.id)) {
      throw new Error('Tag ID must contain only lowercase letters, numbers, and hyphens');
    }
    
    if (data.id.length < 2 || data.id.length > 50) {
      throw new Error('Tag ID must be between 2 and 50 characters');
    }
    
    if (data.name.length < 2 || data.name.length > 50) {
      throw new Error('Tag name must be between 2 and 50 characters');
    }
  }

  private validateUpdateData(id: string, data: UpdateTagRequest): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Tag ID is required');
    }
    
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new Error('Tag name cannot be empty');
      }
      if (data.name.length < 2 || data.name.length > 50) {
        throw new Error('Tag name must be between 2 and 50 characters');
      }
    }
  }

  private sortTags(tags: TagData[]): TagData[] {
    return tags.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export const tagRepository = new TagRepository(); 
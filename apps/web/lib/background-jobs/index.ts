// Export types
export type { 
  BackgroundJobManager, 
  JobStatus, 
  JobMetrics, 
  JobStatusType,
  TriggerDevConfig 
} from './types';

// Export implementations
export { LocalJobManager } from './local-job-manager';

// Export factory functions
export { 
  createJobManager, 
  getJobManager, 
  resetJobManager 
} from './job-factory';

// Export configuration helpers
export { 
  getTriggerDevConfig, 
  shouldUseTriggerDev 
} from './config';

// Re-export for convenience
export { getJobManager as getBackgroundJobManager } from './job-factory';

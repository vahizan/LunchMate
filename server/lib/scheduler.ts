import { config } from 'dotenv';
import cron from 'node-cron';
import { ScraperService, CrowdLevelData, ScrapingResult } from './scraper';

// Load environment variables
config();

/**
 * Priority levels for scheduling scraping tasks
 */
export enum ScrapingPriority {
  HIGH = 'high',       // Immediate or near-immediate execution
  MEDIUM = 'medium',   // Standard priority
  LOW = 'low'          // Background, non-urgent tasks
}

/**
 * Status of a scraping job
 */
export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Interface for a restaurant to be scraped
 */
export interface ScrapingTarget {
  id: string;
  name: string;
  location?: string;
  lastScraped?: Date;
  popularity?: number; // 0-100 scale to determine scraping frequency
}

/**
 * Interface for a scheduled scraping job
 */
export interface ScrapingJob {
  id: string;
  target: ScrapingTarget;
  priority: ScrapingPriority;
  status: JobStatus;
  createdAt: Date;
  scheduledFor: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: ScrapingResult;
  retryCount: number;
  maxRetries: number;
}

/**
 * Interface for scheduler configuration
 */
export interface SchedulerConfig {
  // Concurrency settings
  maxConcurrentJobs: number;
  
  // Scheduling intervals (in cron format)
  highPriorityInterval: string;
  mediumPriorityInterval: string;
  lowPriorityInterval: string;
  
  // Popular restaurants update frequency (in cron format)
  popularRestaurantsInterval: string;
  
  // Retry settings
  maxRetries: number;
  retryDelayBase: number; // Base delay in ms for exponential backoff
  
  // Batch processing
  batchSize: number;
  
  // Proxy usage limits
  maxProxyUsagePerBatch: number;
}

/**
 * Scheduler Service for managing scraping jobs
 */
export class Scheduler {
  private config: SchedulerConfig;
  private scraperService: ScraperService;
  private proxyManager: ProxyManager;
  
  // Job queues by priority
  private highPriorityQueue: ScrapingJob[] = [];
  private mediumPriorityQueue: ScrapingJob[] = [];
  private lowPriorityQueue: ScrapingJob[] = [];
  
  // Active jobs
  private activeJobs: Map<string, ScrapingJob> = new Map();
  
  // Scheduled cron jobs
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  
  // Job history (completed and failed jobs)
  private jobHistory: ScrapingJob[] = [];
  
  // Callback for when a job is completed
  private onJobCompleted?: (job: ScrapingJob) => void;
  
  /**
   * Creates a new instance of the Scheduler
   * @param config Configuration options for the scheduler
   * @param scraperService Optional custom scraper service instance
   * @param proxyManager Optional custom proxy manager instance
   */
  constructor(
    config: Partial<SchedulerConfig> = {},
    scraperService?: ScraperService,
  ) {
    // Default configuration
    this.config = {
      maxConcurrentJobs: parseInt(process.env.SCHEDULER_MAX_CONCURRENT_JOBS || '3', 10),
      highPriorityInterval: process.env.SCHEDULER_HIGH_PRIORITY_INTERVAL || '*/5 * * * *', // Every 5 minutes
      mediumPriorityInterval: process.env.SCHEDULER_MEDIUM_PRIORITY_INTERVAL || '*/15 * * * *', // Every 15 minutes
      lowPriorityInterval: process.env.SCHEDULER_LOW_PRIORITY_INTERVAL || '0 */1 * * *', // Every hour
      popularRestaurantsInterval: process.env.SCHEDULER_POPULAR_RESTAURANTS_INTERVAL || '0 */2 * * *', // Every 2 hours
      maxRetries: parseInt(process.env.SCHEDULER_MAX_RETRIES || '3', 10),
      retryDelayBase: parseInt(process.env.SCHEDULER_RETRY_DELAY_BASE || '5000', 10), // 5 seconds
      batchSize: parseInt(process.env.SCHEDULER_BATCH_SIZE || '5', 10),
      maxProxyUsagePerBatch: parseInt(process.env.SCHEDULER_MAX_PROXY_USAGE_PER_BATCH || '10', 10),
      ...config
    };
    
    // Use provided services or create new instances
    this.scraperService = scraperService || new ScraperService();
    
    console.log('Scheduler initialized with config:', {
      maxConcurrentJobs: this.config.maxConcurrentJobs,
      highPriorityInterval: this.config.highPriorityInterval,
      mediumPriorityInterval: this.config.mediumPriorityInterval,
      lowPriorityInterval: this.config.lowPriorityInterval,
      popularRestaurantsInterval: this.config.popularRestaurantsInterval,
      maxRetries: this.config.maxRetries,
      batchSize: this.config.batchSize
    });
  }
  
  /**
   * Start the scheduler
   */
  public start(): void {
    console.log('Starting scheduler...');
    
    // Schedule processing of each priority queue
    this.cronJobs.set('highPriority', cron.schedule(this.config.highPriorityInterval, () => {
      this.processQueue(ScrapingPriority.HIGH);
    }));
    
    this.cronJobs.set('mediumPriority', cron.schedule(this.config.mediumPriorityInterval, () => {
      this.processQueue(ScrapingPriority.MEDIUM);
    }));
    
    this.cronJobs.set('lowPriority', cron.schedule(this.config.lowPriorityInterval, () => {
      this.processQueue(ScrapingPriority.LOW);
    }));
    
    console.log('Scheduler started');
  }
  
  /**
   * Stop the scheduler
   */
  public stop(): void {
    console.log('Stopping scheduler...');
    
    // Stop all cron jobs
    this.cronJobs.forEach(job => job.stop());
    this.cronJobs.clear();
    
    console.log('Scheduler stopped');
  }
  
  /**
   * Schedule a scraping job
   * @param target The restaurant to scrape
   * @param priority The priority of the job
   * @param scheduledFor Optional specific time to schedule the job for
   * @returns The created job
   */
  public scheduleJob(
    target: ScrapingTarget,
    priority: ScrapingPriority = ScrapingPriority.MEDIUM,
    scheduledFor: Date = new Date()
  ): ScrapingJob {
    const job: ScrapingJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      target,
      priority,
      status: JobStatus.PENDING,
      createdAt: new Date(),
      scheduledFor,
      retryCount: 0,
      maxRetries: this.config.maxRetries
    };
    
    console.log(`Scheduling job ${job.id} for ${target.name} with ${priority} priority`);
    
    // Add to appropriate queue based on priority
    switch (priority) {
      case ScrapingPriority.HIGH:
        this.highPriorityQueue.push(job);
        break;
      case ScrapingPriority.MEDIUM:
        this.mediumPriorityQueue.push(job);
        break;
      case ScrapingPriority.LOW:
        this.lowPriorityQueue.push(job);
        break;
    }
    
    // If it's a high priority job and scheduled for now, process immediately
    if (priority === ScrapingPriority.HIGH && scheduledFor <= new Date()) {
      setImmediate(() => this.processQueue(ScrapingPriority.HIGH));
    }
    
    return job;
  }
  
  /**
   * Schedule batch scraping for multiple restaurants
   * @param targets Array of restaurants to scrape
   * @param priority The priority of the jobs
   * @returns Array of created jobs
   */
  public scheduleBatch(
    targets: ScrapingTarget[],
    priority: ScrapingPriority = ScrapingPriority.MEDIUM
  ): ScrapingJob[] {
    console.log(`Scheduling batch of ${targets.length} restaurants with ${priority} priority`);
    
    return targets.map(target => this.scheduleJob(target, priority));
  }
  
  /**
   * Schedule regular updates for popular restaurants
   * @param popularRestaurants Array of popular restaurants to regularly update
   */
  public schedulePopularRestaurants(popularRestaurants: ScrapingTarget[]): void {
    console.log(`Setting up regular updates for ${popularRestaurants.length} popular restaurants`);
    
    // Stop existing cron job if it exists
    const existingJob = this.cronJobs.get('popularRestaurants');
    if (existingJob) {
      existingJob.stop();
    }
    
    // Create new cron job for popular restaurants
    this.cronJobs.set('popularRestaurants', cron.schedule(this.config.popularRestaurantsInterval, () => {
      console.log(`Running scheduled update for ${popularRestaurants.length} popular restaurants`);
      
      // Schedule batch with priority based on restaurant popularity
      popularRestaurants.forEach(restaurant => {
        let priority = ScrapingPriority.LOW;
        
        // Determine priority based on popularity
        if (restaurant.popularity && restaurant.popularity >= 80) {
          priority = ScrapingPriority.HIGH;
        } else if (restaurant.popularity && restaurant.popularity >= 50) {
          priority = ScrapingPriority.MEDIUM;
        }
        
        this.scheduleJob(restaurant, priority);
      });
    }));
    
    console.log(`Regular updates for popular restaurants scheduled with interval: ${this.config.popularRestaurantsInterval}`);
  }
  
  /**
   * Cancel a scheduled job
   * @param jobId The ID of the job to cancel
   * @returns True if the job was cancelled, false otherwise
   */
  public cancelJob(jobId: string): boolean {
    // Check active jobs
    if (this.activeJobs.has(jobId)) {
      const job = this.activeJobs.get(jobId)!;
      job.status = JobStatus.CANCELLED;
      this.jobHistory.push(job);
      this.activeJobs.delete(jobId);
      return true;
    }
    
    // Check each queue
    const queues = [
      { queue: this.highPriorityQueue, priority: ScrapingPriority.HIGH },
      { queue: this.mediumPriorityQueue, priority: ScrapingPriority.MEDIUM },
      { queue: this.lowPriorityQueue, priority: ScrapingPriority.LOW }
    ];
    
    for (const { queue, priority } of queues) {
      const index = queue.findIndex(job => job.id === jobId);
      if (index !== -1) {
        const job = queue[index];
        job.status = JobStatus.CANCELLED;
        this.jobHistory.push(job);
        queue.splice(index, 1);
        console.log(`Cancelled ${priority} priority job ${jobId}`);
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Process a priority queue
   * @param priority The priority queue to process
   * @private
   */
  private async processQueue(priority: ScrapingPriority): Promise<void> {
    // Get the appropriate queue
    let queue: ScrapingJob[];
    switch (priority) {
      case ScrapingPriority.HIGH:
        queue = this.highPriorityQueue;
        break;
      case ScrapingPriority.MEDIUM:
        queue = this.mediumPriorityQueue;
        break;
      case ScrapingPriority.LOW:
        queue = this.lowPriorityQueue;
        break;
      default:
        return;
    }
    
    if (queue.length === 0) {
      return;
    }
    
    console.log(`Processing ${priority} priority queue with ${queue.length} jobs`);
    
    // Check if we can run more jobs
    const availableSlots = this.config.maxConcurrentJobs - this.activeJobs.size;
    if (availableSlots <= 0) {
      console.log('Maximum concurrent jobs reached, waiting for jobs to complete');
      return;
    }
    
    // Sort queue by scheduled time
    queue.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
    
    // Get jobs that are scheduled for now or earlier
    const now = new Date();
    const readyJobs = queue.filter(job => job.scheduledFor <= now);
    
    if (readyJobs.length === 0) {
      return;
    }
    
    console.log(`Found ${readyJobs.length} ready jobs in ${priority} queue`);
    
    // Process jobs up to available slots
    const jobsToProcess = readyJobs.slice(0, availableSlots);
    
    // Remove jobs from queue
    jobsToProcess.forEach(job => {
      const index = queue.findIndex(queuedJob => queuedJob.id === job.id);
      if (index !== -1) {
        queue.splice(index, 1);
      }
    });
    
    // Process jobs
    for (const job of jobsToProcess) {
      this.processJob(job);
    }
  }
  
  /**
   * Process a single job
   * @param job The job to process
   * @private
   */
  private async processJob(job: ScrapingJob): Promise<void> {
    console.log(`Processing job ${job.id} for ${job.target.name}`);
    
    // Update job status
    job.status = JobStatus.RUNNING;
    job.startedAt = new Date();
    this.activeJobs.set(job.id, job);
    
    try {
      // Extract crowd level data
      const result = await this.scraperService.extractCrowdLevelData(
        job.target.name,
        job.target.location
      );
      
      // Update job with result
      job.result = result;
      
      if (result.success) {
        job.status = JobStatus.COMPLETED;
        job.completedAt = new Date();
        console.log(`Job ${job.id} completed successfully`);
        
        // Update target's last scraped time
        job.target.lastScraped = new Date();
      } else {
        // Handle failure with retry logic
        await this.handleJobFailure(job, new Error(result.error || 'Unknown error'));
      }
    } catch (error) {
      // Handle unexpected errors
      await this.handleJobFailure(job, error instanceof Error ? error : new Error(String(error)));
    } finally {
      // Remove from active jobs if completed or failed
      if ((job.status as JobStatus) === JobStatus.COMPLETED || (job.status as JobStatus) === JobStatus.FAILED) {
        this.activeJobs.delete(job.id);
        this.jobHistory.push(job);
        
        // Call completion callback if provided
        if (this.onJobCompleted) {
          this.onJobCompleted(job);
        }
      }
    }
  }
  
  /**
   * Handle job failure with retry logic
   * @param job The failed job
   * @param error The error that occurred
   * @private
   */
  private async handleJobFailure(job: ScrapingJob, error: Error): Promise<void> {
    console.error(`Job ${job.id} failed:`, error.message);
    
    job.retryCount++;
    
    if (job.retryCount <= job.maxRetries) {
      console.log(`Scheduling retry ${job.retryCount}/${job.maxRetries} for job ${job.id}`);
      
      // Calculate delay with exponential backoff
      const delay = this.config.retryDelayBase * Math.pow(2, job.retryCount - 1);
      
      // Schedule retry
      const retryTime = new Date(Date.now() + delay);
      job.scheduledFor = retryTime;
      job.status = JobStatus.PENDING;
      
      // Add back to appropriate queue
      switch (job.priority) {
        case ScrapingPriority.HIGH:
          this.highPriorityQueue.push(job);
          break;
        case ScrapingPriority.MEDIUM:
          this.mediumPriorityQueue.push(job);
          break;
        case ScrapingPriority.LOW:
          this.lowPriorityQueue.push(job);
          break;
      }
      
      // Remove from active jobs
      this.activeJobs.delete(job.id);
    } else {
      console.log(`Job ${job.id} failed after ${job.retryCount} retries`);
      job.status = JobStatus.FAILED;
      job.completedAt = new Date();
    }
  }
  
  /**
   * Get all pending jobs
   * @returns Array of pending jobs
   */
  public getPendingJobs(): ScrapingJob[] {
    return [
      ...this.highPriorityQueue,
      ...this.mediumPriorityQueue,
      ...this.lowPriorityQueue
    ];
  }
  
  /**
   * Get all active jobs
   * @returns Array of active jobs
   */
  public getActiveJobs(): ScrapingJob[] {
    return Array.from(this.activeJobs.values());
  }
  
  /**
   * Get job history (completed and failed jobs)
   * @param limit Maximum number of jobs to return
   * @returns Array of completed and failed jobs
   */
  public getJobHistory(limit: number = 100): ScrapingJob[] {
    // Sort by completion time, most recent first
    return [...this.jobHistory]
      .sort((a, b) => {
        const timeA = a.completedAt?.getTime() || 0;
        const timeB = b.completedAt?.getTime() || 0;
        return timeB - timeA;
      })
      .slice(0, limit);
  }
  
  /**
   * Get a specific job by ID
   * @param jobId The ID of the job to get
   * @returns The job or undefined if not found
   */
  public getJob(jobId: string): ScrapingJob | undefined {
    // Check active jobs
    if (this.activeJobs.has(jobId)) {
      return this.activeJobs.get(jobId);
    }
    
    // Check queues
    const allQueues = [
      ...this.highPriorityQueue,
      ...this.mediumPriorityQueue,
      ...this.lowPriorityQueue
    ];
    
    const queuedJob = allQueues.find(job => job.id === jobId);
    if (queuedJob) {
      return queuedJob;
    }
    
    // Check history
    return this.jobHistory.find(job => job.id === jobId);
  }
  
  /**
   * Set a callback to be called when a job is completed
   * @param callback The callback function
   */
  public setJobCompletedCallback(callback: (job: ScrapingJob) => void): void {
    this.onJobCompleted = callback;
  }
  
  /**
   * Update scheduler configuration
   * @param newConfig New configuration options
   */
  public updateConfig(newConfig: Partial<SchedulerConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
    
    console.log('Scheduler configuration updated');
    
    // Restart scheduler to apply new configuration
    this.stop();
    this.start();
  }
  
  /**
   * Clear job history
   */
  public clearJobHistory(): void {
    this.jobHistory = [];
    console.log('Job history cleared');
  }
}

/**
 * Create and configure a scheduler instance with default settings
 * @returns A configured scheduler instance
 */
export function createScheduler(
  scraperService?: ScraperService,
): Scheduler {
  const scheduler = new Scheduler({}, scraperService);
  scheduler.start();
  return scheduler;
}

// Export a default instance with default configuration
export const defaultScheduler = new Scheduler();
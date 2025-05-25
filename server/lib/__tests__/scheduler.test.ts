import { Scheduler, ScrapingPriority, JobStatus, ScrapingTarget } from '../scheduler';
import { ScraperService } from '../scraper';

describe('Scheduler Service', () => {
  // Mock ScraperService
  const mockScraperService = {
    extractCrowdLevelData: jest.fn().mockResolvedValue({
      success: true,
      data: {
        restaurantName: 'Test Restaurant',
        crowdLevel: 'moderate',
        lastUpdated: new Date(),
        source: 'google'
      }
    }),
    batchProcess: jest.fn(),
    closeBrowser: jest.fn()
  } as unknown as ScraperService;


  // Test restaurant
  const testRestaurant: ScrapingTarget = {
    id: 'test-restaurant-1',
    name: 'Test Restaurant',
    location: 'New York',
    popularity: 75
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Scheduler should initialize with default config', () => {
    const scheduler = new Scheduler({}, mockScraperService);
    expect(scheduler).toBeDefined();
  });

  test('Scheduler should initialize with custom config', () => {
    const scheduler = new Scheduler({
      maxConcurrentJobs: 5,
      highPriorityInterval: '*/10 * * * *',
      batchSize: 10
    }, mockScraperService);
    
    expect(scheduler).toBeDefined();
  });

  test('Scheduler should schedule a job', () => {
    const scheduler = new Scheduler({}, mockScraperService);
    
    const job = scheduler.scheduleJob(testRestaurant, ScrapingPriority.HIGH);
    
    expect(job).toBeDefined();
    expect(job.target).toBe(testRestaurant);
    expect(job.priority).toBe(ScrapingPriority.HIGH);
    expect(job.status).toBe(JobStatus.PENDING);
  });

  test('Scheduler should schedule a batch of jobs', () => {
    const scheduler = new Scheduler({}, mockScraperService);
    
    const restaurants = [
      { ...testRestaurant, id: 'test-1', name: 'Restaurant 1' },
      { ...testRestaurant, id: 'test-2', name: 'Restaurant 2' },
      { ...testRestaurant, id: 'test-3', name: 'Restaurant 3' }
    ];
    
    const jobs = scheduler.scheduleBatch(restaurants, ScrapingPriority.MEDIUM);
    
    expect(jobs).toHaveLength(3);
    expect(jobs[0].priority).toBe(ScrapingPriority.MEDIUM);
    expect(jobs[1].target.name).toBe('Restaurant 2');
  });

  test('Scheduler should cancel a job', () => {
    const scheduler = new Scheduler({}, mockScraperService);
    
    const job = scheduler.scheduleJob(testRestaurant, ScrapingPriority.MEDIUM);
    const cancelled = scheduler.cancelJob(job.id);
    
    expect(cancelled).toBe(true);
    
    // Job should not be in pending jobs
    const pendingJobs = scheduler.getPendingJobs();
    expect(pendingJobs.find(j => j.id === job.id)).toBeUndefined();
  });

  test('Scheduler should schedule popular restaurants', () => {
    const scheduler = new Scheduler({}, mockScraperService);
    
    const popularRestaurants = [
      { ...testRestaurant, id: 'popular-1', name: 'Popular Restaurant 1', popularity: 90 },
      { ...testRestaurant, id: 'popular-2', name: 'Popular Restaurant 2', popularity: 85 }
    ];
    
    // Mock the cron.schedule method
    const mockCronSchedule = jest.fn().mockReturnValue({
      stop: jest.fn()
    });
    
    // @ts-ignore - Replace the real cron.schedule with our mock
    scheduler['cronJobs'].set = jest.fn();
    
    scheduler.schedulePopularRestaurants(popularRestaurants);
    
    // Verify that the cronJobs.set was called
    expect(scheduler['cronJobs'].set).toHaveBeenCalled();
  });

  test('Scheduler should update configuration', () => {
    const scheduler = new Scheduler({}, mockScraperService);
    
    // Mock the stop and start methods
    scheduler.stop = jest.fn();
    scheduler.start = jest.fn();
    
    scheduler.updateConfig({
      maxConcurrentJobs: 10,
      batchSize: 20
    });
    
    expect(scheduler.stop).toHaveBeenCalled();
    expect(scheduler.start).toHaveBeenCalled();
  });
});
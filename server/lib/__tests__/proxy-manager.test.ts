import { ProxyManager, ProxyDetails } from '../proxy-manager';
import { ProxyConfig } from '../scraper';

describe('Proxy Manager', () => {
  // Mock fetch to avoid actual network requests during tests
  global.fetch = jest.fn().mockImplementation(() => 
    Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve([
        {
          ip: '192.168.1.1',
          port: 8080,
          username: 'testuser',
          password: 'testpass',
          country: 'US',
          city: 'New York',
          state: 'NY'
        },
        {
          ip: '192.168.1.2',
          port: 8081,
          username: 'testuser2',
          password: 'testpass2',
          country: 'UK',
          city: 'London',
          state: null
        }
      ])
    })
  );

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('ProxyManager should initialize with default config', () => {
    const proxyManager = new ProxyManager();
    expect(proxyManager).toBeDefined();
  });

  test('ProxyManager should initialize with custom config', () => {
    const proxyManager = new ProxyManager({
      proxyProvider: {
        apiKey: 'test-api-key',
        baseUrl: 'https://test-proxy-api.com',
        username: 'test-username',
        password: 'test-password'
      },
      proxyRotationThreshold: 5,
      maxFailCount: 2,
      proxyRefreshInterval: 1800000,
      rateLimitDelay: 1000
    });
    expect(proxyManager).toBeDefined();
  });

  test('initialize should fetch proxies from provider', async () => {
    const proxyManager = new ProxyManager({
      proxyProvider: {
        apiKey: 'test-api-key',
        baseUrl: 'https://test-proxy-api.com'
      }
    });

    await proxyManager.initialize();
    
    expect(fetch).toHaveBeenCalledWith(
      'https://test-proxy-api.com/proxies',
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer test-api-key'
        }
      })
    );
    
    expect(proxyManager.getPoolSize()).toBe(2);
  });

  test('getProxy should return a proxy from the pool', async () => {
    const proxyManager = new ProxyManager({
      proxyProvider: {
        apiKey: 'test-api-key',
        baseUrl: 'https://test-proxy-api.com'
      }
    });

    await proxyManager.initialize();
    const proxy = await proxyManager.getProxy();
    
    expect(proxy).toBeDefined();
    expect(proxy?.server).toMatch(/^http:\/\/192\.168\.1\.[12]:\d{4}$/);
    
    if (proxy?.username && proxy?.password) {
      expect(proxy.username).toMatch(/^testuser\d?$/);
      expect(proxy.password).toMatch(/^testpass\d?$/);
    }
  });

  test('reportProxyFailure should increment fail count', async () => {
    const proxyManager = new ProxyManager({
      proxyProvider: {
        apiKey: 'test-api-key',
        baseUrl: 'https://test-proxy-api.com'
      },
      maxFailCount: 2
    });

    await proxyManager.initialize();
    const proxy = await proxyManager.getProxy();
    
    expect(proxy).toBeDefined();
    if (proxy) {
      proxyManager.reportProxyFailure(proxy, new Error('Test error'));
      
      // Get stats to verify failure was recorded
      const stats = proxyManager.getStats();
      expect(stats.failedRequests).toBe(1);
      
      // Report another failure to trigger deactivation
      proxyManager.reportProxyFailure(proxy, new Error('Test error 2'));
      
      // Verify proxy is deactivated
      expect(proxyManager.getActiveProxyCount()).toBe(1);
    }
  });

  test('reportProxySuccess should increment success count', async () => {
    const proxyManager = new ProxyManager({
      proxyProvider: {
        apiKey: 'test-api-key',
        baseUrl: 'https://test-proxy-api.com'
      }
    });

    await proxyManager.initialize();
    const proxy = await proxyManager.getProxy();
    
    expect(proxy).toBeDefined();
    if (proxy) {
      proxyManager.reportProxySuccess(proxy, 100);
      
      // Get stats to verify success was recorded
      const stats = proxyManager.getStats();
      expect(stats.successfulRequests).toBe(1);
      expect(stats.averageResponseTime).toBe(100);
    }
  });

  test('shouldRotateProxy should return true when threshold is reached', () => {
    const proxyManager = new ProxyManager({
      proxyRotationThreshold: 5
    });

    expect(proxyManager.shouldRotateProxy(4)).toBe(false);
    expect(proxyManager.shouldRotateProxy(5)).toBe(true);
    expect(proxyManager.shouldRotateProxy(6)).toBe(true);
  });

  test('applyRateLimit should delay execution', async () => {
    const proxyManager = new ProxyManager({
      rateLimitDelay: 100
    });

    const startTime = Date.now();
    await proxyManager.applyRateLimit();
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeGreaterThanOrEqual(90); // Allow for small timing variations
  });

  test('getAllProxies should return all proxies in the pool', async () => {
    const proxyManager = new ProxyManager({
      proxyProvider: {
        apiKey: 'test-api-key',
        baseUrl: 'https://test-proxy-api.com'
      }
    });

    await proxyManager.initialize();
    const proxies = proxyManager.getAllProxies();
    
    expect(proxies).toHaveLength(2);
    expect(proxies[0].server).toBe('192.168.1.1');
    expect(proxies[1].server).toBe('192.168.1.2');
  });
});
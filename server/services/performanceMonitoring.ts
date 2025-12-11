interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  type: "api" | "database" | "job" | "websocket";
  metadata?: any;
}

interface PerformanceStats {
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  totalRequests: number;
  p50: number;
  p95: number;
  p99: number;
}

const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 10000;

/**
 * Record a performance metric
 */
export function recordMetric(
  name: string,
  duration: number,
  type: "api" | "database" | "job" | "websocket",
  metadata?: any
) {
  metrics.unshift({
    name,
    duration,
    timestamp: new Date(),
    type,
    metadata,
  });

  // Keep only last MAX_METRICS entries
  if (metrics.length > MAX_METRICS) {
    metrics.pop();
  }
}

/**
 * Get metrics by type
 */
export function getMetricsByType(type: "api" | "database" | "job" | "websocket", limit: number = 100) {
  return metrics.filter(m => m.type === type).slice(0, limit);
}

/**
 * Calculate percentile
 */
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Get performance statistics for a type
 */
export function getPerformanceStats(type: "api" | "database" | "job" | "websocket"): PerformanceStats {
  const typeMetrics = metrics.filter(m => m.type === type);
  
  if (typeMetrics.length === 0) {
    return {
      avgResponseTime: 0,
      minResponseTime: 0,
      maxResponseTime: 0,
      totalRequests: 0,
      p50: 0,
      p95: 0,
      p99: 0,
    };
  }

  const durations = typeMetrics.map(m => m.duration);
  const sum = durations.reduce((a, b) => a + b, 0);

  return {
    avgResponseTime: sum / durations.length,
    minResponseTime: Math.min(...durations),
    maxResponseTime: Math.max(...durations),
    totalRequests: typeMetrics.length,
    p50: calculatePercentile(durations, 50),
    p95: calculatePercentile(durations, 95),
    p99: calculatePercentile(durations, 99),
  };
}

/**
 * Get all performance statistics
 */
export function getAllPerformanceStats() {
  return {
    api: getPerformanceStats("api"),
    database: getPerformanceStats("database"),
    job: getPerformanceStats("job"),
    websocket: getPerformanceStats("websocket"),
    totalMetrics: metrics.length,
    oldestMetric: metrics.length > 0 ? metrics[metrics.length - 1].timestamp : null,
    newestMetric: metrics.length > 0 ? metrics[0].timestamp : null,
  };
}

/**
 * Get recent slow queries (database operations > 100ms)
 */
export function getSlowQueries(limit: number = 20) {
  return metrics
    .filter(m => m.type === "database" && m.duration > 100)
    .slice(0, limit);
}

/**
 * Get recent slow API calls (> 500ms)
 */
export function getSlowAPICalls(limit: number = 20) {
  return metrics
    .filter(m => m.type === "api" && m.duration > 500)
    .slice(0, limit);
}

/**
 * Clear all metrics (for testing or reset)
 */
export function clearMetrics() {
  metrics.length = 0;
}

/**
 * Middleware to track API response times
 */
export function createPerformanceMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    
    res.on("finish", () => {
      const duration = Date.now() - start;
      recordMetric(
        req.path || req.url,
        duration,
        "api",
        {
          method: req.method,
          statusCode: res.statusCode,
        }
      );
    });

    next();
  };
}

/**
 * Wrapper for database queries to track performance
 */
export async function trackDatabaseQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    
    recordMetric(queryName, duration, "database");
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    recordMetric(queryName, duration, "database", { error: true });
    throw error;
  }
}

/**
 * Track job execution time
 */
export async function trackJobExecution<T>(
  jobName: string,
  jobFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await jobFn();
    const duration = Date.now() - start;
    
    recordMetric(jobName, duration, "job", { success: true });
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    recordMetric(jobName, duration, "job", { success: false });
    throw error;
  }
}

/**
 * Track WebSocket connection metrics
 */
export function trackWebSocketConnection(connectionId: string, duration: number) {
  recordMetric(`ws_connection_${connectionId}`, duration, "websocket");
}

/**
 * Get performance alerts (metrics exceeding thresholds)
 */
export function getPerformanceAlerts() {
  const alerts = [];
  const stats = getAllPerformanceStats();

  // API response time alerts
  if (stats.api.avgResponseTime > 1000) {
    alerts.push({
      type: "warning",
      category: "api",
      message: `Average API response time is ${stats.api.avgResponseTime.toFixed(0)}ms (threshold: 1000ms)`,
    });
  }

  if (stats.api.p95 > 2000) {
    alerts.push({
      type: "error",
      category: "api",
      message: `95th percentile API response time is ${stats.api.p95.toFixed(0)}ms (threshold: 2000ms)`,
    });
  }

  // Database query alerts
  if (stats.database.avgResponseTime > 200) {
    alerts.push({
      type: "warning",
      category: "database",
      message: `Average database query time is ${stats.database.avgResponseTime.toFixed(0)}ms (threshold: 200ms)`,
    });
  }

  // Job execution alerts
  if (stats.job.maxResponseTime > 60000) {
    alerts.push({
      type: "warning",
      category: "job",
      message: `Longest job execution time is ${(stats.job.maxResponseTime / 1000).toFixed(0)}s (threshold: 60s)`,
    });
  }

  return alerts;
}

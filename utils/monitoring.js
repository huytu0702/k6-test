/**
 * K6 Real-time Monitoring Utilities
 * Provides functions for monitoring test execution in real-time
 */

import { Trend, Counter, Gauge, Rate } from 'k6/metrics';

// Custom Metrics for Monitoring
export const customMetrics = {
  // Response time trends
  apiResponseTime: new Trend('api_response_time', true),
  petEndpointTime: new Trend('pet_endpoint_time', true),
  storeEndpointTime: new Trend('store_endpoint_time', true),
  userEndpointTime: new Trend('user_endpoint_time', true),

  // Error tracking
  totalErrors: new Counter('total_errors'),
  authErrors: new Counter('auth_errors'),
  serverErrors: new Counter('server_errors'),
  clientErrors: new Counter('client_errors'),

  // Success rates
  successRate: new Rate('success_rate'),
  petApiSuccess: new Rate('pet_api_success'),
  storeApiSuccess: new Rate('store_api_success'),

  // Current state
  activeVUs: new Gauge('active_vus'),
  currentRPS: new Gauge('current_rps'),
};

/**
 * Record response metrics
 */
export function recordMetrics(response, endpoint, startTime) {
  const duration = Date.now() - startTime;

  // Record response time
  customMetrics.apiResponseTime.add(duration);

  // Record endpoint-specific metrics
  if (endpoint.includes('/pet')) {
    customMetrics.petEndpointTime.add(duration);
  } else if (endpoint.includes('/store')) {
    customMetrics.storeEndpointTime.add(duration);
  } else if (endpoint.includes('/user')) {
    customMetrics.userEndpointTime.add(duration);
  }

  // Record success/failure
  const isSuccess = response.status >= 200 && response.status < 300;
  customMetrics.successRate.add(isSuccess);

  if (endpoint.includes('/pet')) {
    customMetrics.petApiSuccess.add(isSuccess);
  } else if (endpoint.includes('/store')) {
    customMetrics.storeApiSuccess.add(isSuccess);
  }

  // Record errors
  if (!isSuccess) {
    customMetrics.totalErrors.add(1);

    if (response.status >= 400 && response.status < 500) {
      customMetrics.clientErrors.add(1);
      if (response.status === 401 || response.status === 403) {
        customMetrics.authErrors.add(1);
      }
    } else if (response.status >= 500) {
      customMetrics.serverErrors.add(1);
    }
  }
}

/**
 * Enhanced thresholds for monitoring
 */
export const monitoringThresholds = {
  // Response time thresholds
  'http_req_duration': [
    'p(50)<300',   // 50% of requests under 300ms
    'p(90)<500',   // 90% of requests under 500ms
    'p(95)<800',   // 95% of requests under 800ms
    'p(99)<1500',  // 99% of requests under 1.5s
  ],

  // Error rate thresholds
  'http_req_failed': ['rate<0.05'],  // Less than 5% error rate

  // Throughput thresholds
  'http_reqs': ['rate>10'],  // At least 10 requests per second

  // Check success rate
  'checks': ['rate>0.90'],  // 90% of checks should pass

  // Custom metric thresholds
  'api_response_time': ['p(95)<1000'],
  'success_rate': ['rate>0.95'],
  'total_errors': ['count<100'],
};

/**
 * Alert configuration
 */
export const alertConfig = {
  responseTime: {
    warning: 500,   // ms
    critical: 1000, // ms
  },
  errorRate: {
    warning: 0.05,  // 5%
    critical: 0.10, // 10%
  },
  throughput: {
    warning: 50,    // requests/sec
    critical: 10,   // requests/sec
  },
};

/**
 * Check if alert should be triggered
 */
export function checkAlerts(metrics) {
  const alerts = [];

  // Check response time
  if (metrics.http_req_duration && metrics.http_req_duration.avg) {
    const avgResponseTime = metrics.http_req_duration.avg;

    if (avgResponseTime > alertConfig.responseTime.critical) {
      alerts.push({
        severity: 'CRITICAL',
        metric: 'Response Time',
        value: avgResponseTime,
        threshold: alertConfig.responseTime.critical,
        message: `Average response time (${avgResponseTime.toFixed(2)}ms) exceeds critical threshold`
      });
    } else if (avgResponseTime > alertConfig.responseTime.warning) {
      alerts.push({
        severity: 'WARNING',
        metric: 'Response Time',
        value: avgResponseTime,
        threshold: alertConfig.responseTime.warning,
        message: `Average response time (${avgResponseTime.toFixed(2)}ms) exceeds warning threshold`
      });
    }
  }

  return alerts;
}

/**
 * Format metrics for display
 */
export function formatMetrics(metrics) {
  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalRequests: metrics.http_reqs?.count || 0,
      failedRequests: metrics.http_req_failed?.passes || 0,
      avgResponseTime: metrics.http_req_duration?.avg?.toFixed(2) || 0,
      p95ResponseTime: metrics.http_req_duration?.['p(95)']?.toFixed(2) || 0,
      checksPassRate: ((metrics.checks?.passes / metrics.checks?.fails) * 100).toFixed(2) || 0,
    }
  };
}

/**
 * Console logging with colors (for terminal output)
 */
export function logMetrics(iteration, response, duration) {
  const status = response.status;
  const statusSymbol = status >= 200 && status < 300 ? '✓' : '✗';

  console.log(`[${iteration}] ${statusSymbol} Status: ${status} | Duration: ${duration}ms`);
}

/**
 * Enhanced summary handler
 */
export function handleSummary(data) {
  const summary = {
    testRun: {
      startTime: new Date(data.state.testRunDurationMs).toISOString(),
      duration: `${(data.state.testRunDurationMs / 1000).toFixed(2)}s`,
      vusMax: data.metrics.vus_max.values.max,
    },
    metrics: {
      requests: {
        total: data.metrics.http_reqs.values.count,
        rate: data.metrics.http_reqs.values.rate.toFixed(2),
      },
      responseTime: {
        min: data.metrics.http_req_duration.values.min.toFixed(2),
        avg: data.metrics.http_req_duration.values.avg.toFixed(2),
        max: data.metrics.http_req_duration.values.max.toFixed(2),
        p50: data.metrics.http_req_duration.values['p(50)'].toFixed(2),
        p90: data.metrics.http_req_duration.values['p(90)'].toFixed(2),
        p95: data.metrics.http_req_duration.values['p(95)'].toFixed(2),
        p99: data.metrics.http_req_duration.values['p(99)'].toFixed(2),
      },
      errors: {
        rate: (data.metrics.http_req_failed.values.rate * 100).toFixed(2) + '%',
        count: data.metrics.http_req_failed.values.passes,
      },
      checks: {
        successRate: (data.metrics.checks.values.rate * 100).toFixed(2) + '%',
        passed: data.metrics.checks.values.passes,
        failed: data.metrics.checks.values.fails,
      }
    }
  };

  return summary;
}

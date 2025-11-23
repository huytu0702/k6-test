/**
 * Load Test with Advanced Monitoring
 * Demonstrates integration with custom monitoring utilities
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = 'https://petstore.swagger.io/v2';

// Custom Metrics
const petApiSuccess = new Rate('pet_api_success_rate');
const storeApiSuccess = new Rate('store_api_success_rate');
const apiResponseTime = new Trend('api_response_time_ms');
const errorsByType = new Counter('errors_by_type');
const slowRequests = new Counter('slow_requests_count'); // Requests > 1s

// Test Configuration
export let options = {
  stages: [
    { duration: '1m', target: 20 },  // Ramp up
    { duration: '3m', target: 20 },  // Stay
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000', 'p(99)<3000'],
    'http_req_failed': ['rate<0.10'],
    'pet_api_success_rate': ['rate>0.90'],
    'store_api_success_rate': ['rate>0.90'],
    'api_response_time_ms': ['p(95)<1500'],
    'errors_by_type': ['count<50'],
    'slow_requests_count': ['count<20'],
  },
  summaryTrendStats: ['min', 'avg', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

/**
 * Monitor and log request
 */
function monitoredRequest(url, params, endpoint) {
  const startTime = new Date().getTime();
  const response = http.get(url, params);
  const duration = new Date().getTime() - startTime;

  // Record custom metrics
  apiResponseTime.add(duration);

  // Track slow requests
  if (duration > 1000) {
    slowRequests.add(1);
    console.warn(`⚠️  Slow request detected: ${endpoint} took ${duration}ms`);
  }

  // Track success rates by endpoint
  const isSuccess = response.status >= 200 && response.status < 300;

  if (endpoint.includes('pet')) {
    petApiSuccess.add(isSuccess);
  } else if (endpoint.includes('store')) {
    storeApiSuccess.add(isSuccess);
  }

  // Track errors by type
  if (!isSuccess) {
    errorsByType.add(1, { error_code: response.status, endpoint: endpoint });
    console.error(`❌ Error: ${endpoint} returned ${response.status}`);
  }

  // Perform checks
  const checkResults = check(response, {
    [`${endpoint} - Status OK`]: (r) => r.status >= 200 && r.status < 300,
    [`${endpoint} - Response time < 1s`]: (r) => duration < 1000,
    [`${endpoint} - Has valid response`]: (r) => {
      try {
        return r.body && r.body.length > 0;
      } catch (e) {
        return false;
      }
    },
  }, { endpoint: endpoint });

  // Log successful requests periodically
  if (isSuccess && __ITER % 50 === 0) {
    console.log(`✅ ${endpoint}: ${response.status} in ${duration}ms`);
  }

  return { response, duration, isSuccess };
}

/**
 * Main test scenario
 */
export default function() {
  const petId = Math.floor(Math.random() * 10) + 1;

  // Test Pet API
  const petResult = monitoredRequest(
    `${BASE_URL}/pet/${petId}`,
    { tags: { endpoint: 'pet', operation: 'get' } },
    'GetPet'
  );

  sleep(0.5);

  // Test Store Inventory
  const inventoryResult = monitoredRequest(
    `${BASE_URL}/store/inventory`,
    { tags: { endpoint: 'store', operation: 'inventory' } },
    'GetInventory'
  );

  sleep(0.5);

  // Test Pet by Status
  const status = ['available', 'pending', 'sold'][Math.floor(Math.random() * 3)];
  const statusResult = monitoredRequest(
    `${BASE_URL}/pet/findByStatus?status=${status}`,
    { tags: { endpoint: 'pet', operation: 'findByStatus' } },
    'FindPetsByStatus'
  );

  sleep(1);
}

/**
 * Setup function - runs once at start
 */
export function setup() {
  console.log('🚀 Starting monitored load test...');
  console.log(`📊 Target: ${BASE_URL}`);
  console.log(`⏱️  Duration: 5 minutes`);
  console.log(`👥 Max VUs: 20`);
  console.log('─'.repeat(60));

  return { startTime: new Date().toISOString() };
}

/**
 * Teardown function - runs once at end
 */
export function teardown(data) {
  console.log('─'.repeat(60));
  console.log('✅ Test completed!');
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
}

/**
 * Custom summary handler
 */
export function handleSummary(data) {
  const stats = {
    testRun: {
      startTime: new Date(Date.now() - data.state.testRunDurationMs).toISOString(),
      endTime: new Date().toISOString(),
      duration: `${(data.state.testRunDurationMs / 1000).toFixed(2)}s`,
      vusMax: data.metrics.vus_max.values.max,
    },
    requests: {
      total: data.metrics.http_reqs.values.count,
      rate: `${data.metrics.http_reqs.values.rate.toFixed(2)} req/s`,
      failed: data.metrics.http_req_failed.values.passes,
      failureRate: `${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%`,
    },
    responseTime: {
      avg: `${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`,
      min: `${data.metrics.http_req_duration.values.min.toFixed(2)}ms`,
      max: `${data.metrics.http_req_duration.values.max.toFixed(2)}ms`,
      p50: `${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms`,
      p90: `${data.metrics.http_req_duration.values['p(90)'].toFixed(2)}ms`,
      p95: `${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`,
      p99: `${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms`,
    },
    customMetrics: {
      petApiSuccessRate: `${(data.metrics.pet_api_success_rate.values.rate * 100).toFixed(2)}%`,
      storeApiSuccessRate: `${(data.metrics.store_api_success_rate.values.rate * 100).toFixed(2)}%`,
      avgApiResponseTime: `${data.metrics.api_response_time_ms.values.avg.toFixed(2)}ms`,
      totalErrors: data.metrics.errors_by_type.values.count,
      slowRequests: data.metrics.slow_requests_count.values.count,
    },
    checks: {
      passed: data.metrics.checks.values.passes,
      failed: data.metrics.checks.values.fails,
      passRate: `${(data.metrics.checks.values.rate * 100).toFixed(2)}%`,
    }
  };

  console.log('\n' + '='.repeat(70));
  console.log('MONITORING SUMMARY');
  console.log('='.repeat(70));
  console.log(JSON.stringify(stats, null, 2));
  console.log('='.repeat(70));

  // Return multiple output formats
  return {
    'stdout': '', // Default console output
    'results/monitored-load-test.json': JSON.stringify(data, null, 2),
  };
}

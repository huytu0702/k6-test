/**
 * STRESS TESTING WITH K6 CLOUD INTEGRATION
 *
 * Mục tiêu:
 * - Tìm giới hạn của hệ thống
 * - Quan sát hành vi khi quá tải với real-time monitoring
 * - Xác định breaking point
 *
 * Kịch bản:
 * - Ramp up to 20 users trong 2 phút
 * - Duy trì 20 users trong 5 phút
 * - Ramp up to 50 users trong 2 phút
 * - Duy trì 50 users trong 5 phút
 * - Ramp up to 100 users trong 2 phút
 * - Duy trì 100 users trong 5 phút (push to limit)
 * - Ramp down to 0 trong 3 phút
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, HEADERS } from '../utils/config.js';
import { randomPetId, randomPetName, createPetObject } from '../utils/helpers.js';

// Custom metrics
let errorRate = new Rate('errors');
let timeoutCounter = new Counter('timeouts');
let serverErrorCounter = new Counter('server_errors');
let petGetDuration = new Trend('pet_get_duration');
let petPostDuration = new Trend('pet_post_duration');

// Test configuration
export let options = {
  stages: [
    { duration: '2m', target: 20 },   // Ramp up
    { duration: '5m', target: 20 },   // Stay
    { duration: '2m', target: 50 },   // Increase
    { duration: '5m', target: 50 },   // Stay
    { duration: '2m', target: 100 },  // Push to limit
    { duration: '5m', target: 100 },  // Stay at limit
    { duration: '3m', target: 0 },    // Ramp down
  ],

  thresholds: {
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'], // More lenient for stress test
    'http_req_failed': ['rate<0.10'],  // Allow 10% error rate
    'http_reqs': ['rate>5'],           // Minimum throughput
    'checks': ['rate>0.90'],           // 90% checks pass
    'errors': ['rate<0.10'],           // Error rate < 10%
  },

  // Cloud-specific options
  cloud: {
    name: 'Petstore Stress Test - Breaking Point Analysis',
    projectID: 3727969, // stack-1400582-alloy-k6 project
    note: 'Stress testing with 20-100 VUs to find system breaking point',
  },

  // Tags for organization and filtering
  tags: {
    project: 'petstore',
    environment: 'demo',
    test_type: 'stress',
    version: '1.0.0',
    team: 'qa',
  },
};

export default function () {
  // Stress test focuses on critical operations
  // 60% GET, 40% POST to stress both read and write

  let random = Math.random();

  if (random < 0.6) {
    // 60% - GET pet
    getPet();
  } else {
    // 40% - POST pet
    createPet();
  }

  sleep(0.5); // Shorter think time to increase stress
}

function getPet() {
  let petId = randomPetId();
  let response = http.get(`${BASE_URL}/pet/${petId}`, {
    headers: HEADERS,
    tags: {
      name: 'GetPet',
      endpoint: 'pet',
      operation: 'read',
      test_type: 'stress',
      critical: 'true'
    }
  });

  let success = check(response, {
    'GET pet - status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'GET pet - response time < 2000ms': (r) => r.timings.duration < 2000,
    'GET pet - not timeout': (r) => r.status !== 0,
  });

  // Track specific error types
  if (response.status === 0) {
    timeoutCounter.add(1);
  }
  if (response.status >= 500) {
    serverErrorCounter.add(1);
  }

  errorRate.add(!success);
  petGetDuration.add(response.timings.duration);
}

function createPet() {
  let petId = randomPetId();
  let petName = randomPetName();
  let pet = createPetObject(petId, petName, 'available');

  let response = http.post(`${BASE_URL}/pet`, JSON.stringify(pet), {
    headers: HEADERS,
    tags: {
      name: 'CreatePet',
      endpoint: 'pet',
      operation: 'write',
      test_type: 'stress',
      critical: 'true'
    }
  });

  let success = check(response, {
    'POST pet - status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'POST pet - response time < 2000ms': (r) => r.timings.duration < 2000,
    'POST pet - not timeout': (r) => r.status !== 0,
    'POST pet - valid response': (r) => {
      if (r.status === 200 || r.status === 201) {
        try {
          return r.json().id !== undefined;
        } catch (e) {
          return false;
        }
      }
      return true; // Don't fail check for other status codes
    },
  });

  // Track specific error types
  if (response.status === 0) {
    timeoutCounter.add(1);
  }
  if (response.status >= 500) {
    serverErrorCounter.add(1);
  }

  errorRate.add(!success);
  petPostDuration.add(response.timings.duration);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
  };
}

function textSummary(data) {
  // Null-safe metric extraction
  let totalReqs = (data.metrics.http_reqs && data.metrics.http_reqs.values && data.metrics.http_reqs.values.count) || 0;
  let failedReqs = (data.metrics.http_req_failed && data.metrics.http_req_failed.values && data.metrics.http_req_failed.values.count) || 0;
  let timeouts = (data.metrics.timeouts && data.metrics.timeouts.values && data.metrics.timeouts.values.count) || 0;
  let serverErrors = (data.metrics.server_errors && data.metrics.server_errors.values && data.metrics.server_errors.values.count) || 0;

  let avgDuration = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values.avg) || 0;
  let medDuration = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values.med) || 0;
  let p95Duration = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values['p(95)']) || 0;
  let p99Duration = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values['p(99)']) || 0;
  let maxDuration = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values.max) || 0;
  let reqRate = (data.metrics.http_reqs && data.metrics.http_reqs.values && data.metrics.http_reqs.values.rate) || 0;

  return `
========================================
STRESS TEST SUMMARY (K6 CLOUD)
========================================
Total Requests: ${totalReqs}
Failed Requests: ${failedReqs} (${totalReqs > 0 ? (failedReqs/totalReqs*100).toFixed(2) : 0}%)
Timeouts: ${timeouts}
Server Errors (5xx): ${serverErrors}

Response Times:
- Average: ${avgDuration.toFixed(2)}ms
- Median: ${medDuration.toFixed(2)}ms
- P95: ${p95Duration.toFixed(2)}ms
- P99: ${p99Duration.toFixed(2)}ms
- Max: ${maxDuration.toFixed(2)}ms

Throughput: ${reqRate.toFixed(2)} req/s
========================================
Breaking Point Analysis:
${analyzeBreakingPoint(data)}
========================================
View detailed results in K6 Cloud Dashboard
========================================
  `;
}

function analyzeBreakingPoint(data) {
  let failRate = ((data.metrics.http_req_failed && data.metrics.http_req_failed.values && data.metrics.http_req_failed.values.rate) || 0) * 100;
  let p95 = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values['p(95)']) || 0;

  if (failRate > 10) {
    return 'BREAKING POINT REACHED: Error rate exceeded 10%';
  } else if (p95 > 2000) {
    return 'DEGRADED PERFORMANCE: P95 response time exceeded 2 seconds';
  } else if (failRate > 5) {
    return 'SYSTEM UNDER STRESS: Error rate between 5-10%';
  } else {
    return 'SYSTEM STABLE: Handling stress load well';
  }
}

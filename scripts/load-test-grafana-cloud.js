/**
 * LOAD TESTING WITH GRAFANA CLOUD INTEGRATION
 *
 * Mục tiêu:
 * - Kiểm tra hệ thống với tải bình thường
 * - Gửi metrics đến Grafana Cloud qua Prometheus Remote Write
 * - Xác định baseline performance
 *
 * Kịch bản:
 * - Ramp up to 10 users trong 30s
 * - Duy trì 10 users trong 2 phút
 * - Ramp down to 0 trong 30s
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, HEADERS, DEFAULT_THRESHOLDS } from '../utils/config.js';
import { randomPetId, randomPetName, checkSuccess, createPetObject } from '../utils/helpers.js';

// Custom metrics
let errorRate = new Rate('errors');
let petGetDuration = new Trend('pet_get_duration');
let petPostDuration = new Trend('pet_post_duration');
let inventoryGetDuration = new Trend('inventory_get_duration');

// Test configuration - SHORT version for demo
export let options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '2m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],

  thresholds: DEFAULT_THRESHOLDS,

  // Tags for organization
  tags: {
    project: 'petstore',
    environment: 'demo',
    test_type: 'load',
    version: '1.0.0',
  },
};

export default function () {
  // Simulate traffic distribution:
  // - 50% GET /pet/{petId}
  // - 30% POST /pet
  // - 20% GET /store/inventory

  let random = Math.random();

  if (random < 0.5) {
    // 50% - GET pet
    getPet();
  } else if (random < 0.8) {
    // 30% - POST pet
    createPet();
  } else {
    // 20% - GET inventory
    getInventory();
  }

  sleep(1); // Think time between requests
}

function getPet() {
  let petId = randomPetId();
  let response = http.get(`${BASE_URL}/pet/${petId}`, {
    headers: HEADERS,
    tags: {
      name: 'GetPet',
      endpoint: 'pet',
      operation: 'read',
      critical: 'true'
    }
  });

  let success = check(response, {
    'GET pet - status is 200': (r) => r.status === 200,
    'GET pet - response time < 500ms': (r) => r.timings.duration < 500,
    'GET pet - has valid body': (r) => r.body && r.body.length > 0,
  });

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
      critical: 'true'
    }
  });

  let success = check(response, {
    'POST pet - status is 200': (r) => r.status === 200,
    'POST pet - response time < 1000ms': (r) => r.timings.duration < 1000,
    'POST pet - has id in response': (r) => {
      try {
        return r.json().id !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);
  petPostDuration.add(response.timings.duration);
}

function getInventory() {
  let response = http.get(`${BASE_URL}/store/inventory`, {
    headers: HEADERS,
    tags: {
      name: 'GetInventory',
      endpoint: 'store',
      operation: 'read',
      critical: 'false'
    }
  });

  let success = check(response, {
    'GET inventory - status is 200': (r) => r.status === 200,
    'GET inventory - response time < 500ms': (r) => r.timings.duration < 500,
    'GET inventory - has valid JSON': (r) => {
      try {
        let data = r.json();
        return typeof data === 'object';
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!success);
  inventoryGetDuration.add(response.timings.duration);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  // Simple text summary with null checks
  const totalReqs = (data.metrics.http_reqs && data.metrics.http_reqs.values && data.metrics.http_reqs.values.count) || 0;
  const failedRate = ((data.metrics.http_req_failed && data.metrics.http_req_failed.values && data.metrics.http_req_failed.values.rate) || 0) * 100;
  const avgDuration = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values.avg) || 0;
  const p95Duration = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values['p(95)']) || 0;
  const p99Duration = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values['p(99)']) || 0;

  return `
========================================
LOAD TEST SUMMARY (GRAFANA CLOUD)
========================================
Total Requests: ${totalReqs}
Failed Requests: ${failedRate.toFixed(2)}%
Avg Response Time: ${avgDuration.toFixed(2)}ms
P95 Response Time: ${p95Duration.toFixed(2)}ms
P99 Response Time: ${p99Duration.toFixed(2)}ms
========================================
View metrics in Grafana Cloud Dashboard
========================================
  `;
}

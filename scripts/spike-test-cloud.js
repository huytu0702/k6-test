/**
 * SPIKE TESTING WITH K6 CLOUD INTEGRATION
 *
 * Mục tiêu:
 * - Kiểm tra phản ứng của hệ thống với traffic đột ngột tăng
 * - Đánh giá khả năng auto-scaling với real-time monitoring
 * - Đo recovery time sau spike
 *
 * Kịch bản:
 * - Bắt đầu với 10 users (normal load)
 * - Spike đột ngột lên 200 users trong 30 giây
 * - Duy trì 200 users trong 3 phút
 * - Quay về 10 users trong 1 phút
 * - Ramp down to 0 trong 2 phút
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { BASE_URL, HEADERS } from '../utils/config.js';
import { randomPetId, randomPetName, createPetObject } from '../utils/helpers.js';

// Custom metrics
let errorRate = new Rate('errors');
let spikeRecoveryTime = new Trend('spike_recovery_time');
let requestDurationDuringSpike = new Trend('duration_during_spike');
let requestDurationAfterSpike = new Trend('duration_after_spike');
let concurrentUsers = new Gauge('concurrent_users');

// Test configuration
export let options = {
  stages: [
    { duration: '1m', target: 10 },    // Normal load
    { duration: '30s', target: 200 },  // Spike!
    { duration: '3m', target: 200 },   // Stay high
    { duration: '1m', target: 10 },    // Back to normal
    { duration: '2m', target: 0 },     // Ramp down
  ],

  thresholds: {
    'http_req_duration': ['p(95)<3000', 'p(99)<5000'], // More lenient during spike
    'http_req_failed': ['rate<0.15'],  // Allow 15% error rate during spike
    'http_reqs': ['rate>5'],
    'checks': ['rate>0.85'],           // 85% checks pass
    'errors': ['rate<0.15'],
    'duration_during_spike': ['p(95)<3000'], // Spike-specific threshold
  },

  // Cloud-specific options
  cloud: {
    name: 'Petstore Spike Test - Traffic Burst Analysis',
    projectID: 3727969, // stack-1400582-alloy-k6 project
    note: 'Spike testing: 10 → 200 users to test auto-scaling and recovery',
  },

  // Tags for organization and filtering
  tags: {
    project: 'petstore',
    environment: 'demo',
    test_type: 'spike',
    version: '1.0.0',
    team: 'qa',
  },
};

let spikeStartTime = null;
let isInSpike = false;
let wasInSpike = false;

export default function () {
  // Determine if we're in spike phase (roughly 1.5-5 minutes into test)
  let currentTime = Date.now();
  let testDuration = __ENV.K6_TEST_START ? (currentTime - parseInt(__ENV.K6_TEST_START)) / 1000 : 0;

  // Approximate spike detection based on VU count
  let currentVUs = __VU;
  if (currentVUs > 100 && !isInSpike) {
    isInSpike = true;
    spikeStartTime = currentTime;
  } else if (currentVUs <= 100 && isInSpike) {
    isInSpike = false;
    wasInSpike = true;
  }

  concurrentUsers.add(currentVUs);

  // Execute requests
  let random = Math.random();

  if (random < 0.7) {
    // 70% GET - more read-heavy during spike
    getPet(isInSpike, wasInSpike);
  } else {
    // 30% POST
    createPet(isInSpike, wasInSpike);
  }

  // Very short think time during spike
  sleep(isInSpike ? 0.3 : 0.8);
}

function getPet(inSpike, afterSpike) {
  let petId = randomPetId();
  let startTime = Date.now();

  let response = http.get(`${BASE_URL}/pet/${petId}`, {
    headers: HEADERS,
    tags: {
      name: 'GetPet',
      endpoint: 'pet',
      operation: 'read',
      test_type: 'spike',
      phase: inSpike ? 'spike' : (afterSpike ? 'recovery' : 'normal'),
      critical: 'true'
    }
  });

  let duration = Date.now() - startTime;

  let success = check(response, {
    'GET pet - status OK': (r) => r.status === 200 || r.status === 404,
    'GET pet - completed': (r) => r.status !== 0,
    'GET pet - reasonable time': (r) => r.timings.duration < 5000,
  });

  // Track metrics by phase
  if (inSpike) {
    requestDurationDuringSpike.add(response.timings.duration);
  } else if (afterSpike) {
    requestDurationAfterSpike.add(response.timings.duration);
  }

  errorRate.add(!success);
}

function createPet(inSpike, afterSpike) {
  let petId = randomPetId();
  let petName = randomPetName();
  let pet = createPetObject(petId, petName, 'available');
  let startTime = Date.now();

  let response = http.post(`${BASE_URL}/pet`, JSON.stringify(pet), {
    headers: HEADERS,
    tags: {
      name: 'CreatePet',
      endpoint: 'pet',
      operation: 'write',
      test_type: 'spike',
      phase: inSpike ? 'spike' : (afterSpike ? 'recovery' : 'normal'),
      critical: 'true'
    }
  });

  let duration = Date.now() - startTime;

  let success = check(response, {
    'POST pet - status OK': (r) => r.status === 200 || r.status === 201,
    'POST pet - completed': (r) => r.status !== 0,
    'POST pet - reasonable time': (r) => r.timings.duration < 5000,
    'POST pet - valid response': (r) => {
      if (r.status === 200 || r.status === 201) {
        try {
          return r.json().id !== undefined;
        } catch (e) {
          return false;
        }
      }
      return true;
    },
  });

  // Track metrics by phase
  if (inSpike) {
    requestDurationDuringSpike.add(response.timings.duration);
  } else if (afterSpike) {
    requestDurationAfterSpike.add(response.timings.duration);
  }

  errorRate.add(!success);
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

  let avgDuration = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values.avg) || 0;
  let medDuration = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values.med) || 0;
  let p95Duration = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values['p(95)']) || 0;
  let p99Duration = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values['p(99)']) || 0;
  let maxDuration = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values.max) || 0;
  let reqRate = (data.metrics.http_reqs && data.metrics.http_reqs.values && data.metrics.http_reqs.values.rate) || 0;

  let spikeDuration = data.metrics.duration_during_spike ? data.metrics.duration_during_spike.values : null;
  let afterSpikeDuration = data.metrics.duration_after_spike ? data.metrics.duration_after_spike.values : null;
  let maxConcurrentUsers = (data.metrics.concurrent_users && data.metrics.concurrent_users.values && data.metrics.concurrent_users.values.max) || 0;

  return `
========================================
SPIKE TEST SUMMARY (K6 CLOUD)
========================================
Total Requests: ${totalReqs}
Failed Requests: ${failedReqs} (${totalReqs > 0 ? (failedReqs/totalReqs*100).toFixed(2) : 0}%)

Overall Response Times:
- Average: ${avgDuration.toFixed(2)}ms
- Median: ${medDuration.toFixed(2)}ms
- P95: ${p95Duration.toFixed(2)}ms
- P99: ${p99Duration.toFixed(2)}ms
- Max: ${maxDuration.toFixed(2)}ms

During Spike Phase:
${spikeDuration ? `- Average: ${spikeDuration.avg.toFixed(2)}ms
- P95: ${spikeDuration['p(95)'].toFixed(2)}ms
- P99: ${spikeDuration['p(99)'].toFixed(2)}ms` : 'No data collected'}

After Spike (Recovery):
${afterSpikeDuration ? `- Average: ${afterSpikeDuration.avg.toFixed(2)}ms
- P95: ${afterSpikeDuration['p(95)'].toFixed(2)}ms` : 'No data collected'}

Throughput: ${reqRate.toFixed(2)} req/s
Max Concurrent Users: ${maxConcurrentUsers}

========================================
Spike Analysis:
${analyzeSpike(data, spikeDuration, afterSpikeDuration)}
========================================
View detailed results in K6 Cloud Dashboard
========================================
  `;
}

function analyzeSpike(data, spikeDuration, afterSpikeDuration) {
  let failRate = ((data.metrics.http_req_failed && data.metrics.http_req_failed.values && data.metrics.http_req_failed.values.rate) || 0) * 100;
  let overallAvg = (data.metrics.http_req_duration && data.metrics.http_req_duration.values && data.metrics.http_req_duration.values.avg) || 0;

  let analysis = [];

  // Error rate analysis
  if (failRate < 5) {
    analysis.push('✓ Excellent spike handling: Error rate under 5%');
  } else if (failRate < 10) {
    analysis.push('○ Good spike handling: Error rate 5-10%');
  } else if (failRate < 15) {
    analysis.push('△ Acceptable spike handling: Error rate 10-15%');
  } else {
    analysis.push('✗ Poor spike handling: Error rate exceeded 15%');
  }

  // Response time analysis
  if (spikeDuration && overallAvg > 0) {
    let degradation = spikeDuration.avg / overallAvg;
    if (degradation < 1.5) {
      analysis.push('✓ Minimal performance degradation during spike');
    } else if (degradation < 2.5) {
      analysis.push('○ Moderate performance degradation during spike');
    } else {
      analysis.push('✗ Significant performance degradation during spike');
    }
  }

  // Recovery analysis
  if (afterSpikeDuration && spikeDuration) {
    if (afterSpikeDuration.avg < spikeDuration.avg * 0.8) {
      analysis.push('✓ Fast recovery after spike');
    } else {
      analysis.push('△ Slow recovery after spike');
    }
  }

  return analysis.length > 0 ? analysis.join('\n') : 'Analysis not available';
}

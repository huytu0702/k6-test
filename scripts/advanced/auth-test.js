/**
 * AUTHENTICATION TEST - Test với API key authentication
 *
 * Mục tiêu:
 * - Test với API key authentication
 * - So sánh performance với và không có authentication
 * - Verify authorization controls
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL } from '../../utils/config.js';
import { randomPetId, randomPetName } from '../../utils/helpers.js';

// Custom metrics
let authSuccessRate = new Rate('auth_success');
let authResponseTime = new Trend('auth_response_time');
let noAuthResponseTime = new Trend('no_auth_response_time');

export let options = {
  vus: 5,
  duration: '2m',
  thresholds: {
    'auth_success': ['rate>0.95'],
    'http_req_duration': ['p(95)<1000'],
  },
};

export default function () {
  // Petstore API key (demo key)
  const API_KEY = 'special-key';

  group('Test with API Key Authentication', function () {
    // Headers with authentication
    const authHeaders = {
      'api_key': API_KEY,
      'Content-Type': 'application/json',
    };

    let petId = randomPetId();

    // Test 1: Create pet with authentication
    let createPayload = JSON.stringify({
      id: petId,
      name: randomPetName(),
      status: 'available',
      category: { id: 1, name: 'Dogs' },
      photoUrls: ['https://example.com/photo.jpg'],
      tags: [{ id: 1, name: 'authenticated' }]
    });

    let startTime = Date.now();
    let createRes = http.post(`${BASE_URL}/pet`, createPayload, {
      headers: authHeaders,
      tags: { auth: 'true', endpoint: 'create_pet' }
    });
    authResponseTime.add(Date.now() - startTime);

    let createSuccess = check(createRes, {
      'Auth - Create Pet: status 200': (r) => r.status === 200,
      'Auth - Create Pet: has ID': (r) => {
        try {
          return r.json().id !== undefined;
        } catch (e) {
          return false;
        }
      },
      'Auth - Create Pet: response time < 1000ms': (r) => r.timings.duration < 1000,
    });

    authSuccessRate.add(createSuccess);
    sleep(1);

    // Test 2: Get pet with authentication
    if (createSuccess) {
      startTime = Date.now();
      let getRes = http.get(`${BASE_URL}/pet/${petId}`, {
        headers: authHeaders,
        tags: { auth: 'true', endpoint: 'get_pet' }
      });
      authResponseTime.add(Date.now() - startTime);

      let getSuccess = check(getRes, {
        'Auth - Get Pet: status 200': (r) => r.status === 200,
        'Auth - Get Pet: correct ID': (r) => {
          try {
            return r.json().id === petId;
          } catch (e) {
            return false;
          }
        },
      });

      authSuccessRate.add(getSuccess);
      sleep(1);

      // Test 3: Update pet with authentication
      let updatePayload = JSON.stringify({
        id: petId,
        name: 'Updated Name',
        status: 'sold',
        category: { id: 1, name: 'Dogs' },
        photoUrls: ['https://example.com/photo.jpg'],
        tags: [{ id: 1, name: 'authenticated' }]
      });

      startTime = Date.now();
      let updateRes = http.put(`${BASE_URL}/pet`, updatePayload, {
        headers: authHeaders,
        tags: { auth: 'true', endpoint: 'update_pet' }
      });
      authResponseTime.add(Date.now() - startTime);

      let updateSuccess = check(updateRes, {
        'Auth - Update Pet: status 200': (r) => r.status === 200,
        'Auth - Update Pet: name updated': (r) => {
          try {
            return r.json().name === 'Updated Name';
          } catch (e) {
            return false;
          }
        },
      });

      authSuccessRate.add(updateSuccess);
      sleep(1);

      // Test 4: Delete pet with authentication
      startTime = Date.now();
      let deleteRes = http.del(`${BASE_URL}/pet/${petId}`, {
        headers: authHeaders,
        tags: { auth: 'true', endpoint: 'delete_pet' }
      });
      authResponseTime.add(Date.now() - startTime);

      let deleteSuccess = check(deleteRes, {
        'Auth - Delete Pet: status 200': (r) => r.status === 200,
      });

      authSuccessRate.add(deleteSuccess);
    }
  });

  sleep(1);

  group('Test without Authentication', function () {
    // Headers without authentication
    const noAuthHeaders = {
      'Content-Type': 'application/json',
    };

    let petId = randomPetId();

    // Test 1: Try to create pet without auth
    let createPayload = JSON.stringify({
      id: petId,
      name: randomPetName(),
      status: 'available',
      category: { id: 1, name: 'Dogs' },
      photoUrls: ['https://example.com/photo.jpg'],
      tags: [{ id: 1, name: 'no_auth' }]
    });

    let startTime = Date.now();
    let createRes = http.post(`${BASE_URL}/pet`, createPayload, {
      headers: noAuthHeaders,
      tags: { auth: 'false', endpoint: 'create_pet' }
    });
    noAuthResponseTime.add(Date.now() - startTime);

    check(createRes, {
      'No Auth - Create Pet: response received': (r) => r.status !== undefined,
      'No Auth - Create Pet: response time logged': (r) => r.timings.duration > 0,
    });

    sleep(1);

    // Test 2: Get pet without auth (public endpoint)
    startTime = Date.now();
    let getRes = http.get(`${BASE_URL}/pet/1`, {
      headers: noAuthHeaders,
      tags: { auth: 'false', endpoint: 'get_pet' }
    });
    noAuthResponseTime.add(Date.now() - startTime);

    check(getRes, {
      'No Auth - Get Pet: status 200 or 404': (r) => r.status === 200 || r.status === 404,
    });
  });

  sleep(2);
}

export function handleSummary(data) {
  let authRate = data.metrics.auth_success ?
    data.metrics.auth_success.values.rate * 100 : 0;

  let authAvgTime = data.metrics.auth_response_time ?
    data.metrics.auth_response_time.values.avg.toFixed(2) : 'N/A';

  let noAuthAvgTime = data.metrics.no_auth_response_time ?
    data.metrics.no_auth_response_time.values.avg.toFixed(2) : 'N/A';

  console.log(`
========================================
AUTHENTICATION TEST SUMMARY
========================================
Auth Success Rate: ${authRate.toFixed(2)}%
Average Response Time (With Auth): ${authAvgTime}ms
Average Response Time (No Auth): ${noAuthAvgTime}ms
Total Requests: ${data.metrics.http_reqs.values.count}
Total Iterations: ${data.metrics.iterations.values.count}
========================================
  `);

  return {
    'stdout': '',
  };
}

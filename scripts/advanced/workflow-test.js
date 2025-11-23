/**
 * WORKFLOW TEST - Test API workflows phức tạp
 *
 * Mục tiêu:
 * - Test chuỗi API calls liên tiếp
 * - Simulate user journey
 * - Verify end-to-end functionality
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, HEADERS } from '../../utils/config.js';
import { randomPetId, randomPetName } from '../../utils/helpers.js';

// Custom metrics
let workflowSuccessRate = new Rate('workflow_success');
let workflowDuration = new Trend('workflow_duration');

export let options = {
  vus: 5,
  duration: '2m',
  thresholds: {
    'workflow_success': ['rate>0.90'],
    'workflow_duration': ['p(95)<3000'],
  },
};

export default function () {
  let workflowStart = Date.now();
  let workflowSuccess = true;

  // Workflow: Create Pet -> Get Pet -> Update Pet -> Delete Pet

  group('Complete Pet Lifecycle', function () {
    let petId = randomPetId();
    let petName = randomPetName();

    // Step 1: Create Pet
    let createPayload = JSON.stringify({
      id: petId,
      name: petName,
      status: 'available',
      category: { id: 1, name: 'Dogs' },
      photoUrls: ['https://example.com/photo.jpg'],
      tags: [{ id: 1, name: 'tag1' }]
    });

    let createRes = http.post(`${BASE_URL}/pet`, createPayload, {
      headers: HEADERS,
      tags: { workflow: 'pet_lifecycle', step: 'create' }
    });

    let createSuccess = check(createRes, {
      'Step 1 - Create Pet: status 200': (r) => r.status === 200,
      'Step 1 - Create Pet: has ID': (r) => {
        try {
          return r.json().id !== undefined;
        } catch (e) {
          return false;
        }
      },
    });

    if (!createSuccess) {
      workflowSuccess = false;
    }

    sleep(1);

    // Step 2: Get Pet
    if (createSuccess) {
      let getRes = http.get(`${BASE_URL}/pet/${petId}`, {
        headers: HEADERS,
        tags: { workflow: 'pet_lifecycle', step: 'read' }
      });

      let getSuccess = check(getRes, {
        'Step 2 - Get Pet: status 200': (r) => r.status === 200,
        'Step 2 - Get Pet: correct ID': (r) => {
          try {
            return r.json().id === petId;
          } catch (e) {
            return false;
          }
        },
        'Step 2 - Get Pet: correct name': (r) => {
          try {
            return r.json().name === petName;
          } catch (e) {
            return false;
          }
        },
      });

      if (!getSuccess) {
        workflowSuccess = false;
      }

      sleep(1);

      // Step 3: Update Pet
      if (getSuccess) {
        let updatePayload = JSON.stringify({
          id: petId,
          name: petName,
          status: 'sold',  // Changed status
          category: { id: 1, name: 'Dogs' },
          photoUrls: ['https://example.com/photo.jpg'],
          tags: [{ id: 1, name: 'tag1' }]
        });

        let updateRes = http.put(`${BASE_URL}/pet`, updatePayload, {
          headers: HEADERS,
          tags: { workflow: 'pet_lifecycle', step: 'update' }
        });

        let updateSuccess = check(updateRes, {
          'Step 3 - Update Pet: status 200': (r) => r.status === 200,
          'Step 3 - Update Pet: status changed': (r) => {
            try {
              return r.json().status === 'sold';
            } catch (e) {
              return false;
            }
          },
        });

        if (!updateSuccess) {
          workflowSuccess = false;
        }

        sleep(1);

        // Step 4: Delete Pet
        if (updateSuccess) {
          let deleteRes = http.del(`${BASE_URL}/pet/${petId}`, {
            headers: HEADERS,
            tags: { workflow: 'pet_lifecycle', step: 'delete' }
          });

          let deleteSuccess = check(deleteRes, {
            'Step 4 - Delete Pet: status 200': (r) => r.status === 200,
          });

          if (!deleteSuccess) {
            workflowSuccess = false;
          }

          sleep(1);

          // Step 5: Verify deletion
          if (deleteSuccess) {
            let verifyRes = http.get(`${BASE_URL}/pet/${petId}`, {
              headers: HEADERS,
              tags: { workflow: 'pet_lifecycle', step: 'verify_delete' }
            });

            check(verifyRes, {
              'Step 5 - Verify Delete: pet not found': (r) => r.status === 404,
            });
          }
        }
      }
    }
  });

  // Record workflow metrics
  let workflowEnd = Date.now();
  workflowDuration.add(workflowEnd - workflowStart);
  workflowSuccessRate.add(workflowSuccess);

  sleep(2);
}

export function handleSummary(data) {
  let workflowRate = data.metrics.workflow_success ?
    data.metrics.workflow_success.values.rate * 100 : 0;

  console.log(`
========================================
WORKFLOW TEST SUMMARY
========================================
Workflow Success Rate: ${workflowRate.toFixed(2)}%
Average Workflow Duration: ${data.metrics.workflow_duration ?
  data.metrics.workflow_duration.values.avg.toFixed(2) + 'ms' : 'N/A'}
Total Iterations: ${data.metrics.iterations.values.count}
========================================
  `);

  return {
    'stdout': '',
  };
}

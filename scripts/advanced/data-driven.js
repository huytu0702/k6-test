/**
 * DATA-DRIVEN TEST - Test với dữ liệu từ file JSON
 *
 * Mục tiêu:
 * - Sử dụng data từ file JSON
 * - Test với nhiều scenarios khác nhau
 * - Validate data integrity
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Rate } from 'k6/metrics';
import { BASE_URL, HEADERS } from '../../utils/config.js';

// Load test data from JSON file
const pets = new SharedArray('pets', function () {
  const data = JSON.parse(open('../../data/pets.json'));
  return data.pets;
});

// Custom metrics
let dataValidationRate = new Rate('data_validation_success');

export let options = {
  vus: 5,
  duration: '1m',
  thresholds: {
    'data_validation_success': ['rate>0.90'],
    'http_req_duration': ['p(95)<1000'],
  },
};

export default function () {
  // Select random pet from data file
  let petData = pets[Math.floor(Math.random() * pets.length)];

  // Test 1: Create pet with data from file
  let createRes = http.post(`${BASE_URL}/pet`, JSON.stringify(petData), {
    headers: HEADERS,
    tags: { test: 'data_driven', operation: 'create' }
  });

  let createSuccess = check(createRes, {
    'Create with data: status 200': (r) => r.status === 200,
    'Create with data: ID matches': (r) => {
      try {
        return r.json().id === petData.id;
      } catch (e) {
        return false;
      }
    },
    'Create with data: name matches': (r) => {
      try {
        return r.json().name === petData.name;
      } catch (e) {
        return false;
      }
    },
    'Create with data: status matches': (r) => {
      try {
        return r.json().status === petData.status;
      } catch (e) {
        return false;
      }
    },
  });

  dataValidationRate.add(createSuccess);

  sleep(1);

  // Test 2: Get pet and verify data
  if (createSuccess) {
    let getRes = http.get(`${BASE_URL}/pet/${petData.id}`, {
      headers: HEADERS,
      tags: { test: 'data_driven', operation: 'read' }
    });

    let getSuccess = check(getRes, {
      'Get pet: status 200': (r) => r.status === 200,
      'Get pet: data integrity': (r) => {
        try {
          let pet = r.json();
          return pet.id === petData.id &&
            pet.name === petData.name &&
            pet.status === petData.status;
        } catch (e) {
          return false;
        }
      },
    });

    dataValidationRate.add(getSuccess);
  }

  sleep(1);

  // Test 3: Get pets by status
  let statusRes = http.get(`${BASE_URL}/pet/findByStatus?status=${petData.status}`, {
    headers: HEADERS,
    tags: { test: 'data_driven', operation: 'find_by_status' }
  });

  let statusSuccess = check(statusRes, {
    'Find by status: status 200': (r) => r.status === 200,
    'Find by status: returns array': (r) => {
      try {
        return Array.isArray(r.json());
      } catch (e) {
        return false;
      }
    },
    'Find by status: contains correct status': (r) => {
      try {
        let pets = r.json();
        if (pets.length === 0) return true; // Empty is ok
        return pets.some(pet => pet.status === petData.status);
      } catch (e) {
        return false;
      }
    },
  });

  dataValidationRate.add(statusSuccess);

  sleep(2);
}

export function handleSummary(data) {
  let validationRate = data.metrics.data_validation_success ?
    data.metrics.data_validation_success.values.rate * 100 : 0;

  console.log(`
========================================
DATA-DRIVEN TEST SUMMARY
========================================
Data Validation Success Rate: ${validationRate.toFixed(2)}%
Test Data Records: ${pets.length}
Total Requests: ${data.metrics.http_reqs.values.count}
Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
========================================
  `);

  return {
    'stdout': '',
  };
}

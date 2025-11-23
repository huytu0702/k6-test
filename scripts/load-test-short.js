/**
 * LOAD TESTING - SHORT VERSION (Demo)
 * Shortened version for quick testing and demonstration
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

// Test configuration - shortened
export let options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp up to 5 users
    { duration: '1m', target: 5 },    // Stay at 5 users
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000', 'p(99)<3000'],
    'http_req_failed': ['rate<0.10'],
    'checks': ['rate>0.90'],
  },
};

export default function () {
  let random = Math.random();

  if (random < 0.5) {
    getPet();
  } else if (random < 0.8) {
    createPet();
  } else {
    getInventory();
  }

  sleep(1);
}

function getPet() {
  let petId = randomPetId();
  let response = http.get(`${BASE_URL}/pet/${petId}`, {
    headers: HEADERS,
    tags: { name: 'GetPet', endpoint: 'pet' }
  });

  let success = check(response, {
    'GET pet - status is 200': (r) => r.status === 200,
    'GET pet - response time < 2000ms': (r) => r.timings.duration < 2000,
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
    tags: { name: 'CreatePet', endpoint: 'pet' }
  });

  let success = check(response, {
    'POST pet - status is 200': (r) => r.status === 200,
    'POST pet - response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  errorRate.add(!success);
  petPostDuration.add(response.timings.duration);
}

function getInventory() {
  let response = http.get(`${BASE_URL}/store/inventory`, {
    headers: HEADERS,
    tags: { name: 'GetInventory', endpoint: 'store' }
  });

  let success = check(response, {
    'GET inventory - status is 200': (r) => r.status === 200,
    'GET inventory - response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  errorRate.add(!success);
  inventoryGetDuration.add(response.timings.duration);
}

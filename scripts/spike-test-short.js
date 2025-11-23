/**
 * SPIKE TESTING - SHORT VERSION (Demo)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, HEADERS } from '../utils/config.js';
import { randomPetId, randomPetName, createPetObject } from '../utils/helpers.js';

let errorRate = new Rate('errors');
let requestDuration = new Trend('request_duration');

export let options = {
  stages: [
    { duration: '30s', target: 5 },    // Normal load
    { duration: '15s', target: 30 },   // Spike!
    { duration: '1m', target: 30 },    // Stay high
    { duration: '30s', target: 5 },    // Back to normal
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'],
    'http_req_failed': ['rate<0.20'],
    'checks': ['rate>0.80'],
  },
};

export default function () {
  let random = Math.random();

  if (random < 0.7) {
    getPet();
  } else {
    createPet();
  }

  sleep(__VU > 20 ? 0.3 : 0.8);
}

function getPet() {
  let petId = randomPetId();
  let response = http.get(`${BASE_URL}/pet/${petId}`, {
    headers: HEADERS,
    tags: { name: 'GetPet' }
  });

  let success = check(response, {
    'GET pet - status OK': (r) => r.status === 200 || r.status === 404,
    'GET pet - completed': (r) => r.status !== 0,
  });

  errorRate.add(!success);
  requestDuration.add(response.timings.duration);
}

function createPet() {
  let petId = randomPetId();
  let petName = randomPetName();
  let pet = createPetObject(petId, petName, 'available');

  let response = http.post(`${BASE_URL}/pet`, JSON.stringify(pet), {
    headers: HEADERS,
    tags: { name: 'CreatePet' }
  });

  let success = check(response, {
    'POST pet - status OK': (r) => r.status === 200 || r.status === 201,
    'POST pet - completed': (r) => r.status !== 0,
  });

  errorRate.add(!success);
  requestDuration.add(response.timings.duration);
}

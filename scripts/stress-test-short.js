/**
 * STRESS TESTING - SHORT VERSION (Demo)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { BASE_URL, HEADERS } from '../utils/config.js';
import { randomPetId, randomPetName, createPetObject } from '../utils/helpers.js';

let errorRate = new Rate('errors');
let timeoutCounter = new Counter('timeouts');
let serverErrorCounter = new Counter('server_errors');

export let options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'],
    'http_req_failed': ['rate<0.15'],
    'checks': ['rate>0.85'],
  },
};

export default function () {
  let random = Math.random();

  if (random < 0.6) {
    getPet();
  } else {
    createPet();
  }

  sleep(0.5);
}

function getPet() {
  let petId = randomPetId();
  let response = http.get(`${BASE_URL}/pet/${petId}`, {
    headers: HEADERS,
    tags: { name: 'GetPet' }
  });

  let success = check(response, {
    'GET pet - status OK': (r) => r.status === 200 || r.status === 404,
    'GET pet - not timeout': (r) => r.status !== 0,
  });

  if (response.status === 0) timeoutCounter.add(1);
  if (response.status >= 500) serverErrorCounter.add(1);
  errorRate.add(!success);
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
    'POST pet - not timeout': (r) => r.status !== 0,
  });

  if (response.status === 0) timeoutCounter.add(1);
  if (response.status >= 500) serverErrorCounter.add(1);
  errorRate.add(!success);
}

// Helper functions for K6 tests
import { check } from 'k6';

/**
 * Generate random integer between min and max (inclusive)
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random pet ID
 */
export function randomPetId() {
  return randomInt(1, 10000);
}

/**
 * Generate random pet name
 */
export function randomPetName() {
  const names = ['Doggo', 'Catto', 'Birdo', 'Fisho', 'Rabbito', 'Hammy', 'Turtly', 'Parry'];
  return names[randomInt(0, names.length - 1)];
}

/**
 * Standard checks for successful response
 */
export function checkSuccess(response, expectedStatus = 200) {
  return check(response, {
    [`status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
    'has valid response body': (r) => r.body && r.body.length > 0,
  });
}

/**
 * Create pet object
 */
export function createPetObject(id, name, status = 'available') {
  return {
    id: id,
    name: name,
    status: status,
    category: {
      id: 1,
      name: 'Dogs'
    },
    photoUrls: ['https://example.com/photo.jpg'],
    tags: [
      {
        id: 1,
        name: 'tag1'
      }
    ]
  };
}

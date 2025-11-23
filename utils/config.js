// Configuration file for K6 tests
export const BASE_URL = 'https://petstore.swagger.io/v2';
export const API_KEY = 'special-key';

export const HEADERS = {
  'Content-Type': 'application/json',
  'api_key': API_KEY
};

// Default thresholds
export const DEFAULT_THRESHOLDS = {
  'http_req_duration': ['p(95)<500', 'p(99)<1000'],
  'http_req_failed': ['rate<0.05'],  // Error rate < 5%
  'http_reqs': ['rate>10'],          // Throughput > 10 rps
  'checks': ['rate>0.95'],           // 95% checks pass
};

// Test data
export const PET_STATUSES = ['available', 'pending', 'sold'];

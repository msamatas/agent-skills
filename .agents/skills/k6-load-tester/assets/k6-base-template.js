import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  // Overwritten by selected load profile (Smoke, Load, Stress, Spike)
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

// Base URL - Use host.docker.internal for Windows/Mac Docker containers
const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:8080';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const res = http.get(`${BASE_URL}/`, { headers });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}

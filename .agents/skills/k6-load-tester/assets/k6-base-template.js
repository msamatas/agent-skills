import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  // Overwritten by load profile
  vus: 1,
  duration: '10s',
};

// Base URL - Use host.docker.internal for Windows/Mac
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
  // Example request - replace with discovered endpoints
  const res = http.get(`${BASE_URL}/`);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}

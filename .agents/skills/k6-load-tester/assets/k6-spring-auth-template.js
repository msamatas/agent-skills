import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:8080';

// Global setup: Execute once before VUs start to acquire auth token
export function setup() {
  const loginPayload = JSON.stringify({
    username: __ENV.AUTH_USER || 'admin',
    password: __ENV.AUTH_PASSWORD || 'admin',
  });

  const headers = { 'Content-Type': 'application/json' };
  const res = http.post(`${BASE_URL}/api/login`, loginPayload, { headers });

  check(res, {
    'setup login successful': (r) => r.status === 200,
  });

  const token = res.json('token') || res.json('id_token') || res.headers['Authorization'];
  return { token: token };
}

export default function (data) {
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // Test authenticated endpoint
  const res = http.get(`${BASE_URL}/api/protected/resource`, { headers: authHeaders });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response under 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(1);
}

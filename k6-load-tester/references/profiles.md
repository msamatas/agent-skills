# Load Profiles

Use these `options` configurations when generating k6 scripts.

## Smoke Test
**Goal**: Verify the system can handle a minimal load without errors.
```javascript
export const options = {
  vus: 1,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'], // less than 1% errors
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
  },
};
```

## Load Test
**Goal**: Assess performance under typical expected load.
```javascript
export const options = {
  stages: [
    { duration: '5m', target: 20 }, // ramp up to 20 users
    { duration: '10m', target: 20 }, // stay at 20 users
    { duration: '5m', target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
  },
};
```

## Stress Test
**Goal**: Find the breaking point of the system.
```javascript
export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
};
```

## Spike Test
**Goal**: Verify system stability during sudden surges.
```javascript
export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '1m', target: 100 }, // sudden spike
    { duration: '2m', target: 100 },
    { duration: '10s', target: 10 },
  ],
};
```

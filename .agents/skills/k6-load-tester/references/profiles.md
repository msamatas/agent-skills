# Load Profiles & Flaw Detection Configurations

Use these `options` configurations when generating k6 scripts tailored to specific load profiles or taxonomy flaw verification goals.

---

## 1. Standard Load Profiles

### Smoke Test
**Goal**: Verify system stability and baseline functionality under minimal load.
```javascript
export const options = {
  vus: 1,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'], // less than 1% failure
    http_req_duration: ['p(95)<500'], // 95% of requests below 500ms
  },
};
```

### Load Test
**Goal**: Assess performance under typical expected peak volume.
```javascript
export const options = {
  stages: [
    { duration: '2m', target: 20 }, // ramp up to 20 VUs
    { duration: '5m', target: 20 }, // sustain 20 VUs
    { duration: '2m', target: 0 },  // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.02'],
  },
};
```

### Stress Test
**Goal**: Determine system breaking point and maximum throughput capacity.
```javascript
export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};
```

### Spike Test
**Goal**: Evaluate recovery and queueing behavior under sudden traffic bursts.
```javascript
export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '1m', target: 150 }, // sudden traffic surge
    { duration: '2m', target: 150 },
    { duration: '10s', target: 10 },
  ],
};
```

---

## 2. Taxonomy Flaw Detection Profiles

### Database Connection Pool Starvation
**Goal**: Detect JDBC pool exhaustion (e.g. HikariCP) under concurrent load.
```javascript
export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '2m', target: 50 }, // exceed typical DB connection pool sizes (e.g. 10-20 connections)
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // fails if connection pool times out
    http_req_duration: ['p(95)<2000'],
  },
};
```

### ThreadLocal Security Leak / Bleed Check
**Goal**: Execute concurrent mixed-role requests to verify isolation of pooled worker thread state.
```javascript
export const options = {
  scenarios: {
    authenticated_users: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      exec: 'authenticatedScenario',
    },
    anonymous_users: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      exec: 'anonymousScenario',
    },
  },
};
```

### Memory Thrashing / GC Pause Detection
**Goal**: Trigger unpaginated DB reads while checking fast endpoint latency for Stop-The-World GC freezes.
```javascript
export const options = {
  scenarios: {
    fast_probe: {
      executor: 'constant-vus',
      vus: 2,
      duration: '3m',
      exec: 'fastProbe',
    },
    heavy_allocation: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 30 },
      ],
      exec: 'heavyAllocation',
    },
  },
  thresholds: {
    'http_req_duration{scenario:fast_probe}': ['max<200'], // probe latency must stay low
  },
};
```

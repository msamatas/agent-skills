# Load Profiles & Flaw Detection Configurations

This document specifies the exact k6 `options` configurations used across both phases of the execution workflow.

---

## Phase 1: Mandatory Deterministic Load Profiles

Every application analysis MUST execute these 5 standard profiles in sequence to establish baseline performance metrics prior to code-informed specialized testing.

### 1. Smoke Profile
* **Purpose**: Verify endpoint health and basic HTTP assertion validity under single-VU execution.
```javascript
export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};
```

### 2. Ramp-Up / Load Profile
* **Purpose**: Assess system stability and throughput under expected peak operational volume.
```javascript
export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '2m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.02'],
  },
};
```

### 3. Spike Profile
* **Purpose**: Evaluate traffic burst handling, queue recovery, check-then-act timing windows, and thread state isolation.
```javascript
export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '1m', target: 100 }, // sudden burst
    { duration: '1m', target: 100 },
    { duration: '10s', target: 0 },
  ],
};
```

### 4. Stress Profile
* **Purpose**: Determine system breaking points, resource pool saturation thresholds, and STW GC pause triggers.
```javascript
export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 50 },
    { duration: '1m', target: 150 }, // exceed typical thread/DB connection pool sizes
    { duration: '2m', target: 150 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};
```

### 5. Soak / Endurance Profile
* **Purpose**: Detect OS socket/file descriptor leaks (`TIME_WAIT` buildup) and slow heap memory growth.
```javascript
export const options = {
  stages: [
    { duration: '30s', target: 30 },
    { duration: '5m', target: 30 }, // sustained load over extended duration
    { duration: '30s', target: 0 },
  ],
};
```

---

## Phase 2: Specialized Flaw Detection Profiles

Use these ad-hoc k6 scenario configurations when code inspection reveals specific architectural anti-patterns from the 16-item taxonomy.

### ThreadLocal Security Bleed Scenario (`Flaw 1.1`)
Executes parallel authenticated and anonymous VU groups to detect cross-user data leakage on pooled threads.
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

### Resource Pool Starvation Probe (`Flaw 2.1` & `Flaw 2.2`)
Bombards slow/transactional endpoints while probing a lightweight health check to detect pool starvation.
```javascript
export const options = {
  scenarios: {
    fast_probe: {
      executor: 'constant-vus',
      vus: 2,
      duration: '3m',
      exec: 'fastProbeScenario',
    },
    blocking_heavy: {
      executor: 'constant-vus',
      vus: 40,
      duration: '3m',
      exec: 'blockingHeavyScenario',
    },
  },
  thresholds: {
    'http_req_duration{scenario:fast_probe}': ['max<500'], // fast probe must remain fast
  },
};
```

### Memory Thrashing & STW GC Probe (`Flaw 5.1`)
Triggers heavy unpaginated data allocations while measuring latency spikes on fast baseline probes.
```javascript
export const options = {
  scenarios: {
    latency_probe: {
      executor: 'constant-vus',
      vus: 2,
      duration: '3m',
      exec: 'probeEndpoint',
    },
    unpaginated_allocator: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 30 },
      ],
      exec: 'unpaginatedEndpoint',
    },
  },
  thresholds: {
    'http_req_duration{scenario:latency_probe}': ['max<200'],
  },
};
```

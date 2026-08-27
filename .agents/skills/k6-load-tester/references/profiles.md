# k6 Traffic Shaping & Profile Configurations

This reference specifies how to construct realistic, multi-endpoint k6 traffic-shaping scenarios for both **Phase 1 (Common Load Profiles)** and **Phase 2 (Specialized Flaw Scenarios)**.

---

## 1. Phase 1: Realistic Common Load Profiles (Multi-Endpoint User Journeys)

Instead of targeting a single endpoint, Phase 1 k6 scripts MUST define a realistic domain user journey that distributes traffic across multiple discovered routes based on real-world usage patterns.

### Traffic-Shaping Pattern (Weighted Domain Multi-Endpoint Scenario)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '15s', target: 1 },   // Smoke Stage
    { duration: '30s', target: 20 },  // Load Stage
    { duration: '15s', target: 100 }, // Spike Stage
    { duration: '30s', target: 50 },  // Stress Stage
    { duration: '15s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  const rand = Math.random();

  if (rand < 0.50) {
    // 50% Traffic: Browse Domain List / Feed
    const res = http.get(`${BASE_URL}/api/v1/resources`);
    check(res, { 'list status 200': (r) => r.status === 200 });
  } else if (rand < 0.80) {
    // 30% Traffic: View Item Detail
    const res = http.get(`${BASE_URL}/api/v1/resources/1`);
    check(res, { 'detail status 200': (r) => r.status === 200 });
  } else if (rand < 0.95) {
    // 15% Traffic: Search / Query Filter
    const res = http.get(`${BASE_URL}/api/v1/resources?search=test`);
    check(res, { 'search status 200': (r) => r.status === 200 });
  } else {
    // 5% Traffic: Write / Create Transaction
    const payload = JSON.stringify({ name: `item_${__VU}_${__ITER}` });
    const headers = { 'Content-Type': 'application/json' };
    const res = http.post(`${BASE_URL}/api/v1/resources`, payload, { headers });
    check(res, { 'create status 200/201': (r) => r.status === 200 || r.status === 201 });
  }

  sleep(0.5);
}
```

---

## 2. Phase 2: Specialized Flaw Detection Profiles (Custom Layered Scenarios)

When code analysis uncovers specific software bugs or architectural flaws, add dedicated k6 `scenarios` on top of Phase 1 to trigger and empirically verify the flaw.

### A. Concurrent Race Condition / Check-Then-Act Spike (`Flaw 1.2`)
Synchronizes VUs to hit a single transactional endpoint simultaneously.
```javascript
export const options = {
  scenarios: {
    concurrent_race: {
      executor: 'per-vu-iterations',
      vus: 30,
      iterations: 1,
      maxDuration: '10s',
      exec: 'triggerRaceCondition',
    },
  },
};
```

### B. Pool Starvation Probe (`Flaw 2.1` & `Flaw 2.2`)
Pairs a heavy/blocking workload scenario with a lightweight probe scenario to measure starvation.
```javascript
export const options = {
  scenarios: {
    latency_probe: {
      executor: 'constant-vus',
      vus: 2,
      duration: '2m',
      exec: 'probeScenario',
    },
    heavy_blocking_load: {
      executor: 'constant-vus',
      vus: 40,
      duration: '2m',
      exec: 'heavyScenario',
    },
  },
  thresholds: {
    'http_req_duration{scenario:latency_probe}': ['p(95)<200'],
  },
};
```

### C. Database Hot-Row Write Contention (`Flaw 3.1`)
Surges concurrent VUs updating identical database entities (e.g. SQLite DB lock or MySQL row locks).
```javascript
export const options = {
  scenarios: {
    hot_row_writers: {
      executor: 'ramping-vus',
      stages: [
        { duration: '10s', target: 5 },
        { duration: '30s', target: 30 },
        { duration: '10s', target: 0 },
      ],
      exec: 'writeTransaction',
    },
  },
};
```

---

## 3. Report Placement Rule

The generated analysis report for any candidate project **MUST ALWAYS BE SAVED IN THE SCRIPT FOLDER**:
- Path: `<project-directory>/k6-scripts/ANALYSIS.md`
- Master Summary: Synthesize findings into `thesis/projects/ANALYSIS_SUMMARY.md`.
